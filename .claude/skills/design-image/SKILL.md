---
name: design-image
description: >
  AI 이미지 생성 스킬. Gemini 2.5 Flash Image API(Nano Banana)를 curl로 호출하여
  키비주얼, 무드보드, 아이콘, 배경 이미지를 생성합니다. visual-dna.json 기반 프롬프트
  자동 생성과 Claude Vision 검증 루프를 포함합니다.
  "이미지 생성", "키비주얼", "무드보드", "image generation", "Nano Banana",
  "Gemini Flash", "비주얼 샘플", "design-image" 등 AI 이미지가 필요한 맥락에서 자동 호출.
argument-hint: "[이미지 설명 또는 visual-dna.json 경로] [--batch <manifest.json>]"
---

# AI 이미지 생성 (Design-Image) Generator

당신은 **AI 이미지 생성 디렉터**입니다.

브랜드 가이드와 visual-dna 기반으로 프롬프트를 설계하고, Gemini Flash Image API를 호출하여 프로젝트 톤에 맞는 비주얼을 생성합니다.

## 전제조건 (Stop 조건)

- **필수**: `GEMINI_API_KEY` 환경변수 설정 (https://aistudio.google.com 에서 발급)
- **필수**: 이미지 설명 (프롬프트 재료) 또는 visual-dna.json
- **권장**: STYLE 가이드, 브랜드 시트
- **선택**: 참조 이미지(Base64 또는 URL)

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령/사용법 | 용도 | 필수 |
|------|------|------------|------|:---:|
| API 호출 | curl | Gemini API `generateContent` | 이미지 생성 | 필수 |
| 응답 파싱 | node | `node -e "..."` 또는 jq | base64 추출 | 필수 |
| 시각 검증 | Claude Vision | Read 도구로 생성 이미지 읽기 | 브랜드 정합성 확인 | 권장 |
| visual-dna 로드 | Read | output/design/visual-dna.json | 프롬프트 컨텍스트 | 권장 |

## 제약 사항

- **무료 티어**: 500회/일, 분당 10건 (Google AI Studio)
- **해상도**: 1024×1024 기본 (4K 필요 시 Nano Banana Pro로 전환 권고)
- **화면 비율**: 1:1, 16:9, 9:16, 4:3, 3:2 지원
- **텍스트 렌더링**: 영문 안정, 한글은 Nano Banana Pro 권장

## 작성 절차

### Step 0-MODE: 모드 판별 (2026-05-04 신설)

이 스킬은 2가지 모드로 동작합니다. 인자에서 자동 판별합니다.

| 조건 | 모드 | 동작 |
|------|------|------|
| `--batch <manifest.json>` 지정 | **Batch 모드** | manifest 기반 N건 일괄 생성 + manifest-output.json 발행 |
| 그 외 | **Single 모드** | 기존 1건 생성 (Step 1~5) |

**모드 판정 출력 (필수)**:
```
[design-image] 모드: {Single / Batch (n건)}
```

Batch 모드는 §Batch Mode 섹션 참조 (Step 5 이후). Single 모드는 아래 Step 0~5 진행.

---

### Step 0: 입력 스캔 및 컨텍스트 로드

1. **visual-dna.json 탐색**
   ```bash
   ls output/*/design/visual-dna.json 2>/dev/null || echo "NOT_FOUND"
   ```
2. **STYLE 가이드 확인**: `output/*/design/STYLE_*.md`
3. **API 키 검증**
   ```bash
   [ -z "$GEMINI_API_KEY" ] && echo "ERROR: GEMINI_API_KEY 미설정" && exit 1
   ```

### Step 1: 프롬프트 생성

visual-dna와 STYLE 가이드에서 아래 요소를 추출하여 프롬프트 조립:

| 요소 | 출처 | 예시 |
|------|------|------|
| 분위기 키워드 | visual-dna.brand_keywords | "신뢰, 혁신, 따뜻함" |
| 컬러 앵커 | visual-dna.color_anchors | "#E0282F, #1A1A1A" |
| 스타일 레퍼런스 | visual-dna.style_refs | "Linear, Stripe 스타일" |
| 구도 | 사용자 지시 또는 기본값 | "centered hero, rule of thirds" |
| Negative | visual-dna.negative_prompts | "cartoon, stock photo cliché" |

**프롬프트 템플릿**:
```
{subject}, {composition}, {style_refs 스타일},
color palette: {color_anchors},
mood: {brand_keywords},
photorealistic, high detail, --no {negative}
```

**`negative` 기본값** (visual-dna 미지정 시):
```
no text, no labels, no letters, no watermarks, no logos
```
→ 키비주얼/무드보드/배경은 "글자 없는 비주얼"이 기본값. AI가 엉터리 글자를 렌더링하는 현상 방지.

### Step 2: Gemini API 호출

```bash
RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "contents": [{
    "parts": [{"text": "PROMPT_HERE"}]
  }],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {"aspectRatio": "1:1"}
  }
}
EOF
)
```

### Step 3: base64 디코딩 및 저장

```bash
echo "$RESPONSE" | node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf-8"));
  const img = data.candidates[0].content.parts.find(p => p.inlineData);
  if (!img) { console.error("NO_IMAGE"); process.exit(1); }
  const buf = Buffer.from(img.inlineData.data, "base64");
  const ts = Date.now();
  require("fs").writeFileSync(`output/design/images/img_${ts}.png`, buf);
  console.log(`output/design/images/img_${ts}.png`);
'
```

### Step 4: Claude Vision 검증 루프

1. 생성된 이미지를 Read 도구로 시각 분석
2. visual-dna와 대조하여 평가:
   - 컬러 정합성 (앵커 컬러 반영 여부)
   - 분위기 일치도 (brand_keywords 부합)
   - Negative 항목 회피 확인
3. **평가 점수 < 75점 시**: Step 1로 회귀, 프롬프트 조정 후 재생성
4. **최대 3회** 재시도 (Ralph Loop). 3회 초과 시 실패 보고 + 수동 조정 요청

### Step 5: 산출물 출력

```
output/{프로젝트}/design/images/
├── img_{timestamp}_v1.png       # 1차 생성
├── img_{timestamp}_v2.png       # 재생성(필요 시)
├── _prompts.json                 # 사용된 프롬프트 전수
└── _validation.md                # Vision 검증 결과
```

---

## Batch Mode (배치 처리 · 2026-05-04 신설)

> **배경**: GPT-5.5 Codex + gpt-image-2 사례 — 하루 만에 100개+ 게임 에셋을 자동 생성·주입 ([Codex Blog 2026-04-27](https://codex.danielvaughan.com/2026/04/27/codex-cli-image-generation-gpt-image-2-visual-development-workflows/)). publish-markup이 manifest-output.json을 자동 소비하도록 표준화.

### Manifest 스키마

입력 파일 `assets-manifest.json`:

```json
{
  "$schema": "design-image-manifest@v1",
  "project": "{프로젝트명}",
  "global": {
    "style_refs": "Linear, Stripe 스타일",
    "color_anchors": ["#E0282F", "#1A1A1A"],
    "brand_keywords": ["신뢰", "혁신", "따뜻함"],
    "negative": "no text, no labels, no watermarks, no logos",
    "model": "gemini-2.5-flash-image"
  },
  "assets": [
    {
      "id": "hero-bg",
      "purpose": "히어로 섹션 배경",
      "prompt": "abstract gradient mesh, premium tech vibe",
      "aspect_ratio": "16:9",
      "output_path": "assets/images/hero-bg.png",
      "consumer": ["index.html#hero"],
      "alt": "히어로 배경 이미지"
    },
    {
      "id": "icon-search",
      "purpose": "검색 아이콘",
      "prompt": "minimalist line icon, magnifying glass, monochrome",
      "aspect_ratio": "1:1",
      "output_path": "assets/icons/search.png",
      "consumer": ["index.html#nav-search", "search.html#hero"],
      "alt": "검색"
    }
  ]
}
```

### 처리 절차

1. **manifest 파싱** — `--batch <path>` 경로의 JSON 로드, 스키마 검증
2. **rate limit 사전 계산** — Gemini Flash 무료 티어 분당 10건 → asset 수 ÷ 10 = 예상 분 수 출력
3. **순차 생성** — 각 asset에 대해 Step 1~3 (프롬프트 조립 → API 호출 → 저장)
   - global 토큰 + asset.prompt + asset.aspect_ratio 결합
   - output_path가 절대경로면 그대로, 상대경로면 `output/{project}/` 기준
4. **Vision 검증 (선택)** — `--validate` 플래그 시에만 Step 4 적용 (배치는 시간 비용 큼). 기본 SKIP
5. **manifest-output.json 발행** — 산출물과 같은 폴더에 결과 매니페스트 작성:

```json
{
  "$schema": "design-image-manifest-output@v1",
  "generated_at": "{ISO-8601}",
  "manifest_input": "{manifest 입력 경로}",
  "results": [
    {
      "id": "hero-bg",
      "status": "success",
      "output_path": "assets/images/hero-bg.png",
      "size_bytes": 245678,
      "dimensions": "1920x1080",
      "validation_score": null,
      "consumer": ["index.html#hero"],
      "alt": "히어로 배경 이미지"
    },
    {
      "id": "icon-search",
      "status": "failed",
      "error": "API rate limit (429)",
      "retry_after": "60s"
    }
  ],
  "summary": {
    "total": 2,
    "success": 1,
    "failed": 1,
    "skipped": 0
  }
}
```

### publish-markup 자동 소비 규약

`publish-markup`은 다음 위치에서 manifest-output.json을 자동 탐색:
- `output/{프로젝트}/design/assets-manifest-output.json`
- `output/{프로젝트}/assets-manifest-output.json`

발견 시 각 asset의 `consumer[]` 필드를 읽어 해당 HTML 파일에 `<img src="{output_path}" alt="{alt}">` 자동 주입. 수작업 매핑 제거.

### Batch 모드 Self-Check

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| B1 | manifest 스키마 유효 | 필수 필드(id/prompt/output_path) 전수 존재 |
| B2 | 생성 성공률 | success / total ≥ 90% |
| B3 | rate limit 준수 | 분당 10건 이하 호출 |
| B4 | manifest-output.json 발행 | 파일 존재 + summary 필드 완결 |
| B5 | consumer 매핑 유효 | 모든 consumer 경로가 실제 HTML 파일 가리킴 (warn-only) |

### Batch 모드 출력

```
═══════════════════════════════════════
[design-image] Batch 완료
═══════════════════════════════════════
입력 manifest : assets-manifest.json (n건)
성공          : {n}/{m} ({pct}%)
실패          : {n}건 — {id}: {error}
소요 시간     : {sec}초 (rate limit {waited}초 포함)
output        : design/images/, design/assets/icons/
manifest-output: design/assets-manifest-output.json
다음 단계      : publish-markup 실행 시 자동 주입
═══════════════════════════════════════
```

---

## 합리화 방지

| 변명 | 현실 | 대응 |
|------|------|------|
| "프롬프트가 잘 안 먹혔다" | 프롬프트 조정 가능성 미시도 | 최대 3회 재시도 후 판단 |
| "무료 한도 때문에 1장만" | 500/일은 충분 | 품질 도달까지 생성 |
| "API 에러라 수동으로" | 재시도 가능 | 에러 메시지 분석 후 재호출 |
| "visual-dna가 없어서 생략" | 브랜드 시트로 대체 가능 | STYLE 가이드에서 추출 |

## Self-Check (Single 모드)

- [ ] GEMINI_API_KEY 환경변수 검증됨
- [ ] visual-dna 또는 STYLE 가이드 참조됨
- [ ] 프롬프트가 4개 요소(subject/composition/style/color) 포함
- [ ] 생성 이미지 해상도 1024×1024 이상
- [ ] Claude Vision 검증 점수 75점 이상
- [ ] 사용 프롬프트 `_prompts.json`에 기록
- [ ] 재시도 3회 이내 품질 도달

> Batch 모드 Self-Check는 §Batch Mode 섹션 참조 (B1~B5).

## Gotchas

| # | 패턴 | 대응 |
|---|------|------|
| 1 | 프롬프트에 "AI generated" 단어 사용 | 회피 — 부자연스러운 결과 유발 |
| 2 | 한글 텍스트가 이미지에 포함 필요 | Nano Banana Pro 사용 (본 스킬 한계) |
| 3 | 응답에 inlineData 없음 | prompt_feedback 확인 → 안전 필터 트리거 가능성 |
| 4 | 무료 한도 초과 | 에러 429 → 다음날 재시도 또는 유료 전환 |

## META 블록

산출물 하단에 HTML 주석으로 삽입:

```html
<!-- META {
  "skill": "design-image",
  "version": "v1",
  "model": "gemini-2.5-flash-image",
  "prompt_version": 1,
  "iterations": 2,
  "validation_score": 82,
  "output_count": 3,
  "self_check": "PASS"
} -->
```

$ARGUMENTS
