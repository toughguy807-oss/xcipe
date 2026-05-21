# ELUO XCIPE v4.0 — Railway 배포용 Dockerfile
# Node 22 LTS + Playwright(Chromium) + poppler-utils(pdf-poppler) 통합
#
# 빌드:   docker build -t xcipe .
# 실행:   docker run -p 3747:3747 -v xcipe-data:/app/data --env-file .env xcipe

# ── Stage 1: 의존성 설치 ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

# Playwright + pdf-poppler + tesseract 시스템 의존성
# (chromium libs: libnss3 libatk-bridge2.0-0 libdrm2 ... → playwright install --with-deps 가 처리)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg \
    poppler-utils \
    fonts-liberation fonts-noto-cjk fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성만 먼저 복사해 캐시 활용
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# v25: KDS bridge-server 의존성 설치 (chokidar 등)
COPY kds-v4/package.json kds-v4/package-lock.json* ./kds-v4/
RUN cd kds-v4 && npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# Playwright Chromium + 시스템 의존성 한 번에
RUN npx --yes playwright@1.59.1 install --with-deps chromium

# claude CLI 글로벌 설치 (파이프라인 실행에 필요 — ANTHROPIC_API_KEY 별도 주입)
RUN npm i -g @anthropic-ai/claude-code

# ── Stage 2: 런타임 ─────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# poppler-utils + 폰트는 런타임에도 필요
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    poppler-utils \
    fonts-liberation fonts-noto-cjk fonts-noto-color-emoji \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libxss1 libasound2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/kds-v4/node_modules ./kds-v4/node_modules
COPY --from=deps /root/.cache/ms-playwright /root/.cache/ms-playwright
COPY --from=deps /usr/local/lib/node_modules/@anthropic-ai /usr/local/lib/node_modules/@anthropic-ai
COPY --from=deps /usr/local/bin/claude /usr/local/bin/claude

# 애플리케이션 소스 (dockerignore 가 데이터/로그 제외)
COPY . .

# Railway Volume mount point
# DB_PATH=/app/data/eluo.db, output=/app/output 가 Volume 으로 매핑됨
# kds-v4/to-figma, kds-v4/from-figma 도 Volume 권장 (디자이너 산출물 영속)
RUN mkdir -p /app/data /app/output /app/logs /app/tmp \
             /app/kds-v4/to-figma /app/kds-v4/from-figma /app/kds-v4/logs

ENV NODE_ENV=production \
    PORT=3747 \
    DB_PATH=/app/data/eluo.db \
    KDS_V4_ROOT=/app/kds-v4 \
    KDS_BRIDGE_PORT=3939 \
    PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

EXPOSE 3747

# Healthcheck — / 로 응답 확인 (xcipe Express). kds-bridge 는 /kds-bridge/health 로 확인 가능
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -fsS http://localhost:3747/ || exit 1

# v30: xcipe 단일 프로세스 — bridge-server 는 src/server.js 에서 require 로 통합 (port 3939 같이 listen)
#   concurrently 패턴 제거 (한쪽 죽으면 전체 죽는 -k 옵션이 502/Application failed to respond 의 한 원인)
CMD ["node", "src/server.js"]
