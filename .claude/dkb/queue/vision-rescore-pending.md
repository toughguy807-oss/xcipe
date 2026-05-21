# Vision 재채점 대기 큐

**도입일**: 2026-05-04
**용도**: v1.0 추정 → v1.1 부분 보정 상태인 references의 **풀 Vision 재채점 + tokens.css 정확값 추출** 추적
**처리 트리거**: 사용자 명시 호출 또는 다음 dkb-analyze 사이클 진입 시

## v1.2 처리 완료 (2026-05-04)

| reference | v1.1 → v1.2 | 변경 사항 | 상태 |
|---|:---:|---|:---:|
| `tier-1/anthropic.com/` | 148 → **150** | L3-1 비대칭 +1 (Hero 밝음 → Project Glasswing 어둠 전환), 시그니처 단순화(underline + 다크카드 + Anthropic A) | ✅ 완료 |
| `tier-1/linear.app/` | 150 → **151** | L3-5 모바일 +1 (375 캡처 정상), H1 카피 갱신("for teams and agents"), hero에 노란 CTA 부재 정정 | ✅ 완료 |
| `tier-1/vercel.com/` | 147 → **149** | **시각 메이저 변경 감지** — hero 다크 → 라이트 크림(#F4F2EE 추정) 전환. tone 2순위 industrial-utilitarian → brutally-minimal | ✅ 완료 |
| `tier-2/augury.com/` | 138 → **140** | L3-5 +1 (모바일 정상), L4-1 +1 ("310% ROI Forrester" 배지 인포그래픽 재확인) | ✅ 완료 |

## 캡처 자산 (재사용 가능)

```
c:/tmp/dkb-rescore/
├── anthropic-desktop.png  / anthropic-mobile.png
├── linear-desktop.png     / linear-mobile.png
├── vercel-desktop.png     / vercel-mobile.png
└── augury-desktop.png     / augury-mobile.png
```

`capture.mjs`: Playwright chromium + 1440×900 / 375×812 viewport, networkidle 대기, fullPage:false.

## v1.3 잔여 작업 (tokens.css 실측 hex 추출)

| reference | 잔여 hex 추출 |
|---|---|
| anthropic.com | Off-white 정확값(#FAFAF7 추정 → DevTools eval 확정), 다크 카드 #1A1815/#181615 후보 |
| linear.app | 노란 CTA hex (Now/Pricing 섹션), 보라 #5E6AD2, 코드 syntax 색상 |
| vercel.com | 크림 배경 hex (#F4F2EE / #F5F2ED / #F2F0EB 후보), 그라디언트 메쉬 stop 5색 |
| augury.com | 흰 배경(Pure white vs off-white), 다크 네이비 KPI 박스(#0B1B2E / #0F1F33 후보) |

## 처리 절차 (4건 일괄, v1.2 기준)

```
1. Playwright 캡처 (사이트별 1440px + 375px = 8 PNG) ✅
   - c:/tmp/dkb-rescore/capture.mjs

2. Vision 멀티모달 재채점 (사이트별 1회 호출) ✅
   - 입력: 1440 + 375 PNG
   - 출력: 18축 점수 갱신 + 시그니처 재확인

3. tokens.css 실측 갱신 (잔여 — v1.3에서 처리)
   - DevTools eval(`getComputedStyle`) 기반 실측 추출
   - 변경분 v1.3 changelog 기록

4. DNA.md 변경 이력 v1.2 추가 ✅
   - "Playwright 1440+375 풀 캡처 + 멀티모달 재채점" 표기
```

## 토큰 예산 (v1.2 실측)

- 4건 × ~10K 토큰 = **~40K** (1회 일괄 처리 시)
- dkb-config.json `max_tokens_per_site: 12000` 정책 내 (4 × 12K = 48K cap)
- dkb-policy.md §8-3 "5건/배치" 분할 정책 — 4건은 1배치 처리 가능

## 처리 후 작업

- ✅ `~/.claude/dkb/queue/vision-rescore-pending.md` v1.2 완료 표기
- 🔲 `~/.claude/dkb/INDEX.md` 점수 갱신 반영 (anthropic 150 / linear 151 / vercel 149 / augury 140)
- 🔲 변경분 ±5점 이상 케이스 검토 — 모두 +2 이내 → tier 재배치 불필요
- 🔲 vercel.com 시각 메이저 변경(다크→라이트) → `dkb/patterns/color-systems/vercel-warm-mesh.md` 신규 등재 검토 (Anthropic warm-cream과 차별화)

## 처리 이력

**2026-05-04 v1.2 일괄 처리**: SYS_v4 디자인 시스템 회고 Q3로 처리. Playwright 캡처(`c:/tmp/dkb-rescore/capture.mjs`) + 멀티모달 Read tool view + DNA.md v1.2 changelog 추가 완료. 4사이트 모두 +2 이내 점수 변동, vercel만 시각 메이저 변경 감지(다크 hero → 라이트 크림 hero).
