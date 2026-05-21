# DESIGN_PRINCIPLES — 범용 웹디자인 원칙

> v1.0 | 2026.02.18 | AI 파이프라인 참조용 | 업종 무관 적용
> 근거: Refactoring UI, NNGroup, IxDF, Elementor, SiteGround, Brad Frost, Nathan Curtis

---

## 이 문서의 역할

DK(Design Knowledge)가 **프로젝트별 디자인 규칙**이라면,
이 문서는 **모든 프로젝트에 적용되는 기본 원칙**이다.

```
DESIGN_PRINCIPLES (범용 원칙)
  └── DESIGN_KNOWLEDGE (프로젝트별 규칙)
        └── Layout / UI / CSS (산출물)
```

DK 작성 시 이 문서를 기준선으로 참조하고, 프로젝트 특성에 맞게 오버라이드한다.

---

## §0. 왜 우리는 Structure를 유지하는가 (2026-04-24 편입)

> 대비 포인트: Manus AI(Meta 인수, 2025)는 "Less structure, more intelligence"를 표방하며 **자율 에이전트에 계획·도구·실행을 모두 위임**하는 노선을 택했다. 우리는 그 반대 노선이다.

### 우리의 원칙: 구조화된 파이프라인 + AI 추론

| 구분 | Autonomy-First (Manus 류) | **우리 노선** |
|------|--------------------------|---------------|
| 계획 수립 | 에이전트가 매번 즉흥 계획 | **REQ→FN→IA→Layout→UI** 고정 흐름 |
| 검증 | 실행 후 결과 자체 판단 | **Self-Check + DA + reviewer** 다층 게이트 |
| 산출물 | 형태 자유, 재현 어려움 | **META 블록 + ID 추적성**으로 재현 가능 |
| 리스크 | 한 번의 실패가 전체 붕괴 | 단계별 게이트로 **실패 국소화** |
| 팀 배포 | 에이전트 능력에 종속 | **구조가 지식이 되어 팀에 축적** |

### 왜 Structure를 유지하는가

1. **재현성 (Reproducibility)**: 같은 입력이면 같은 단계·같은 산출물 포맷이 나온다. AI 출력의 확률적 편차를 파이프라인 구조가 흡수한다.
2. **검증 가능성 (Verifiability)**: 단계마다 Self-Check·DA·reviewer로 증거 기반 판정. `lib/rules/anti-rationalization.md` 전체가 이 원칙 위에 선다.
3. **축적 가능성 (Accumulability)**: 방법론이 스킬·룰·ref로 응고되어 **팀 지식 자산화**가 가능해진다. Autonomy-First는 "이번엔 됐다"가 남고 "왜 됐는지"는 흩어진다.
4. **실패의 국소화**: 한 단계가 실패해도 이전 산출물은 재사용 가능. 전체 재시작 비용이 낮다.
5. **AI 편향 차단**: LLM의 전형값 수렴 성향을 **게이트로 막는다** (플러그형 발산-검증 분리, `plan-persona` 1.5단계 · `plan-premortem` 0.5단계 참조).

### 설계 시 적용

- 새로운 스킬/에이전트를 설계할 때 "더 자유롭게, 더 똑똑하게"를 이유로 **게이트를 제거하지 않는다**. 게이트는 비용이 아니라 재현성의 조건이다.
- "이 정도는 에이전트가 알아서 판단하면 되지 않나"라는 제안이 나오면 — 우리는 **그 판단이 매번 다를 수 있다는 리스크 때문에** 구조를 유지한다. AI는 추론의 엔진이고, 구조는 신뢰의 골격이다.
- Autonomy-First 도구(Manus류)가 필요하면 써도 된다. 단, **우리 파이프라인의 산출물은 구조 원칙을 따른다** — 이 경계가 팀 배포 자산의 생명선이다.

