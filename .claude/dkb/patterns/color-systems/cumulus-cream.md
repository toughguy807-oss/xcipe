---
category: color-systems
name: cumulus-cream
source_refs: [americanhousing.com]
domains: [Civic, Non-profit, Public policy, Housing, Editorial advocacy]
created: 2026-05-06
---

## 시그니처 (1줄)
cumulus warm white-yellow `#FDFFF1` BG + Pure black text + driveway gray `#302D2D` + blue `#1968B4` + red `#953012` 4-tone Editorial Civic palette.

## 핵심 토큰 (실측)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-cumulus` | **`#FDFFF1`** ★ | BG primary (warm white-yellow) |
| `--color-driveway` | `#302D2D` | 보조 텍스트 / 다크 그레이 |
| `--color-driveway-40` | `#ACABAB` | 옅은 그레이 (40% lightness) |
| `--color-blue` | `#1968B4` | 액센트 / 링크 / 정보 |
| `--color-blue-dark` | `#145390` | blue darker |
| `--color-red` | `#953012` | 강조 / 경고 |
| `--color-error` | `#FF8A7A` | error subdued |
| `--color-green` | `#21CC56` | success |
| `--color-black` | `#000000` | text primary |
| `--color-white` | `#FFFFFF` | white pure |

## 본질
- **cumulus `#FDFFF1`** — Pure white `#FFFFFF` 회피하며 warm yellow tint으로 Civic / advocacy 톤 차별
- **풀블리드 cityscape** photo 위 H1 64px medium 500 (die-d Adobe custom Sans)
- **Editorial 매거진**처럼 advocacy 메시지 전달 — 'Saving the American Dream'
- **36 vars Tailwind v4** 기반 토큰 시스템

## 적용 가이드
- **Civic / Non-profit / Public policy** 1순위
- **풀블리드 urban / cityscape photo hero** 차용
- **Editorial 64px medium H1 + 동일 크기 subhead** 패턴
- **die 시리즈 / Adobe Fonts custom typeface** — 차별화 typography (라이선스 확인 필요)

## 차단 조건
- ❌ B2B SaaS dashboard → linear-dark / scale-pure-black 권고
- ❌ Pure white BG → anthropic-warm-cream 권고
- ❌ Beauty pastel → lavender-tinted-white 권고
- ❌ 한국 SI → lgcns-mint-pastel 권고
- ❌ Gen-Z playful → fintech-candy-palette 권고

## 출처 references
- `tier-1/americanhousing/DNA.md` § cumulus `#FDFFF1` Civic advocacy palette (148/180, siteinspire #7 Corporate)

## 변경 이력
- 2026-05-06 v1.0 — Batch 5 신규 등재 (americanhousing.com 단독 출처)
