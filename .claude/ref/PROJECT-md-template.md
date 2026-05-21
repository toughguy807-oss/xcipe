# PROJECT.md 표준 템플릿 (전역)

> 모든 프로젝트의 PROJECT.md 작성 시 이 템플릿을 복사. 디자인/퍼블리싱 작업 진입 전 §시각 디자인 방향성 섹션은 **필수 작성**.
> 미작성 시 `skills/design/` Step 0 Tone Commit Gate에 의해 BLOCK됨.

## 사용법

```
1. 새 프로젝트 폴더에서 PROJECT.md 신규 작성
2. 본 템플릿의 §섹션을 복사 후 프로젝트 정보로 채움
3. 디자인 진입 전 §시각 디자인 방향성 4개 항목 체크
4. /design 또는 /publish 호출 시 hook이 자동 검증
```

---

# {프로젝트명} ({Project English Name})

## 1. 기본 정보

| 항목 | 값 | 출처 |
|------|-----|------|
| 회사명/서비스명 | {name} | |
| 설립/오픈 | {date} | |
| 대표/담당 | {person} | |
| 사업 분야 | {domain} | |
| 핵심 제품/서비스 | {product} | |
| 슬로건 | {tagline} | |
| VISION | {vision} | |
| 도메인 | {url} | |
| 이메일 | {email} | |
| 전화 | {phone} | |

## 2. 핵심 역량 / 차별점

(자유 작성)

## 3. 서비스/기능 목록

(IA 초안 또는 핵심 기능 표)

## 4. 콘텐츠 자산

| 자산 | 보유 여부 | 위치 |
|------|:--:|------|
| 실 사진 | □ | input/photos/ |
| 자체 폰트 | □ | input/fonts/ |
| 브랜드 BI | □ | input/bi/ |
| 컬러 가이드 | □ | input/colors.md |
| 케이스 스터디 데이터 | □ | input/cases.md |
| 파트너 로고 | □ | input/logos/ |

> **자산 부족 시 디자인 결과 천장 명확** — 시각 자산 5건 이상 권고

## 5. 타겟 사용자 (페르소나)

1. 1순위: {persona}
2. 2순위: {persona}
3. 3순위: {persona}

## 6. 사이트 목적 우선순위

1. ⭐ {primary}
2. {secondary}
3. {tertiary}

## 7. 제약 / 법적 요구

- (자유 작성)

## 8. 일정 / 예산

| 항목 | 값 |
|------|-----|
| 런칭 목표일 | |
| 예산 범위 | |
| 단계별 마일스톤 | |

---

## ★ 9. 시각 디자인 방향성 (디자인 진입 필수)

> 디자인/퍼블리싱 작업 진입 전 **반드시 4개 항목 확정**.
> 미명시 시 `skills/design/` Step 0 Tone Gate BLOCK + 사용자 즉시 질의.
> 근거: `~/.claude/ref/anthropic-frontend-design.md` § Default House Style 회피 룰

### Q-V1. 도메인 분류
- [ ] **default 적합**: editorial / hospitality / portfolio / lifestyle
- [ ] **default 부적합** ★: dashboards / dev tools / fintech / healthcare / enterprise / manufacturing / Industrial AI
- [ ] 기타: ____________

> default 부적합으로 분류 시 다음 4개 자동 차단:
> ❌ 배경 #F4F1EA / #FAFAF7 / warm cream off-white
> ❌ Serif Display + Italic word-accents
> ❌ terracotta / amber / coral / sepia
> ❌ Italic em + underline 강조 단어

### Q-V2. Tone 11종 중 1개 commit (CRITICAL — 1개만)

| Tone | 시그니처 | 적합 도메인 |
|------|---------|-----------|
| [ ] brutally-minimal | 텍스트만 / 흑백 / 절제 극단 | dev tool / 작가 / SaaS |
| [ ] maximalist-chaos | 의도된 혼돈 / 밀도 극대 | 미디어 / 엔터테인먼트 |
| [ ] retro-futuristic | Synthwave / neon | 게이밍 / 스타트업 |
| [ ] organic-natural | 유기적 / texture / soft curve | 라이프스타일 / 웰니스 |
| [ ] luxury-refined | 절제 + gold + serif | 럭셔리 / 패션 / 호텔 |
| [ ] playful-toy | 둥근 + 컬러풀 | 어린이 / B2C 친근 |
| [ ] editorial-magazine | Serif + 비대칭 + 매거진 | 출판 / 작가 / 문화 |
| [ ] brutalist-raw | gray scale + sharp + 거대 텍스트 | 기술적 권위 / 건축 |
| [ ] art-deco-geometric | 기하학 + symmetric | 럭셔리 / 호텔 |
| [ ] soft-pastel | pink + peach | 뷰티 / B2C |
| [ ] industrial-utilitarian | mono + grid + 기능 중심 | Industrial AI / manufacturing / dev tool |

### Q-V3. 좋아하는 사이트 1개 (URL 또는 명시)

- URL: ___________________________
- 또는 [ ] 톤만 명시 (Q-V2 톤으로만, 베끼기 차단)
- 또는 [ ] 없음 (DKB references 매칭 자동 적용)

> DKB 등재 references 7건 (2026-05-04 기준):
>
> | 사이트 | Tone 1순위 | 적합 도메인 |
> |--------|----------|----------|
> | augury.com | industrial-utilitarian | Industrial AI ⭐ |
> | linear.app | industrial-utilitarian | dev tools / Industrial AI |
> | vercel.com | retro-futuristic | dev tools / Frontier |
> | superb-ai.com | industrial-utilitarian | 한국 글로벌 B2B |
> | makinarocks.ai | brutally-minimal | 한국 Industrial AI |
> | anthropic.com | editorial-magazine | editorial / hospitality (default 가족) |
> | toss.tech | playful-toy | B2C 친근 (한국 핀테크) |
>
> 매핑 출처: `~/.claude/dkb/dkb-config.json` § tone_mapping

### Q-V4. 절대 안 쓸 것

자동 차단 (default 부적합 도메인):
- [✓] Off-white #F4F1EA / Serif Italic Display / terracotta / Italic em + underline
- [✓] 보라 그라디언트 + 흰 배경 (AI Slop)
- [✓] Inter / Roboto / Arial / system 폰트

사용자 추가 차단:
- [ ] Bento 카드 그리드
- [ ] 글래스모피즘
- [ ] 3-col 카드 반복
- [ ] 기타: ____________

### 진입 조건 체크리스트

- [ ] Q-V1 도메인 확정
- [ ] Q-V2 Tone 1개 명시
- [ ] Q-V3 레퍼런스 결정
- [ ] Q-V4 차단 룰 확인

→ 4개 모두 ✓이면 디자인 시안 생성 진입 가능

---

## 10. 입력 자료 목록

| 파일 | 용도 |
|------|------|
| `input/{file}` | {목적} |

## 변경 이력

| 일자 | 변경 |
|------|------|
| {date} | 초기 작성 |
