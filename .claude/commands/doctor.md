# 시스템 자가 진단
ELUO SYS의 스킬, 에이전트, 규칙, MCP 서버의 정합성을 자동 검증합니다.

## 검증 항목

### 1. 스킬 구조 검증
- `~/.claude/skills/` 하위 모든 SKILL.md 존재 확인
- YAML frontmatter 필수 필드 (name, description) 유효성
- checklist.md 참조 파일 존재 확인

### 2. 에이전트 → 스킬 참조 무결성
- 각 agent.md의 `skills:` 필드에 나열된 스킬이 실제 존재하는지
- 고아 스킬 (어떤 에이전트에도 참조되지 않는 스킬) 탐지

### 3. 규칙 파일 검증
- `~/.claude/lib/rules/` 하위 모든 .md 파일 존재 확인
- 필수 규칙 확인: quality.md, traceability.md, pipeline.md, handoff-schema.md, anti-rationalization.md, ccd-autogate.md

### 4. 커맨드 검증
- `~/.claude/commands/` 하위 모든 .md 파일 존재 확인
- `$ARGUMENTS` 마커 존재 여부

### 5. MCP 서버 검증
- settings.json 또는 settings.local.json에 등록된 MCP 서버 목록 확인
- 각 서버의 command 실행 가능 여부 (npx/node 경로 확인)

### 6. 권한 감사 (cc-safe 패턴)
- `~/.claude/settings.json` permissions.allow 배열에서 위험 패턴 grep
- **탐지 대상**:
  - `sudo`, `rm -rf /`, `rm -rf ~`, `rm -rf $HOME`
  - `chmod 777`, `chmod -R 777`
  - `curl ... | sh`, `curl ... | bash`, `wget ... | sh`
  - `git reset --hard origin`, `git push --force` (main/master 대상)
  - `--dangerously-skip-permissions`
  - `npm publish`, `docker run --privileged`
  - 평문 비밀번호 노출 (sshpass -p, mysql -p'pass', postgresql://user:pass@)
- **출력**: 패턴별 매칭된 라인 번호 + 위험도(🔴 즉시 제거 / 🟡 검토 / 🟢 정상)
- **권장 조치**: 🔴 항목은 즉시 settings.json에서 삭제, 🟡는 user/local 분리 검토

### 7. 프로젝트 산출물 검증 (프로젝트 폴더에서 실행 시)
- output/ 디렉토리 존재 확인
- _context.md 존재 + 누적 상태 확인
- META 블록 존재 여부 (최신 산출물 파일 하단)
- 추적성 체인 끊김 탐지 (FR→FN→UI→TC)

## 출력 형식

```
═══════════════════════════════════
[ELUO Doctor] 시스템 진단 결과
═══════════════════════════════════
▶ 스킬 구조:      {n}/{n} PASS
▶ 에이전트 참조:   {n}/{n} PASS
▶ 규칙 파일:      {n}/{n} PASS
▶ 커맨드:         {n}/{n} PASS
▶ MCP 서버:       {n}/{n} PASS
▶ 권한 감사:      🔴 {n}건 / 🟡 {n}건 / 🟢 {n}건
▶ 프로젝트 산출물: {n}/{n} PASS (프로젝트 폴더 시)
───────────────────────────────────
판정: {ALL PASS / n건 FAIL}
═══════════════════════════════════
```

FAIL 항목이 있으면 구체적 파일 경로 + 수정 방법을 안내합니다.
