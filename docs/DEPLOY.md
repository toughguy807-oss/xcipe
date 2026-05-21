# ELUO XCIPE v4.0 — 배포 가이드

> **목표 아키텍처**: Vercel(정적 SPA) + Railway(Express + Pipeline Worker 컨테이너) + Supabase(향후 Storage)
> **현재 단계**: Phase 1 — Vercel + Railway 배포 (DB는 SQLite + Railway Volume 유지)

---

## 배포 전 결정 사항 정리

| 항목 | 선택 | 이유 |
|------|------|------|
| **DB** | SQLite (Railway Volume) | better-sqlite3 491회/42파일 비동기 전환 회피, 코드 수정 0줄 |
| **파일 저장** | Railway Volume (`/app/data`, `/app/output`) | 동일 컨테이너 내 직접 접근, IPC 없음 |
| **Frontend** | Vercel 정적 + 도메인 + rewrites | CDN/HTTPS/도메인 자동, 무료 |
| **Backend** | Railway 컨테이너 (Dockerfile) | 상주 서버, Playwright/claude CLI 그대로 동작 |
| **인증** | 기존 JWT (src/auth.js) | RBAC 이미 구현 완료 |
| **워커** | Railway 동일 컨테이너 | pipeline-worker.js → DB 직접 접근 |

---

## Phase 1 — 신규 배포 절차

### 1. GitHub 저장소 생성

```bash
cd d:/SYS_v4
git init
git add .
git commit -m "feat: ELUO XCIPE v4.0 초기 배포 셋업"
gh repo create eluoaxjun/xcipe --private --source=. --remote=origin --push
```

> `monnhyunjun` 계정으로 인증 완료된 상태(`gh auth status` 확인 완료).
> 회사 org(`eluoaxjun`)로 만들지 개인 계정으로 만들지는 사용자 선택.

### 2. Railway 배포 (백엔드 + 워커)

#### 2-1. 프로젝트 생성

```bash
# Railway CLI 설치 (한 번만)
npm i -g @railway/cli
railway login

cd d:/SYS_v4
railway init
railway link  # 또는 새 프로젝트 생성
```

또는 **웹 UI**:
1. https://railway.app/new → "Deploy from GitHub repo"
2. `eluoaxjun/xcipe` 선택
3. Root directory: `/` (기본)
4. Build: Dockerfile 자동 감지

#### 2-2. 환경변수 설정

`.env.example` 기준으로 Railway 환경변수 등록:

```bash
railway variables set \
  NODE_ENV=production \
  PORT=3747 \
  DB_PATH=/app/data/eluo.db \
  JWT_SECRET=$(openssl rand -hex 32) \
  ADMIN_EMAIL=admin@eluocnc.com \
  ADMIN_PASSWORD='STRONG_PASSWORD_HERE' \
  CORS_ORIGIN='https://xcipe.vercel.app' \
  TRUST_PROXY=1 \
  ANTHROPIC_API_KEY='sk-ant-...'
```

> **필수**: `JWT_SECRET`, `ADMIN_PASSWORD` 는 반드시 강력한 랜덤 값.
> **`ANTHROPIC_API_KEY` 미수급 시**: 파이프라인 실행은 비활성, UI/관리 기능만 동작.

#### 2-3. Persistent Volume 추가

Railway 대시보드 → 서비스 → **Volumes**:
- Mount path: `/app/data` (DB)
- Size: 1 GiB (시작값. 산출물 누적 시 확장)

산출물(`/app/output`)도 Volume 권장 — 컨테이너 재시작 시 휘발 방지:
- Mount path: `/app/output`
- Size: 5 GiB

#### 2-4. 도메인 발급 + 헬스체크

- Railway → Settings → **Generate Domain** (예: `xcipe-production.up.railway.app`)
- 자동 헬스체크: `/` (Dockerfile HEALTHCHECK 정의)

#### 2-5. 첫 부팅 확인

```bash
railway logs
# [ESYS] ELUO XCIPE v4.0 running on http://localhost:3747
# [ESYS] Mode: BUNDLE (.claude 자기완결, ...)
```

`https://xcipe-production.up.railway.app/` → 로그인 화면 표시 확인.

---

### 3. Vercel 배포 (정적 SPA)

#### 3-1. vercel.json 의 Railway 도메인 치환

`d:/SYS_v4/vercel.json` 내 `REPLACE_WITH_RAILWAY_DOMAIN` 를 실제 Railway 도메인으로 변경:

```json
"destination": "https://xcipe-production.up.railway.app/api/:path*"
```

#### 3-2. Vercel CLI 또는 GitHub 연동

```bash
npm i -g vercel
cd d:/SYS_v4
vercel
# - Project name: xcipe
# - Directory: ./
# - Override settings: No (vercel.json 자동 적용)
```

또는 **웹 UI**:
1. https://vercel.com/new → `eluoaxjun/xcipe` 선택
2. Framework Preset: **Other** (vercel.json 사용)
3. Root Directory: `/`
4. Build Command: 비워둠
5. Output Directory: `public`

#### 3-3. 도메인 연결