> 근거: feedback_pipeline_skip_ban.md, feedback_publish_quality_upper_gates.md, user_goal_team_deployment.md. 대비 사례: Manus AI (https://manus.im/, 2025-12 Meta 인수).

---

## §1. 시각적 위계 (Visual Hierarchy)

> "위계가 없으면 모든 것이 똑같이 보이고, 사용자는 어디를 봐야 할지 모른다."
> — NNGroup

### 1.1 위계의 3단계

| 단계 | 용도 | 텍스트 처리 | 컬러 처리 |
|------|------|-----------|----------|
| Primary | 핵심 정보 (제목, CTA) | 크고 굵게 (Bold, 큰 사이즈) | 진한 색 (#111827 수준) |
| Secondary | 보조 정보 (날짜, 카테고리) | 중간 크기, Regular | 회색 (#6B7280 수준) |
| Tertiary | 부가 정보 (캡션, 메타) | 작은 크기, Regular | 연회색 (#9CA3AF 수준) |

### 1.2 위계 구현 도구 (우선순위 순)

1. **크기(Scale)** — 가장 강력. 중요한 것을 크게.
2. **굵기(Weight)** — Bold는 같은 크기에서 면적을 늘려 강조.
3. **색상(Color)** — 대비로 시선 유도. 채도가 높을수록 강조.
4. **간격(Space)** — 여백이 많을수록 고급스럽고 강조됨.
5. **위치(Position)** — 상단/좌측이 먼저 읽힘 (F-패턴, Z-패턴).

### 1.3 강조/약화 규칙

- **강조하려면**: 크기 키우기, 굵기 올리기, 진한 색 사용
- **약화하려면**: 크기 줄이기, 색상 연하게, 간격 줄이기
- **핵심 원칙**: "강조할 것을 키우지 말고, 나머지를 줄여라" (de-emphasize to highlight)
- 한 화면에 강조 요소는 **최대 1~2개**. 전부 강조하면 아무것도 강조되지 않음.

### 1.4 버튼 위계

| 단계 | 스타일 | 용도 |
|------|--------|------|
| Primary | 채움(filled), 브랜드 컬러 | 핵심 액션 (제출, 구매, CTA) |
| Secondary | 아웃라인(outlined) 또는 연한 배경 | 보조 액션 (취소, 더보기) |
| Tertiary | 텍스트 링크 스타일 | 부가 액션 (건너뛰기, 상세보기) |

- 파괴적 액션(삭제)이라고 무조건 빨간색/굵게 하지 않는다. 위계로 판단.

---

## §2. 간격 체계 (Spacing System)

> "여백은 생각보다 훨씬 많이 필요하다. 너무 많은 여백에서 시작해서 줄여라."
> — Refactoring UI

### 2.1 8px 기반 간격 스케일

```
4px   — 아이콘 내부, 인라인 간격
8px   — 최소 간격 (라벨↔입력, 아이콘↔텍스트)
12px  — 밀접한 요소 간 (리스트 아이템 내부)
16px  — 기본 단위 (단락 간, 카드 내부 패딩)
24px  — 요소 그룹 간 (폼 필드 사이)
32px  — 블록 간 (카드↔카드, 콘텐츠 블록 간)
48px  — 섹션 내부 큰 구분
64px  — 섹션 간 간격 (데스크톱 최소)
96px  — 섹션 간 간격 (데스크톱 표준)
128px — 섹션 간 간격 (여유로운 프리미엄 느낌)
```

### 2.2 간격 3대 규칙

1. **내부 < 외부**: 요소의 내부 간격(padding)은 외부 간격(margin)보다 작거나 같다.
2. **그룹 내 < 그룹 간**: 같은 그룹의 요소 간격 < 다른 그룹과의 간격.
3. **25% 최소 차이**: 스케일의 인접한 두 값은 최소 25% 이상 차이. 비슷한 값 2개가 공존하면 혼란.

### 2.3 섹션 간격 가이드

| 느낌 | 데스크톱 | 태블릿 | 모바일 |
|------|---------|--------|--------|
| 밀집 (콘텐츠 많은 포털) | 64px | 48px | 32px |
| 표준 | 96px | 64px | 48px |
| 여유 (프리미엄/럭셔리) | 128px+ | 96px | 64px |

### 2.4 카드 간격 가이드

| 요소 | 값 |
|------|-----|
| 카드 내부 패딩 | 16~24px |
| 카드 간 간격 (gap) | 16~24px (모바일) / 24~32px (데스크톱) |
| 카드 이미지↔텍스트 | 12~16px |
| 카드 제목↔설명 | 8px |
| 카드 설명↔메타 | 12~16px |

---

## §3. 컬러 체계 (Color System)

> "그레이스케일에서 먼저 디자인하라. 컬러를 마지막에 입혀라."
> — Refactoring UI

### 3.1 팔레트 구성

| 카테고리 | 용도 | 단계 수 |
|---------|------|--------|
| Gray | 텍스트, 배경, 보더 | 8~10단계 (50~950) |
| Primary | 브랜드 대표색 | 5~9단계 |
| Secondary | 보조 브랜드색 | 5~9단계 |
| Accent | 강조/알림 | 5~9단계 |
| Success | 성공 상태 | 3~5단계 |
| Warning | 경고 상태 | 3~5단계 |
| Error | 오류 상태 | 3~5단계 |

### 3.2 컬러 규칙

- **순수 검정(#000000) 사용 금지**. 가장 진한 텍스트도 #111827 수준.
- **순수 흰색(#FFFFFF) 배경 주의**. 약간의 따뜻함/차가움 (#FAFAFA, #F9FAFB) 권장.
- **HSL 기반 팔레트 구성**. 밝기(L)만 조절하지 말고 채도(S)와 색상(H)도 함께 변화.
  - 밝은 단계: 색상(H)을 약간 이동 + 채도(S) 높이기
  - 어두운 단계: 색상(H)을 약간 이동 + 채도(S) 줄이기
- **그라디언트**: 30도 이내의 인접 색상끼리만. 보색 그라디언트는 탁해진다.
- **배경색 교차**: 섹션 간 white → light gray → white 또는 white → brand-light → white 교차.

### 3.3 접근성 대비

| 용도 | 최소 대비율 | WCAG |
|------|-----------|------|
| 본문 텍스트 (≤18px) | 4.5:1 | AA |
| 큰 텍스트 (>18px bold 또는 >24px) | 3:1 | AA |
| UI 컴포넌트/그래픽 | 3:1 | AA |
| 장식 요소 | 제한 없음 | - |

---

## §4. 타이포그래피 (Typography)

### 4.1 폰트 선택

- **UI용**: 산세리프 (Pretendard, Noto Sans KR, Inter 등). 가독성 우선.
- **에디토리얼**: 세리프 가능 (Noto Serif KR 등). 매거진/스토리텔링용.
- **폰트 수**: 최대 2개. 1개로도 충분 (굵기 변화로 위계 표현).
- **400 미만 굵기 금지**: UI에서 Light(300)/Thin(100)은 가독성 저하.

### 4.2 크기 스케일

```
xs:   12px / 0.75rem  — 캡션, 법적 고지
sm:   14px / 0.875rem — 메타 정보, 보조 텍스트
base: 16px / 1rem     — 본문 기본 (브라우저 기본값)
lg:   18px / 1.125rem — 강조 본문, 리드 텍스트
xl:   20px / 1.25rem  — 소제목 (h4)
2xl:  24px / 1.5rem   — 중제목 (h3)
3xl:  30px / 1.875rem — 대제목 (h2)
4xl:  36px / 2.25rem  — 페이지 제목 (h1)
5xl:  48px / 3rem     — 히어로 제목
6xl:  64px / 4rem     — 히어로 강조 (데스크톱만)
```

### 4.3 행간(Line Height)

- **큰 텍스트 (제목)**: 1.1~1.3 (타이트)
- **본문**: 1.5~1.75 (여유)
- **작은 텍스트 (캡션)**: 1.4~1.6
- **규칙**: 텍스트가 클수록 행간 비율은 작아진다.

### 4.4 텍스트 폭

- **최적 가독성**: 한 줄 45~75자 (영문), 20~35em
- **한글**: 한 줄 25~40자 수준
- **max-width**: 본문 컨테이너에 반드시 적용. 65ch 또는 680px 권장.
- **중앙 정렬**: 2~3줄 이내만. 그 이상은 반드시 좌측 정렬.

---

## §5. 레이아웃 패턴 카탈로그 (Layout Pattern Catalog)

> "같은 그리드 패턴이 연속 2개 이상 나오면 단조롭다."
> 섹션마다 다른 패턴을 적용해 시각적 리듬을 만든다.

### 5.1 패턴 목록

#### A. Hero (히어로)
- **구조**: 풀와이드 배경(이미지/영상) + 오버레이 텍스트 + CTA
- **용도**: 첫인상, 브랜드 메시지, 핵심 가치 전달
- **변형**: 풀스크린 / 50vh / Split Hero (좌텍스트+우이미지)
- **CSS**: `min-height: 80vh; background-size: cover;`

#### B. Split (분할)
- **구조**: 2등분 또는 비대칭 분할 (예: 40:60, 50:50)
- **용도**: 이미지+텍스트 병렬, 비교, 듀얼 CTA
- **변형**: 균등분할 / 비대칭 / 이미지좌+텍스트우 / 반전
- **CSS**: `display: grid; grid-template-columns: 1fr 1fr;`

#### C. Card Grid (카드 그리드)
- **구조**: 균등 크기 카드 N열 배치
- **용도**: 목록(상품, 게시물, 포트폴리오, 이벤트)
- **변형**: 2col / 3col / 4col / 반응형 auto-fill
- **CSS**: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));`

#### D. Bento Grid (벤토)
- **구조**: 크기가 다른 카드가 모듈형 배치 (큰 카드 + 작은 카드 혼합)
- **용도**: 대시보드, 피처드+일반 혼합, 시각적 강조
- **변형**: 2×2 히어로+1×1 / L자형 / 비정형
- **CSS**: `grid-template-columns: repeat(4, 1fr); grid-row: span 2;`

#### E. Zigzag (지그재그)
- **구조**: 이미지↔텍스트 좌우 교차 반복
- **용도**: 기능 소개, 스텝 설명, 스토리텔링
- **변형**: 이미지좌-텍스트우 → 텍스트좌-이미지우 반복
- **CSS**: `.row:nth-child(even) { direction: rtl; }` 또는 `order` 활용

#### F. Full-width (풀와이드)
- **구조**: 화면 전체 폭 사용. 배경색/이미지가 엣지까지.
- **용도**: CTA 배너, 강조 섹션, 구분자, 임팩트
- **변형**: 배경이미지 / 단색배경+텍스트 / 비디오 배경
- **CSS**: `width: 100vw; margin-left: calc(-50vw + 50%);`

#### G. Masonry (메이슨리)
- **구조**: 높이가 다른 카드가 빈 공간 없이 채워짐 (Pinterest 스타일)
- **용도**: 이미지 갤러리, 포트폴리오, 혼합 콘텐츠
- **CSS**: `columns: 3; column-gap: 24px;` 또는 CSS Grid masonry

#### H. Magazine (매거진)
- **구조**: 큰 피처드 아티클 + 작은 서브 아티클 비대칭 배치
- **용도**: 뉴스, 블로그, 에디토리얼 콘텐츠
- **변형**: 1대+3소 / 2중+2소 / 사이드바형
- **CSS**: `grid-template-columns: 2fr 1fr;`

#### I. Timeline (타임라인)
- **구조**: 세로선 중심 좌우 교차 또는 한쪽 나열
- **용도**: 연혁, 일정, 코스 순서, 프로세스
- **변형**: 센터라인 / 좌측라인 / 가로 타임라인
- **CSS**: `border-left: 2px solid; padding-left: 24px;` + `::before` 도트

#### J. Feature List (피처 리스트)
- **구조**: 아이콘/이미지 + 제목 + 설명 반복
- **용도**: 서비스 특장점, 혜택, 스펙 나열
- **변형**: 세로(icon 위+text 아래) / 가로(icon 좌+text 우) / 3col 그리드
- **CSS**: `display: flex; gap: 16px; align-items: flex-start;`

#### K. CTA Banner (CTA 배너)
- **구조**: 고대비 배경 + 짧은 헤드라인 + 버튼
- **용도**: 전환 유도, 뉴스레터 가입, 문의하기
- **변형**: 풀와이드 / 인라인 / 플로팅
- **CSS**: 브랜드 컬러 배경 + 흰색 텍스트 + 반전 버튼

#### L. Horizontal Strips (수평 띠)
- **구조**: 풀와이드 섹션이 수직으로 쌓임. 각 섹션은 별도 배경색/이미지.
- **용도**: 랜딩페이지, 비즈니스 사이트, 순차적 스토리텔링
- **변형**: 배경색 교차 / 이미지 배경 교차 / 기울어진 구분선
- **CSS**: 각 section에 `padding: 96px 0; background-color: var(--bg);`

#### M. Alternating (교차형)
- **구조**: 이미지+텍스트 위치가 교대로 바뀜 (Zigzag의 일반화)
- **용도**: 기능 소개, 서비스 설명, 어바웃 페이지
- **특징**: 단조로움 방지의 가장 기본적 방법

#### N. Comparison Table (비교 테이블)
- **구조**: 2~4열 비교 표. 행은 기능/스펙, 열은 옵션/상품
- **용도**: 요금제 비교, 상품 스펙, 서비스 플랜, 기능 매트릭스
- **변형**: 스틱 헤더 / 하이라이트 열(추천) / 토글 월간·연간
- **CSS**: `display: grid; grid-template-columns: 200px repeat(3, 1fr); position: sticky;`

#### O. Interactive Map (인터랙티브 맵)
- **구조**: 지도 영역 + 사이드 리스트/카드. 클릭 시 상세 팝업
- **용도**: 매장 찾기, 관광 코스, 부동산, 지역별 정보
- **변형**: 전체 화면 맵 / Split(맵+리스트) / 오버레이 카드
- **CSS**: `position: relative; height: 60vh;` + 맵 API(Kakao/Google/Naver) 임베드

#### P. Storytelling Scroll (스토리텔링 스크롤)
- **구조**: 스크롤 위치에 따라 콘텐츠가 순차 등장. 텍스트+비주얼 연동
- **용도**: 브랜드 스토리, 연간 보고서, 캠페인 랜딩, 제품 소개
- **변형**: 패럴랙스 / 고정 배경+텍스트 슬라이드 / 수평 스크롤 전환
- **CSS**: `scroll-snap-type: y mandatory;` + IntersectionObserver 애니메이션

#### Q. Dashboard/Widget (대시보드/위젯)
- **구조**: 크기 다양한 카드(위젯)가 격자 배치. 각 카드는 독립 데이터 표시
- **용도**: 관리자 대시보드, 마이페이지, 데이터 시각화, 현황판
- **변형**: 고정 그리드 / 드래그 가능 / 반응형 자동 재배치
- **CSS**: `display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;`

#### R. Sidebar + Content (사이드바 콘텐츠)
- **구조**: 좌측 네비게이션(200~280px) + 우측 메인 콘텐츠 영역
- **용도**: 문서/가이드, 블로그 상세, 카테고리 탐색, 설정 페이지
- **변형**: 고정 사이드바 / 접이식 / 우측 TOC 사이드바
- **CSS**: `display: grid; grid-template-columns: 260px 1fr; position: sticky; top: 80px;`

### 5.2 패턴 선택 가이드

| 콘텐츠 유형 | 1순위 패턴 | 2순위 패턴 |
|------------|----------|----------|
| 첫인상/브랜드 | Hero | Full-width |
| 목록 (3~8개) | Card Grid | Bento Grid |
| 목록 (9개+) | Card Grid + 페이지네이션 | Masonry |
| 기능/특장점 소개 | Zigzag | Feature List |
| 스토리/순서 | Timeline | Storytelling Scroll |
| 강조/전환유도 | CTA Banner | Full-width |
| 혼합 콘텐츠 | Bento Grid | Magazine |
| 이미지 중심 | Masonry | Gallery Grid |
| 비교/듀얼 | Split | Comparison Table |
| 위치/지역 기반 | Interactive Map | Card Grid + 지도 |
| 데이터/현황 | Dashboard/Widget | Bento Grid |
| 문서/가이드 | Sidebar + Content | Timeline |
| 브랜드 스토리 | Storytelling Scroll | Hero + Zigzag |

---

## §6. 섹션 시퀀스 규칙 (Section Sequence)

> "리듬이 없으면 페이지가 '평평'해 보인다."
> — v0 피드백, IxDF

### 6.1 시퀀스 핵심 규칙

1. **연속 동일 패턴 금지**: 같은 레이아웃 패턴이 2개 연속 나오면 안 된다.
   - Bad: Card Grid → Card Grid → Card Grid
   - Good: Card Grid → Zigzag → Bento Grid

2. **배경색 교차**: 인접 섹션은 배경색이 달라야 한다.
   - 패턴: white → light → white → accent → white
   - 최소: 3개 섹션마다 1개는 배경색 변화

3. **시각적 무게 리듬**: Heavy(이미지/영상 큰 것) → Light(텍스트 중심) → Medium(카드) 교차.
   - Heavy: Hero, Full-width 이미지, Bento (큰 카드)
   - Medium: Card Grid, Zigzag, Magazine
   - Light: Feature List, CTA Banner, FAQ

4. **콘텐츠 밀도 변화**: 밀집(많은 카드) → 여유(큰 여백, 적은 요소) → 밀집 교차.

### 6.2 시퀀스 템플릿

#### 비즈니스/서비스 사이트
```
Hero (Heavy) → Feature List (Light) → Zigzag (Medium)
→ CTA Banner (Light) → Card Grid (Medium) → Testimonial (Light)
→ FAQ (Light) → CTA Footer (Light)
```

#### 포털/콘텐츠 사이트
```
Hero (Heavy) → Card Grid (Medium) → Bento Grid (Heavy)
→ Zigzag (Medium) → Full-width CTA (Light) → Timeline (Medium)
→ Card Grid (Medium) → FAQ (Light) → Footer
```

#### 커머스/제품 사이트
```
Hero (Heavy) → Feature List (Light) → Split (Medium)
→ Card Grid (Medium) → Testimonial (Light) → CTA Banner (Light)
→ Pricing Grid (Medium) → FAQ (Light) → Footer
```

### 6.3 리듬 유형 (IxDF 기반)

| 유형 | 설명 | 적용 |
|------|------|------|
| Regular | 동일 간격/크기 반복 | 카드 그리드, 아이콘 리스트 (섹션 내부) |
| Flowing | 자연스러운 변화 | 섹션 간 점진적 무게 변화 |
| Progressive | 점점 강해지거나 약해짐 | 스크롤 내려갈수록 CTA 강도 증가 |
| Alternating | 두 요소의 교차 반복 | Zigzag, 배경색 교차, 무게 교차 |

---

## §7. 그리드 시스템 (Grid System)

### 7.1 반응형 그리드

| 브레이크포인트 | 이름 | 컬럼 수 | 거터 | 마진 |
|--------------|------|--------|------|------|
| ~767px | Mobile | 4 | 16px | 16px |
| 768~1023px | Tablet | 8 | 24px | 24px |
| 1024~1439px | Desktop | 12 | 24px | 32px |
| 1440px+ | Wide | 12 | 32px | auto (max-width 제한) |

### 7.2 콘텐츠 최대 폭

| 용도 | max-width |
|------|-----------|
| 본문 텍스트 | 680px (65ch) |
| 카드 그리드 | 1200px |
| 와이드 콘텐츠 | 1400px |
| 풀와이드 | 제한 없음 (100vw) |

### 7.3 그리드 6대 규칙 (Elementor)

1. **그리드 해부학 이해**: 컬럼, 로우, 모듈, 거터, 마진의 역할 구분.
2. **콘텐츠에 맞는 그리드 선택**: 블록(1col)/컬럼(다col)/모듈러(체커보드)/계층적(비정형).
3. **반응형 준수**: 고정이 아닌 유동적 그리드. 브레이크포인트별 적응.
4. **여백 확보**: 8pt 그리드 기반. 콘텐츠 사이에 숨 쉴 공간.
5. **황금비(1.618)**: 비대칭 분할 시 참고 (예: 62%:38%).
6. **3분할 법칙**: 핵심 요소를 3분할 교차점에 배치.

---

## §8. 깊이와 표면 (Depth & Surface)

### 8.1 그림자 5단계

```css
--shadow-xs:  0 1px 2px rgba(0,0,0,0.05);           /* 미세한 분리 */
--shadow-sm:  0 1px 3px rgba(0,0,0,0.1);             /* 카드 기본 */
--shadow-md:  0 4px 6px -1px rgba(0,0,0,0.1);        /* 호버, 드롭다운 */
--shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.1);      /* 모달, 팝오버 */
--shadow-xl:  0 20px 25px -5px rgba(0,0,0,0.1);      /* 대형 오버레이 */
```

### 8.2 깊이 규칙

- **그림자 > 보더**: 요소 분리에 보더 대신 그림자 사용 권장. 더 자연스럽다.
- **배경색 분리**: 그림자 대안. 연한 배경(#F9FAFB)으로 그룹 구분.
- **간격 분리**: 그림자/보더 없이 충분한 간격만으로도 구분 가능.
- **겹침(Overlap)**: 요소 일부를 겹쳐 깊이감 생성. 의도적으로 사용.

### 8.3 보더 라디우스

| 용도 | 값 |
|------|-----|
| 버튼, 입력 필드 | 6~8px |
| 카드 | 8~12px |
| 태그, 뱃지 | 9999px (pill) 또는 4px |
| 이미지 | 카드와 동일하거나 0 |
| 모달 | 12~16px |

- **일관성 필수**: 프로젝트 내에서 라디우스 스타일을 통일. small/medium/large/full 4단계.

---

## §9. 이미지 & 미디어 (Images & Media)

### 9.1 이미지 비율

| 용도 | 비율 | 특징 |
|------|------|------|
| 히어로 배너 | 16:9 또는 21:9 | 와이드, 시네마틱 |
| 카드 썸네일 (가로) | 4:3 또는 3:2 | 가장 범용적 |
| 카드 썸네일 (세로) | 3:4 | 인물, 포스터, 피처드 강조 |
| 정사각 | 1:1 | 프로필, 아이콘형 |
| OG 이미지 | 1200×630px | SNS 공유용 |

### 9.2 이미지 규칙

- **비율 혼용 제한**: 같은 그리드 내 카드들은 동일 비율. 다른 비율은 `object-fit: cover`로 통일.
- **대비가 다른 비율로 강조**: 피처드 카드만 3:4, 일반 카드는 4:3 → 시각적 구분.
- **alt 텍스트 필수**: 장식 이미지는 `alt=""`, 정보 이미지는 설명.
- **lazy loading**: 첫 화면(Above the fold) 외 이미지는 `loading="lazy"`.
- **placeholder**: 회색 박스 금지. 최소한 블러 placeholder 또는 dominant color 배경.

### 9.3 이미지 소싱 (Unsplash 기반)

- URL 패턴: `https://images.unsplash.com/photo-{ID}?w={width}&h={height}&fit=crop`
- 크기 파라미터: `w=800&h=600&fit=crop&q=80` (4:3, 품질 80%)
- **키워드 매핑**: DK §4의 소싱 키워드로 검색 → 실제 URL로 변환

---

## §10. 인터랙션 & 모션 (Interaction & Motion)

### 10.1 호버 효과

| 요소 | 효과 | 값 |
|------|------|-----|
| 카드 | 살짝 떠오름 | `translateY(-4px)` + `shadow-md` |
| 카드 이미지 | 확대 | `scale(1.05)` + `overflow: hidden` |
| 버튼 | 밝기 변화 | `brightness(1.1)` 또는 `background-color` 변경 |
| 링크 | 밑줄 또는 색상 | `text-decoration: underline` 또는 `color` 변경 |
| 아이콘 | 회전 또는 이동 | `rotate(5deg)` 또는 `translateX(4px)` |

### 10.2 트랜지션

- **기본 속도**: 150~300ms. 이보다 빠르면 인지 못함, 느리면 답답함.
- **이징**: `ease-out` (나갈 때 감속) 기본. `ease-in-out` (부드러운 양방향).
- **한 번에 하나만**: 여러 속성 동시 변화 시 가장 중요한 것만 transition.
- **의미 있는 모션만**: 장식적 모션 최소화. 상태 변화를 전달하는 모션만.

### 10.3 스크롤 애니메이션

- **fade-in-up**: 가장 기본. `opacity: 0 → 1` + `translateY(20px → 0)`.
- **순차 진입**: 카드 그리드는 카드별 100~150ms 딜레이.
- **과하지 않게**: 모든 요소에 적용 금지. 핵심 섹션만.
- **`prefers-reduced-motion` 존중**: 접근성. 모션 비활성화 미디어쿼리 반드시 적용.

---

## §11. 컴포넌트 조합 규칙 (Component Composition)

> "카드는 폐쇄된 컴포넌트가 아니라 조합 가능한 컨테이너다."
> — Nathan Curtis

### 11.1 카드 변형

| 변형 | 구조 | 용도 |
|------|------|------|
| Default | image(4:3) + title + desc + meta | 일반 목록 아이템 |
| Featured | image(3:4 또는 큰 사이즈) + 큰 title + desc | 강조, 벤토 큰 카드 |
| Compact | image(작은) + title + meta (한 줄) | 사이드바, 관련 콘텐츠 |
| Horizontal | image(좌) + content(우) | 검색 결과, 리스트뷰 |
| Overlay | image(배경) + text(오버레이) | 시각적 임팩트, 히어로형 |

### 11.2 섹션 구조

모든 섹션은 아래 구조를 기본으로 한다:

```html
<section class="section section--{variant}">
  <div class="container">
    <header class="section__header">
      <h2 class="section__title">{제목}</h2>
      <p class="section__subtitle">{부제 또는 설명}</p>
    </header>
    <div class="section__body">
      {콘텐츠 — 카드 그리드, 리스트, 등}
    </div>
    <footer class="section__footer">
      {더보기 링크 또는 CTA}
    </footer>
  </div>
</section>
```

### 11.3 Atomic Design 계층

| 계층 | 예시 | 역할 |
|------|------|------|
| Atom | 버튼, 태그, 아이콘, 입력 필드 | 최소 단위 |
| Molecule | 카드, 검색바, 네비 아이템 | Atom 조합 |
| Organism | 카드 그리드, 헤더, 푸터, FAQ 섹션 | Molecule 배치 |
| Template | 메인 페이지, 목록 페이지, 상세 페이지 | 페이지 레이아웃 |

---

## §12. 반응형 규칙 (Responsive Design)

### 12.1 모바일 퍼스트

- CSS는 모바일 기본 → `min-width` 미디어쿼리로 확장.
- 모바일에서 불필요한 요소는 `display: none`이 아니라 **처음부터 설계에서 제외**.

### 12.2 브레이크포인트별 변화

| 요소 | Mobile (≤767) | Tablet (768~1023) | Desktop (1024+) |
|------|-------------|-----------------|----------------|
| 카드 그리드 | 1열 | 2열 | 3~4열 |
| 히어로 | 텍스트 중심, 정적 이미지 | 영상/이미지 + 텍스트 | 풀스크린 영상 |
| GNB | 햄버거 메뉴 | 축약 또는 햄버거 | 전체 노출 |
| Split | 세로 스택 | 50:50 | 비대칭 가능 |
| Zigzag | 세로 스택 (이미지 → 텍스트) | 교차 유지 | 교차 유지 |
| 사이드바 | 숨김 또는 아래로 | 접을 수 있는 | 고정 노출 |
| 폰트 크기 | h1: 28~32px | h1: 32~36px | h1: 36~48px |
| 섹션 간격 | 32~48px | 48~64px | 64~96px |

### 12.3 터치 타겟

- **최소 44×44px**: 모든 클릭/탭 가능 요소.
- **간격 8px 이상**: 인접 터치 타겟 사이.
- **호버 의존 금지**: 모바일에는 호버가 없다. 호버 정보는 기본 노출.

---

## §13. Do's & Don'ts

### Do's (반드시)

| # | 규칙 | 근거 |
|---|------|------|
| D1 | 여백은 충분히, 의심되면 더 넓게 | Refactoring UI |
| D2 | 섹션마다 다른 레이아웃 패턴 사용 | §6 시퀀스 규칙 |
| D3 | 인접 섹션 배경색 교차 | §6 시퀀스 규칙 |
| D4 | 텍스트 3단계 위계 유지 | §1 시각적 위계 |
| D5 | 8px 단위 간격 체계 사용 | §2 간격 체계 |
| D6 | 카드 내 이미지 비율 통일 | §9 이미지 |
| D7 | 피처드 카드로 시각적 강조점 만들기 | §11 컴포넌트 |
| D8 | 모바일 퍼스트로 CSS 작성 | §12 반응형 |
| D9 | 접근성 대비율 준수 | §3.3 접근성 |
| D10 | 섹션 header → body → footer 구조 통일 | §11.2 섹션 구조 |

### Don'ts (금지)

| # | 금지 사항 | 대안 |
|---|----------|------|
| X1 | 같은 패턴 연속 2개 이상 | §5 카탈로그에서 다른 패턴 선택 |
| X2 | 순수 검정(#000) 사용 | #111827 사용 |
| X3 | 보더로 요소 구분 | 그림자, 배경색, 간격 사용 |
| X4 | 아이콘 무작정 확대 | 적정 크기(24~48px) 유지 |
| X5 | 3줄 이상 중앙 정렬 | 좌측 정렬 |
| X6 | 400 미만 폰트 굵기 | 색상 연하게 또는 크기 줄이기 |
| X7 | 모든 요소에 스크롤 애니메이션 | 핵심 섹션만 |
| X8 | 이미지 없이 텍스트만으로 카드 | 최소 아이콘 또는 컬러 배경 |
| X9 | 회색 박스 placeholder | Unsplash URL 또는 블러 처리 |
| X10 | 호버에만 의존하는 정보 노출 | 기본 상태에서도 접근 가능하게 |

---

## 부록: 참조 출처

| 출처 | 항목 | URL |
|------|------|-----|
| Refactoring UI | §1~4, §8, §13 | refactoringui.com |
| NNGroup | §1 시각적 위계 | nngroup.com/articles/principles-visual-design/ |
| IxDF | §6 리듬 유형 | interaction-design.org |
| Elementor | §7 그리드 6규칙 | elementor.com/blog/grid-design/ |
| SiteGround | §5 레이아웃 카탈로그 | siteground.com/academy/website-layout/ |
| Unsection | §5 섹션 패턴 | unsection.com |
| Brad Frost | §11 Atomic Design | atomicdesign.bradfrost.com |
| Nathan Curtis | §11 카드 조합 | medium.com/eightshapes-llc |
| designsystems.com | §2, §7 간격/그리드 | designsystems.com |
| 8pt Grid | §2 간격 체계 | medium.com/built-to-adapt |
| Tilda | §6 섹션 리듬 | tilda.education |
| KRDS | §7 한국 공공 표준 | krds.go.kr |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026.02.18 | 초안 작성. 13개 섹션 + 부록. |
