# Markup 체크리스트

## 필수 항목
- [ ] `<!DOCTYPE html>` + `lang` 속성 존재
- [ ] `<meta charset="UTF-8">` + `<meta name="viewport">` 존재
- [ ] `<title>` ≤60자, `<meta name="description">` ≤160자
- [ ] 시맨틱 랜드마크: `header`, `nav`, `main`, `footer` 모두 존재
- [ ] `<h1>` 정확히 1개, 제목 계층 건너뜀 없음 (h1→h2→h3)
- [ ] 모든 `<img>`에 `alt` 속성 존재 (장식 이미지: `alt=""` + `aria-hidden="true"`)
- [ ] 모든 인터랙티브 요소에 ARIA 속성 (expanded, hidden, controls 등)
- [ ] BEM 네이밍 일관성: `block__element--modifier` 패턴 준수

## UI 매핑
- [ ] 모든 섹션에 `data-ui-id="UI-###"` 속성 부여
- [ ] UI 명세의 컴포넌트 수 = HTML 섹션 수 (누락 없음)
- [ ] IA의 GNB 메뉴 수 = `<nav>` 메뉴 항목 수

## 접근성 (WCAG 2.1 AA)
- [ ] 키보드 탭 순서가 시각적 순서와 일치
- [ ] 링크 텍스트가 의미 있음 ("더보기" → "문화행사 더보기" + sr-only)
- [ ] `skip-link` (본문 바로가기) 존재
- [ ] 폼 요소에 `<label>` 연결

## SEO
- [ ] OG 태그: `og:title`, `og:description`, `og:image` (1200×630)
- [ ] 정규 URL: `<link rel="canonical">`
- [ ] 다국어 시: `hreflang` 태그

## 유형별 추가 체크
### 구축 (페이지 3개+)
- [ ] 공통 header/footer 구조 일관
- [ ] 페이지 간 class 네이밍 일관

### 운영 (기존 사이트 수정)
- [ ] 기존 class 네이밍 컨벤션 유지
- [ ] 기존 ID/class 충돌 없음