- Vercel 자동 도메인: `xcipe.vercel.app`
- 커스텀: `xcipe.eluocnc.com` → DNS CNAME `cname.vercel-dns.com`

#### 3-4. CORS 갱신

Railway 환경변수 `CORS_ORIGIN` 에 Vercel 도메인 추가:

```bash
railway variables set CORS_ORIGIN='https://xcipe.vercel.app,https://xcipe.eluocnc.com'
```

---

## 배포 후 필수 검증 체크리스트

| # | 항목 | 검증 방법 |
|---|------|----------|
| 1 | 로그인 동작 | `ADMIN_EMAIL` / `ADMIN_PASSWORD` 로 로그인 → JWT 토큰 발급 |
| 2 | DB 영속성 | 컨테이너 재배포 후 데이터 유지 (Volume 마운트 확인) |
| 3 | 정적 SPA 라우팅 | `https://xcipe.vercel.app/projects` 직접 URL 입력 → index.html 응답 |
| 4 | API 프록시 | DevTools Network 에서 `/api/auth/login` 이 Railway 도메인으로 가는지 |
| 5 | 산출물 정적 서빙 | 프로젝트 산출물 페이지 → `/static/output/{CODE}/...` 정상 표시 |
| 6 | Rate limit | trust proxy 정상 동작 — `/api/auth/login` 11회 시도 → 11번째 차단 |
| 7 | Playwright | 디자인 벤치마크 실행 → 스크린샷 캡처 정상 |
| 8 | Claude CLI | (ANTHROPIC_API_KEY 보유 시) plan-qst 등 파이프라인 1단계 실행 |
| 9 | HTTPS | Vercel/Railway 모두 HTTPS 자동 |
| 10 | 컨테이너 메모리 | Railway 메트릭에서 1G 이내 유지 (PM2 max_memory_restart 동일 정책) |

---

## 알려진 한계 / 후속 작업

### Phase 1 잔존 이슈

1. **`kds-bridge` 미배포**
   - `ecosystem.config.js`의 두 번째 앱은 외부 PC 경로(`C:/Users/hj.moon/Downloads/...`) 의존
   - Figma 플러그인 연동 필요 시 별도 Railway 서비스로 분리하거나 로컬 PC에서만 운영

2. **Claude CLI 인증**
   - 컨테이너 내 `claude` CLI는 `ANTHROPIC_API_KEY` 환경변수만 사용
   - Claude Code 의 OAuth 토큰(`~/.claude/credentials`)은 컨테이너에 없음
   - **API 키 미수급 상태면 파이프라인 실행 비활성**, UI/관리/티켓 기능만 사용 가능
   - 메모리 참고: `project_anthropic_key_pending.md`

3. **`bundle-claude.js` 프리스타트 훅 미실행**
   - 컨테이너에는 `~/.claude`가 없음 → `npm start`의 prestart 가 fail
   - Dockerfile CMD가 `node src/server.js` 직접 호출이라 우회됨
   - `.claude/` 디렉토리는 빌드 시점 git 커밋된 상태 사용

4. **로그 영속성**
   - 현재 `logs/` 디렉토리 쓰기 → 컨테이너 재시작 시 휘발
   - Railway 로그는 자동 캡처(7일 보존) — 별도 처리 불요
   - 장기 보존 필요 시 Phase 2 에서 Supabase Storage 또는 BetterStack/Logtail 검토

5. **`mcp/server.js` (stdio)**
   - 외부 클라이언트가 stdio로 호출해야 하므로 HTTP API 형태로 노출 불가
   - 컨테이너 내부 도구로만 사용

### Phase 2 (향후 마이그레이션)

- Supabase Postgres 전환 (better-sqlite3 → pg, 동기 → 비동기)
- Supabase Storage 로 `output/` 이전 (Volume 비용 절감 + CDN)
- Supabase Auth 또는 OAuth 통합
- `pipeline-worker` 를 Inngest 또는 Trigger.dev 로 분리 (확장성)

---

## 비용 추정 (월간, 소규모 운영 기준)

| 서비스 | 플랜 | 비용 |
|--------|------|------|
| Vercel | Hobby (정적) | $0 |
| Railway | Hobby ($5 크레딧/월) + 컨테이너 + Volume 6GiB | $5~10 |
| Supabase | Free (Storage 1GiB) | $0 |
| **합계** | | **$5~10/월** |

> Anthropic API 사용량은 별도. 파이프라인 1회 실행당 $0.05~0.50 예상.

---

## 롤백 / 복구

- **Railway**: Deployments → 이전 배포 → "Redeploy"
- **Vercel**: Deployments → 이전 배포 → "Promote to Production"
- **DB 복구**: `backups/eluo-YYYYMMDD-HHMM.db.gz` → Volume `/app/data/eluo.db` 로 복원

---

## 참고

- `.env.example` — 환경변수 명세
- `Dockerfile` — Railway 빌드 정의
- `railway.json` — Railway 배포 설정
- `vercel.json` — Vercel 정적 + rewrites 설정
- 메모리: `project_xcipe_brand.md`, `project_anthropic_key_pending.md`, `project_d_plus_completed.md`
