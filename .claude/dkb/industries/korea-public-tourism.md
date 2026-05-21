# 한국 공공/관광 업종 시그니처 매핑

**도메인**: 한국 공공 / 관광 / 지자체 / 다국어 사이트
**대표 사이트**: visitseoul.net (시드 톱) / visit{지자체} 시리즈 / 한국관광공사 류
**프로젝트 적합**: 비짓강남 / visit{도시} / 지자체 관광 포털 / 공공 관광 콘텐츠 허브

## 도메인 시그니처 패턴

| 패턴 | 사이트 | 적용 |
|------|------|------|
| **자연 사진 풀블리드 Hero** | visitseoul (벚꽃/여름/단풍/눈 4계절) | Hero 풀블리드 + 계절 자동 전환 |
| **위젯 카드 (실시간 정보)** | visitseoul (날씨/온도) | 친근 권위 — 정량 정보 + 반투명 카드 |
| **다국어 9종 토글** | visitseoul (한/영/일/중간/중번/러/말/스/Partners) | 다국어 자동 전환 + 폰트 fallback |
| **4계절 nav** | visitseoul | 우측/상단 계절 토글 |
| **앱 install QR** | visitseoul | iOS/Android QR + 위젯 결합 |
| **한영 듀얼 H1** | lgcns.com (Korean SI 시그니처) | 한국어 메인 + 영문 sub 동시 |

## 권장 references 매칭

### Tier 우선순위 (한국 공공/관광)

1. **Tier-3 (한국 공공/관광 직격)** — 시드 톱
   - `tier-3/visitseoul.net/` (144/180 — 4계절 풀블리드 + 9개 언어 + 위젯 카드 ⭐)
2. **Tier-3 (한국 컨텍스트 보강)** — 친숙도
   - `tier-3/lgcns.com/` (145/180 — 한영 듀얼 H1 + mint pastel + Korean SI 권위)
3. **Tier-1 (사진 톤 보조)** — 시각 퀄리티
   - `tier-1/anthropic.com/` (Off-white + Editorial 카피 → About/공공 비전 영역)
4. **Tier-2 (자연 톤 보조)** — Organic Natural
   - `tier-2/landing.ai/` (forest green + lime + 자연 톤 → 친환경/생태 관광)

### 영역별 권장 매핑 (한국 공공/관광)

| 영역 | 1순위 reference | 2순위 |
|------|---------------|------|
| Hero | visitseoul (자연 풀블리드 + 계절 사진) | landing.ai (organic 자연 톤) |
| Sub Hero | visitseoul (위젯 카드 + 실시간 정보) | lgcns (한영 듀얼) |
| 명소/행사 그리드 | visitseoul (사진 카드 그리드) | - |
| 다국어 처리 | visitseoul (9개 언어 토글 + 폰트 fallback) | lgcns (한영 듀얼) |
| 계절 nav | visitseoul (4계절 토글 + 사진 자동 전환) | - |
| 앱 install | visitseoul (iOS/Android QR + 위젯) | - |
| About/공공 비전 | anthropic (Editorial 카피) | lgcns (Korean SI 권위) |
| Footer | visitseoul (사이트맵 + 다국어) | - |

## 한국 공공/관광 특수 고려

1. **다국어 9종 표준** — 한/영/일/중간/중번/러/말/스/(추가) 폰트 fallback 9종 매핑 필수
2. **한글 타이포 핵심** (L2-3 ★) — Pretendard + word-break: keep-all + Wanted Sans 대안
3. **자연 사진 의존** — Accent 컬러 거의 부재, 사진 톤이 시각 톤 결정
4. **친근한 권위** — Industrial AI류 묵직한 권위 부적합. 위젯 카드 + 반투명 + Pure white로 친근감
5. **4계절 콘텐츠 자동화** — 봄(벚꽃)/여름(녹음)/가을(단풍)/겨울(눈) Hero 사진 분기 시그니처

## ★ Default House Style 차단 룰

> 출처: `~/.claude/dkb/dkb-config.json` § tone_default_block (2026-05-04 v1.1)
> 한국 공공/관광은 LLM default house style **부적합 도메인**.

### 차단 대상 (LLM default 회귀 패턴)

| 차단 항목 | 사유 | 대안 |
|---------|------|------|
| `#F4F1EA` Off-white 배경 | Anthropic 톤 — 공공 친근감과 거리 | Pure white `#FFFFFF` + 사진 풀블리드 |
| Italic em + underline 강조 | Editorial Anthropic 패턴 — 공공 부적합 | 거대 H1 + 위젯 카드 |
| Newsreader / Tiempos / Crimson | Editorial Serif — 공공 친근 부적합 | Pretendard + Wanted Sans |
| Pure white + Serif Display wordmark | luxury Editorial (kinfolk/monocle) — 공공 권위감 부족 | 자연 풀블리드 사진 + 위젯 |
| cute 다채 mascot 5색+ | 어워드 cute trend — 공공 신뢰 부적합 | 사진 톤 의존 (계절 자연색) |

### 톤 11종 매핑 (한국 공공/관광)

| Tone | 적합도 | 비고 |
|------|--------|------|
| `soft-pastel` | ⭐ 1순위 | visitseoul 벚꽃 + 위젯 / lgcns mint pastel |
| `organic-natural` | ⭐ 2순위 | 자연 사진 + landing.ai forest 톤 |
| `editorial-magazine` | △ | About/비전 영역 한정 (anthropic) |
| `playful-toy` | ❌ | cute mascot 부적합 |
| `luxury-refined` | ❌ | 거대 여백 + Serif Display 부적합 |
| `industrial-utilitarian` | ❌ | 묵직 권위 부적합 (Industrial AI는 다른 industries 매핑) |
| `brutalist-raw` | ❌ | 다크 네이비 KPI 부적합 |
| `brutally-minimal` | ❌ | 친근감 부족 |

## 적용 워크플로우 (design-orchestrator)

```
1. dkb-search --industry korea-public-tourism --target visitor --top 3
   → 1: visitseoul.net (직격)
   → 2: lgcns.com (한영 듀얼 보강)
   → 3: anthropic.com (About 영역만)

2. design-replicate
   - V1 충실: visitseoul 1:1 (4계절 풀블리드 + 위젯 + 9개 언어)
   - V3 비판: visitseoul + lgcns 한영 듀얼 H1 결합
   - V4 건설: visitseoul 골격 + landing.ai organic 보강 (친환경 관광)

3. publish-style
   - 한글 폰트: Pretendard 1순위 / Wanted Sans 대안
   - 배경: Pure white + 사진 풀블리드
   - Anti-Slop: Off-white #F4F1EA / Italic em / Newsreader 차단
```

## 참조

- `~/.claude/dkb/references/tier-3/visitseoul.net/DNA.md` — 시드 톱 (144/180)
- `~/.claude/dkb/references/tier-3/lgcns.com/DNA.md` — 한영 듀얼 H1 (145/180)
- `~/.claude/dkb/dkb-config.json` § tone_mapping — soft-pastel / organic-natural 매칭
- `~/.claude/dkb/dkb-config.json` § tone_default_block v1.1 — 차단 토큰 정확값
- `~/.claude/dkb/industries/industrial-ai.md` — 형제 industries 매핑 (대비 톤)

## 변경 이력

| v1.0 | 2026-05-04 | 초기 등재 — visitseoul 144점 시드 톱 직격 매핑 + 다국어 9종/4계절/위젯 시그니처 정리 |
