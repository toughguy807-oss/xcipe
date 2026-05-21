# awwwards.com — 메타-레퍼런스

**역할**: SOTD (Site of the Day) / SOTM (Site of the Month) 글로벌 어워드 인덱스
**도메인**: 글로벌 디자인 어워드
**갱신 주기**: 일일 (트렌드 추적 시 분기 1회 추출)
**최초 캡처**: 2026-05-04

## 시그니처 H1

> "WHERE WORLDS TAKE SHAPE" — Pure white + 거대 sans-serif H1 (어워드 톱 톤)

## 사용 방식

### 패턴 1: 분기별 SOTD Top 10 추출
```
방문: https://www.awwwards.com/websites/sites_of_the_day/
필터: 해당 분기 (예: 2026-Q2)
Top 10 사이트 → dkb-analyze 후보 큐(queue/pending.json) 등록
```

### 패턴 2: 도메인별 카테고리 검색
```
방문: https://www.awwwards.com/awwwards/collections/{category}/
카테고리 예: ai, dev-tools, fintech, ecommerce, portfolio, agency
도메인 매칭된 어워드 SOTD → 후보 추출
```

### 패턴 3: 트렌드 시그니처 키워드 추출
```
방문: SOTD 페이지 → "Trends" 섹션
2026 톱 키워드 (예: Bento / KPI Dark / Italic Serif / 그라디언트 메쉬)
trend-radar/2026-Q{n}/README.md 시그니처 표에 기입
```

## 분기별 Top 10 (수기 갱신)

> 다음 갱신: 2026-Q3 시작 시 사용자 트리거

| 순위 | 사이트 | 카테고리 | 시그니처 |
|------|--------|---------|---------|
| 1 | (수기 입력) | | |
| ... | | | |

## 핵심 메타데이터

- **SOTD**: 일 1개
- **SOTM**: 월 1개
- **연 어워드**: AOTY (Site of the Year) 1개
- **Honorable Mention**: 일 다수
- **Categories**: design, mobile, sites_of_the_day, sites_of_the_month, agencies

## 연관 사이트

- [godly.website](../godly.website/META.md) — AI 도메인 (보완)
- [lapa.ninja](../lapa.ninja/META.md) — 랜딩 페이지 (보완)
- [siteinspire.com](미등재) — 카테고리 검색 (대체)

## 출처

- screenshots/full-1440.png + hero-1440.png + full-375.png
- source/index.html (curl 2026-05-04, 338KB)

## 변경 이력

| 일자 | 변경 |
|------|------|
| 2026-05-04 | 초기 등재 (메타-레퍼런스) |
