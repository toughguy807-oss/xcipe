# Rules On-Demand 매핑 인덱스

**원칙**: 모든 `lib/rules/*.md`는 **상시 로드 금지**. 아래 트리거가 발생한 턴에만 `Read lib/rules/{file}` 로 명시 호출. 선제 로드·방어적 전수 Read 금지.
**이유**: Opus 4.7 한글 1.35× + 매 턴 system-reminder 재주입 부하 차단 (2026-04-21 정책).
**호출 시점**: 룰이 필요한 상황 인지 → 본 INDEX.md를 Read → 매칭 룰 식별 → 해당 룰 Read.

| # | 경로 | 트리거 (이 상황에서만 Read) |
|---|------|--------------------------|
| 1 | `lib/rules/quality.md` | 산출물 품질 기준 적용 · "좋은/나쁜" 판정 직전 |
| 2 | `lib/rules/anti-rationalization.md` | Self-Check/DA/reviewer 판정 직전 · 합리화 의심 · **§"진단 정확도" (2026-05-11): 시스템 상태 진단 보고 전 · "전수/모든/일괄" 표현 사용 시 · 외부 자료 패턴 차용 시 → grep 의무** |
| 3 | `lib/rules/artifact-scope.md` | 스킬이 다음 단계 결정 침범 의심 · SB 생성 직전 |
| 4 | `lib/rules/traceability.md` | FR/FN/UI/TC ID 생성·대조 · META 교차검증 |
| 5 | `lib/rules/pipeline.md` | 파이프라인 재실행/버전업/Ralph Loop/Advisor 모델 배정 · `--dangerously-skip-permissions` 감지 · 컨테이너 격리 판단 |
| 6 | `lib/rules/pm-direction.md` | 오케 Step 0 · PM Direction Gate 마커 출력 전 |
| 7 | `lib/rules/ccd-autogate.md` | CCD 모드 감지 · Gate 자동 결정 필요 |
| 8 | `lib/rules/handoff-schema.md` | META 블록 작성 · parent/change_type 기재 |
| 9 | `lib/rules/change-mgmt.md` | 전역 세팅 변경 · `internal-ticket` 등재 필요 (분기 D⁺ 후 Notion 동기화는 레거시) |
| 10 | `lib/rules/environment.md` | grep -P 실패 · 로컬서버 포트 충돌 · 스크립트 에러 |
| 11 | `lib/rules/cli-internalization.md` | 신규 MCP/CLI 도입 판단 · 외부 도구 선택 |
| 12 | `lib/rules/claude-api-usage.md` | Anthropic SDK 코드 작성 · caching/structured outputs |
| 13 | `lib/rules/compaction.md` | 컴팩션 발생 감지 · `/compact` 실행 직전 |
| 14 | `lib/rules/figma-sync.md` | `/figma-pull` · `/figma-push` · Figma 변경 감지 · **양방향 머지 충돌(시나리오 1~5)** |
| 15 | `lib/rules/figma-fidelity.md` | Figma 시안 → HTML 변환 · publish-markup 실행 |
| 16 | `lib/rules/modern-design-stack.md` | design-knowledge/layout · publish-style/interaction · **§8 게임 체인저 5선 (View Transitions Cross-Document / Anchor Positioning / scroll-driven / Motion DNA / WebGL for Designers)** · §9 CSS-Native Self-Check |
| 17 | `lib/rules/publish-patterns.md` | publish-visual-verify · Never-Rules grep · Iron Rules 검증 · **§3-4 Motion CSS-Native 1순위** |
| 18 | `lib/rules/context-engineering.md` | 컨텍스트 비대화 감지 · description/매핑 테이블 압축 직전 · tool result 미회수 의심 · 시스템 프롬프트 길이 제한 도입 검토 · 매 턴 토큰 측정 |
| 19 | `lib/rules/dkb-policy.md` | DKB references 매칭·도입 결정 · DNA 토큰 충돌 해소 · 디자인 시안 생성 (V1/V3/V4 관점 다양성) · 9개 갤러리 사고 패턴 차단 · **§7 Section Packs (hero/feature/pricing/footer 단위 미니 프롬프트팩)** |
| 20 | `lib/rules/vercel-wig.md` | **Vercel Web Interface Guidelines (외부 1급 표준 · snapshot SHA 핀)** · design-knowledge/layout/ui · publish-markup/style/interaction · qa-accessibility/performance · publish-visual-verify · §1-8 (Interactions/Animations/Layout/Content/Forms/Performance/Design/Copywriting) · **충돌 시 측정 가능 항목은 Vercel 우선, 미적 방향성은 자체 craft 우선** |
| 21 | `lib/rules/command-vs-skill.md` | 신규 진입점 도입 검토 · command 신설 판단 · **외부 자료(claude-starter-kit/agent-skills/GitHub repo/블로그/타 AI 시스템) 패턴 차용 검토 시 의무 (§"외부 자료 차용 체크리스트" 4-Step)** · 기존 9 commands deprecation 결정 |
| 22 | `lib/rules/agent-runtime.md` | 외부 멀티에이전트 패턴(AIMAX/Outworked/AgentOffice/CrewAI/Claude Office) 차용 검토 · Top 3 흡수(Cost Dashboard / 상태 6단계 / Crews-vs-Flows 2모드) 구현 착수 · "왜 흡수 안 했나" 질의 |

## Protected Rules (Archive 후보 제외)
참조: `lib/rules/PROTECTED.md` — 안전 룰 9건 + 보호 스킬 4건 + 90일 미만 신규 자산 면제
