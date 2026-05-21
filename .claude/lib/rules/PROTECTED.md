# Protected Rules & Skills (Archive 후보 제외 리스트)

**도입일**: 2026-04-30 (Week 4 rules 다이어트 사전 보완)
**적용 범위**: 진화 로드맵 Week 4 rules 다이어트 + Week 6 sunset 정책
**원칙**: 호출 빈도 0 ≠ 필요 없음. 안전 룰은 예외 상황에만 호출되는 게 정상.

## 보호 사유 분류

| 분류 | 의미 | 호출 패턴 |
|------|------|---------|
| **A. 안전 룰** | 사고/예외 차단 룰. 정상 흐름에서 호출되지 않음이 정상 | 매우 낮음 |
| **B. 모드 한정** | 특정 모드 진입 시만 호출 | 모드 의존 |
| **C. 외부 시스템 연동** | Figma/Notion/Git 등 외부 도구 사용 시만 | 시점 의존 |
| **D. 메타 인프라** | 진화/측정/통합 결정의 토대 | 의사결정 시점 |

## 보호 룰 9건 (lib/rules/)

| 룰 | 분류 | 보호 사유 |
|----|------|---------|
| `anti-rationalization.md` | A | Self-Check/DA/reviewer 합리화 차단 (정상 흐름 호출 0이 정상) |
| `ccd-autogate.md` | B | CCD 모드 한정 |
| `change-mgmt.md` | A | 전역 세팅 변경 시만 호출 (정상 작업 무관) |
| `compaction.md` | A | 컴팩션 발동 시만 (예외 상황) |
| `figma-fidelity.md` | C | Figma 시안 → HTML 변환 시만 |
| `figma-sync.md` | C | `/figma-pull`·`/figma-push` 명시 호출 시만 |
| `dkb-policy.md` | D | 04-30 신규 도입, design 도메인 핵심 (Week 4까지 90일 미만, sunset 적용 금지) |
| `context-engineering.md` | D | 04-30 신규 도입, 진화 의사결정 토대 (sunset 적용 금지) |
| `claude-api-usage.md` | C | Anthropic SDK 직접 작성 시만 (사내 외부 도구 도입 결정 시) |

## 보호 스킬 (skills/)

| 스킬 | 보호 사유 |
|------|---------|
| `dkb-search` | 04-30 신규 (DKB References-First 실행 메커니즘) |
| `design-replicate` | 04-30 V1/V3/V4 재설계, 9개 갤러리 사고 차단 핵심 |
| ~~`design-bench-scrape`~~ | **2026-05-18 dkb-analyze 흡수 → 보호 해제**. stub은 2026-07-15까지 유지 후 삭제 예정 |
| `publish-visual-verify` | 04-20 상한선 게이트 + 9-Axis 채점 의무 |

## Sunset 정책 적용 면제

다음 자산은 frontmatter `sunset_at` 필드가 있어도 **자동 archive 후보 산정에서 제외**:

- 보호 룰 9건 (위 표)
- 보호 스킬 4건 (위 표)
- 도입일 90일 미만 신규 자산 (현재 04-30 기준 → 2026-07-29까지 신규 도입분 모두 면제)

## 갱신 의무

본 리스트는 **분기별 1회** 검토. 새 룰/스킬 도입 시 보호 분류 사전 결정. Week 6 외부 흡수 게이트 통과 시점에 보호 분류 명시.

## 참조

- `lib/rules/context-engineering.md` §금지 사항: "호출 빈도 0 = archive 자동 결정 금지"
- 메모리 `feedback_analyze_before_answer.md`: 단편 지표로 결론 금지
- 진화 로드맵 Week 4: rules 다이어트
