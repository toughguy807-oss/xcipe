# SYS_v4 멀티 기기 운영 가이드

> 일자: 2026-05-15 · 4계층 자산 분리 모델 + Junction 기반 매핑

## 1. 4계층 자산 모델

| 계층 | 자산 | 동기화 방법 | 책임자 |
|---|---|---|---|
| **L1 코드** | skills/agents/lib/rules/commands/ref + 메타 .md | Git (`.claude-shared/`) | 시스템 관리자 |
| **L2 운영** | dkb/references/section-packs + tests/baseline/ | Git (별도 폴더, Phase 2) | 도메인 운영자 |
| **L3 산출물** | output/ + tickets/ + Dashboard | 프로젝트별 Git repo + ops-deploy | 프로젝트 PM |
| **L4 개인** | .credentials.json + memory/ + plans/ + history/ | **동기화 금지** | 본인 |

## 2. 새 기기 부트스트랩 절차

### Step 1: Claude Code 설치 + 로그인
```powershell
# Claude Code 설치 (https://claude.ai/download)
claude login
# → 브라우저 → toughguy807@gmail.com 로그인 승인
```

### Step 2: eluohub repo clone
```powershell
mkdir D:\eluo-hub_v4
cd D:\eluo-hub_v4\..
git clone https://github.com/eluoaxjun/eluohub.git
```

### Step 3: ~/.claude/ Junction 매핑
```powershell
D:\eluo-hub_v4\tools\bootstrap-claude-junctions.ps1
```

이 스크립트는:
- `~/.claude/{skills,agents,commands,lib,ref}` 가 이미 존재하면 `_bootstrap-backup-{timestamp}/` 로 백업
- 백업된 위치에 `.claude-shared/`를 가리키는 Junction 생성
- `AGENTS.md`, `SKILLS_CATALOG.md`, `CLAUDE.md` 는 복사 (Junction 불필요)

### Step 4: 시크릿 환경변수 주입
시크릿 매니저(Bitwarden/1Password)에서 복사 → PowerShell 프로파일 또는 세션:

```powershell
$env:GEMINI_API_KEY = "..."
$env:FIGMA_PERSONAL_ACCESS_TOKEN = "..."
# 필요 시:
$env:SYS_AUTH_PASSWORD = "..."   # 산출물 사이트 패스워드
```

영구 등록 (선택):
```powershell
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "...", "User")
```

> 자세한 내용: [SECRETS_INVENTORY.md](./SECRETS_INVENTORY.md)

### Step 5: MCP 재인증
```
claude  # Claude Code 시작
# 안에서:
# - Figma MCP 사용 시 자동으로 OAuth 흐름
# - Supabase MCP 사용 시 동일
```

### Step 6: 검증
```
/doctor    # 시스템 자가 진단
/status    # 프로젝트 인식 여부
```

## 3. 일상 운영 — 기존 기기에서 변경 push

### `~/.claude/`에 스킬/룰/에이전트 수정 후

```powershell
# 1. .claude-shared/ 미러 갱신
D:\eluo-hub_v4\tools\sync-claude-to-shared.ps1

# 2. 변경 확인
cd D:\eluo-hub_v4
git status
git diff --stat .claude-shared/

# 3. 시크릿 스캔 통과 (pre-commit 자동)
git add .claude-shared/
git commit -m "sync(claude-shared): {변경 요약}"
git push
```

### 다른 기기에서 변경 pull
```powershell
cd D:\eluo-hub_v4
git pull
# Junction이 이미 .claude-shared/를 가리키므로 ~/.claude/ 자동 반영
```

## 4. 단방향 정책

- **원본**: `~/.claude/` (각 기기 로컬)
- **거울**: `D:/eluo-hub_v4/.claude-shared/` (Git SSoT)

`.claude-shared/`에서 **직접 편집 금지**. 다음 sync에서 덮어씌워짐. 변경은 항상 `~/.claude/`에서.

### 예외: 새 기기 첫 부트스트랩
새 기기에서는 `.claude-shared/`가 먼저 존재 → Junction이 `.claude-shared/` 를 가리킴 → `~/.claude/`에서 편집 = `.claude-shared/` 편집 (같은 실체) → 그 후 sync 스크립트는 변경이 없으므로 idempotent.

## 5. 충돌 시나리오

### Case A: 두 기기에서 동시 변경
```
기기 A: ~/.claude/skills/foo/SKILL.md 수정 → push
기기 B: ~/.claude/skills/foo/SKILL.md 수정 → sync → push
```

→ Git 머지 충돌 발생. 표준 git 해결.

**완화책**: 작업 시작 전 `git pull` 습관화.

### Case B: 시크릿이 .claude-shared 에 잘못 포함
sync 스크립트는 `.credentials.json` 등 제외 패턴 적용. 추가로 pre-commit 훅이 시크릿 패턴 스캔.

→ 2단계 방어. 만약 둘 다 우회되면 `git filter-repo`로 history 정리 + 즉시 토큰 revoke.

### Case C: Junction이 깨짐 (드라이브 이동 등)
```powershell
# 재실행
D:\eluo-hub_v4\tools\bootstrap-claude-junctions.ps1
```
기존 Junction을 감지 → 재생성. 실제 폴더는 백업 안 됨 (Junction은 데이터 없음).

## 6. 비공식 자산 (개인 격리)

| 자산 | 위치 | 사유 |
|---|---|---|
| memory/ | `~/.claude/memory/` | 개인 auto-memory — 본인 행동 패턴 |
| plans/ | `~/.claude/plans/` | 세션별 plan |
| history.jsonl | `~/.claude/history.jsonl` | CLI 히스토리 |
| paste-cache/ | `~/.claude/paste-cache/` | 임시 |
| rejections.jsonl | `~/.claude/dkb/rejections.jsonl` | DKB 개인 reject 패턴 |
| settings.local.json | `~/.claude/settings.local.json` | 로컬 권한/환경변수 override |

→ 백업이 필요하면 **개인 클라우드** (OneDrive/Google Drive) 별도 동기화. Git에는 절대 X.

## 7. 정책 갭 (CLAUDE.md vs 실제) — Phase 1 후 상태

| 정책 | 이전 | 현재 (Phase 1 완료 후) |
|---|---|---|
| 마스터 repo SSoT | plan-* 6개만 | **L1 자산 42 스킬 + 9 에이전트 + 23 룰 + 9 커맨드 + 9 ref 모두 미러** |
| 시크릿 격리 | .gitignore 3줄 | **시크릿 패턴 차단 + pre-commit 훅 빨간팀 테스트 통과** |
| 새 기기 부트스트랩 | 절차 없음 | **bootstrap-claude-junctions.ps1 스크립트** |
| dkb 105건 | Git 0건 | (Phase 2 대상) |
| auth-gate 가드 주입률 | 0% | (Phase 3 대상) |

## 8. 향후 작업 (이 가이드 기준)

- [ ] **Phase 2**: dkb/ + tests/baseline/ 흡수 → 본 가이드에 새 폴더 추가
- [ ] **Phase 3**: auth-gate Tier-A 즉시 패치 + ops-deploy 최초 실행 → 산출물 사이트 활성
- [ ] **Phase 5**: 새 기기 시뮬레이션 → 본 가이드의 Step 1~6 실제 검증
