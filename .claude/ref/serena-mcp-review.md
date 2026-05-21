# Serena MCP 검토 (C4-3, 2026-05-07)

`oraios/serena` MCP 도입 여부 + settings.json 적용 가이드.

## 결론 — **조건부 보류 (Watch List 등록)**

**즉시 도입 X**, **아래 트리거 발생 시 재검토 O**.

## 근거

### Serena가 제공하는 가치 (Grep/Glob 대체 불가 영역)

| 기능 | 기존 도구 가능? | Serena 필요성 |
|------|----------------|---------------|
| Symbol 정의/참조 lookup | Grep으로 일부 가능 (오탐) | LSP 기반 정확도 ↑ |
| Cross-file rename | Edit + Grep 수동 (위험) | **단일 명령** 안전 |
| Type hierarchy | 불가 | ✅ |
| Unused code 탐지 | 수동 | ✅ |
| File outline | Read 일부 | ✅ |
| Pattern search | Grep | 동등 |

### 도입 비용

| 항목 | 비용 |
|------|------|
| 런타임 의존 | `uv` (Python 패키지 매니저) 신규 설치 필요 |
| Windows 호환성 | **공식 명시 없음** — PoC 필요 |
| MCP 정책 위반 | `project_resource_strategy.md` "MCP 3개만 유지" 위반 |
| 토큰 비용 | LSP 응답이 매 턴 컨텍스트에 잔류 (description 추가 ~80 tokens × 한글 1.35) |
| 인덱싱 시간 | 첫 호출 시 LSP 부팅 지연 (수십 초 추정) |

### 재검토 트리거 (둘 중 하나 발생 시)

1. **SYS_v4 `src/engine/` 파일 수 ≥ 50개** (현 ~30개)
2. **첫 cross-file rename / symbol 마이그레이션** 발생 (예: Provider 인터페이스 변경, model-bridge 리팩터링)

위 트리거 발생 전: Grep/Glob/Edit 조합 + 수동 검증으로 충분.

## 도입 시 settings.json 적용 (참조용 — 현재 미적용)

**전제**: PoC로 Windows 호환성 확인 후 진행.

```jsonc
{
  "mcpServers": {
    "figma": { "url": "https://mcp.figma.com/mcp" },
    "figma-desktop": { "url": "http://127.0.0.1:3845/mcp" },
    "serena": {
      "command": "uv",
      "args": ["tool", "run", "serena-agent", "mcp"],
      "env": {
        "SERENA_PROJECT_ROOT": "D:/SYS_v4"
      }
    }
  }
}
```

추가 권한 (allow):
```
"mcp__serena__find_symbol",
"mcp__serena__find_references",
"mcp__serena__rename_symbol",
"mcp__serena__file_outline",
"mcp__serena__pattern_search"
```

## PoC 절차 (재검토 트리거 발생 시)

1. `uv tool install -p 3.13 serena-agent@latest --prerelease=allow` (Windows)
2. `serena init` → `D:/SYS_v4` 인덱싱 시간 측정
3. `claude mcp add serena -- uv tool run serena-agent mcp` 임시 등록
4. 실제 작업 1건 처리 → Grep/Edit 조합 대비 시간/정확도 측정
5. 베이스라인 측정: `verify-baseline.js`로 회귀 영향 확인
6. 양호 시 settings.json 영구 등록 + AGENTS.md / SKILLS_CATALOG.md 등재

## 출처

- 공식 저장소: https://github.com/oraios/serena
- 정책 메모리: `memory/project_resource_strategy.md` (MCP 3개 한도)
- 관련 룰: `lib/rules/cli-internalization.md`, `lib/rules/context-engineering.md`

## Watch Log (트리거 점검 이력)

| 일자 | src/engine/ 파일 수 | cross-file rename 발생 | 결정 |
|------|---------------------|------------------------|------|
| 2026-05-07 | 26 (50 미달) | 미발생 (Provider 인터페이스는 신규 도입, rename 아님) | **Watch List 유지** — settings.json 미변경 |

다음 점검 트리거: src/engine/ 신규 파일 4개 추가 시 또는 첫 cross-file rename 발생 시.
