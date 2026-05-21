# Opus 4.7 후속 권고안 (2026-04-17)

Opus 4.7 GA 직후 시장 분석 + Phase 1~3 실행 후 도출된 후속 검토 항목.

## 적용 완료 (Phase 1~3, 2026-04-17)

| # | 항목 | 결과 |
|---|------|------|
| 1 | settings.json env: effort xhigh + 컴팩션 55% | ✅ 적용 |
| 2 | Self-Check scaffolding 정리 | ✅ 6건 수정 (C 비율 14%) |
| 3 | tests/baseline 자산 구축 | ✅ 5개 task + verify-baseline.js |
| 4 | thinking display API 옵션 | ❌ SKIP (markdown frontmatter 제어 불가 확인) |

## 검토 후 보류·미채택

### A) AgentShield — 보안 감사 도구

| 항목 | 내용 |
|------|------|
| 출처 | github.com/affaan-m/agentshield (Cerebral Valley x Anthropic 해커톤 2026-02) |
| 기능 | CLAUDE.md/settings.json/MCP/hooks/agents 보안 감사 — 시크릿/권한/훅 인젝션/MCP 위험/프롬프트 인젝션 |
| 구현 | 102 static rules + 3-agent adversarial pipeline (Red/Blue/Auditor) on Opus 4.6 |
| 형태 | CLI, GitHub Action, plugin, GitHub App |

**평가**:
- 1인 환경 즉시 가치: LOW
- **팀 배포 시 가치: HIGH** — 사내 배포 직전 settings.json/MCP/hooks의 시크릿·권한 누설 사전 차단
- **권고: 팀 배포 직전 1회 PoC 실행 → 결과 양호 시 CI 통합 검토**

**실행 방법** (팀 배포 직전):
```bash
# CLI 모드
npx agentshield scan ~/.claude/

# 또는 plugin 설치 후
agentshield audit
```

### B) `/ultrareview` — Parallel multi-agent code review

| 항목 | 내용 |
|------|------|
| 출처 | GitHub Changelog (Claude Code 신기능, 2026-04) |
| 기능 | parallel multi-agent code review |

**평가**:
- 우리 reviewer.md(단일 sonnet 에이전트, 100점 채점) 대비 차이점 측정 필요
- **권고: 관찰 항목**. 우리 reviewer가 100점 만점 채점 + Generator/Evaluator 2-Phase 구조라 이미 다층화됨. 추가 가치 측정 후 결정

### C) instincts (everything-claude-code) — confidence 스코어링

| 항목 | 내용 |
|------|------|
| 출처 | github.com/affaan-m/everything-claude-code |
| 기능 | 자동 패턴 추출 + confidence 스코어링 + SessionStart/End 훅 |

**평가**:
- 우리 `_context.md` 패턴이 이미 핵심 기능 커버
- **미채택**. over-engineering. 우리 시스템에 흡수 시 복잡도만 증가

## 1주 후 재점검 (2026-04-23)

| 항목 | 점검 사유 |
|------|----------|
| claude-usage 4.7 토크나이저 대응 | 미대응 시 baseline 도구로 자체 측정 |
| ccflare 부활 여부 | 8개월 정체 → 폐기 결정 유지 가능성 |
| Anthropic 캐싱 버그 패치 | 비용 monitoring 결과 확인 |
| 우리 baseline pilot run 1회 측정 | 수치 확보 후 회귀 탐지 가능 |

## 후속 액션 우선순위

| # | 액션 | 시점 | 담당 도구 |
|---|------|------|----------|
| P0 | baseline pilot run 1회 (plan-fn) | 즉시~1주 내 | verify-baseline.js |
| P1 | claude-usage 4.7 대응 확인 | 2026-04-23 | WebFetch |
| P2 | AgentShield PoC | 팀 배포 직전 | npx agentshield |
| P3 | `/ultrareview` vs reviewer.md 비교 | reviewer 회귀 발생 시 | 측정 비교 |

## 출처

- [AgentShield](https://github.com/affaan-m/agentshield)
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [Claude Opus 4.7 What's New](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7)
- [implicator.ai — secret nerf 분석](https://www.implicator.ai/claude-probably-wasnt-secretly-nerfed-anthropic-made-the-black-box-too-dark/)
