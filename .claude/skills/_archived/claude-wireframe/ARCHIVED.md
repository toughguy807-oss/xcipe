# claude-wireframe — Archived 2026-05-12

## 폐기 사유

외부 스킬(Anthropic 본가)을 그대로 흡수한 상태로 SYS_v4 파이프라인과 미통합. plan-sb와 기능 중복 (HTML 와이어프레임 생성). 자원 가치는 plan-sb에 흡수 완료.

## 흡수 처리

| 자원 | 흡수 위치 |
|---|---|
| 22종 UX 철학 카탈로그 | `skills/plan-sb/references/ux-philosophies.md` §1 |
| Optimization Goal Lens | `skills/plan-sb/references/ux-philosophies.md` §2 |
| Quality Checks (Swap/Squint/Signature/Token) | `skills/plan-sb/references/ux-philosophies.md` §3 |
| Anti-Patterns 4종 (시각) | `skills/plan-sb/references/ux-philosophies.md` §4 (publish-visual-verify 이관 검토 대기) |
| Anti-Patterns Generic AI (10종) | `skills/plan-sb/references/ux-philosophies.md` §5 |
| Warmth/Precision 토큰 세트 | `skills/plan-sb/references/ux-philosophies.md` §6 |
| 5종 옵션 탐색 패턴 | `skills/plan-sb/SKILL.md` Step 1.3 (Mode A + `--explore` 플래그) |

## 흡수하지 않은 자원

| 자원 | 사유 |
|---|---|
| Phase 2 Clean/Polished 컬러 변형 | plan-sb는 흑백 와이어 단계까지. 컬러는 design-replicate 영역 |
| design-context.md / design-taste.md (개별 파일) | plan-sb는 FN/REQ 기반 추적성 사용. 별도 컨텍스트 메모리 충돌 |
| 5 병렬 Task agent 패턴 | plan-sb는 1화면 1산출물 구조. 병렬화 불요 |
| wireframe/templates/base.css, template.html, self-reveal.css | plan-sb 자체 mockup-template.js로 대체 |

## 복원 절차 (필요 시)

폴더를 `~/.claude/skills/claude-wireframe/`으로 다시 이동하면 자동 인덱싱 복귀. 단 plan-sb와 트리거 중복으로 사용자 혼란 가능 — 복원 전 description 차별화 필수.

## 관련 메모리

향후 외부 스킬 흡수 시 본 사례 참조. (memory 후보 — compound 스킬에서 추출 검토)
