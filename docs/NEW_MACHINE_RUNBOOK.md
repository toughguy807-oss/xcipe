# 새 기기 부트스트랩 Runbook

> 일자: 2026-05-18 · 시뮬레이션 검증 완료 (`C:\tmp\sim-newmachine\.claude`)

## 검증된 시나리오

| Step | 결과 |
|---|---|
| 1. `.claude-shared/` 매핑 | skills 42 / lib/rules 24 / agents 9 / commands 9 / ref 9 ✓ |
| 2. 메타 파일 복사 | AGENTS.md / SKILLS_CATALOG.md / CLAUDE.md ✓ |
| 3. auth-gate 패치 반영 | 6/6 항목 확인 (`?reauth=1`, D-1 알림, 로그아웃 버튼, verify_guard_coverage, 다중 기기 안내, visit counter) ✓ |
| 4. 시크릿 누출 검증 | `.credentials.json` 0건, `memory/` 0건 ✓ |
| 5. Junction 안정성 | mklink /J 로 5폴더 정상 매핑 ✓ |

## 시뮬레이션 중 발견된 위험

### Issue #1 — sync 누락 시 옛 버전 노출 (Critical)
**증상**: `~/.claude/skills/auth-gate/SKILL.md` 직접 편집 후 `sync-claude-to-shared.ps1` 실행 안 함 → 시뮬레이션에서 패치 0/6 (모두 False)
**원인**: `.claude-shared/`는 거울이지만 sync 자동화 안 됨. 변경 후 수동 sync 필수.
**해결**: 운영 룰에 명시 (§3) + post-edit watcher 검토 (Watch List)

### Issue #2 — Junction 권한 (Low)
**증상**: Windows에서 `mklink /J` 는 사용자 권한으로 동작 — 관리자 불필요. (`mklink /D` 와 다름)
**해결**: 부트스트랩 스크립트가 `/J` 만 사용 (이미 적용됨)

## 새 기기 부트스트랩 — 검증된 절차

### Step 1: Claude Code 설치 + 로그인 (5분)
```powershell
# https://claude.ai/download 에서 다운로드 후 설치
claude login
# 브라우저 → toughguy807@gmail.com 승인
```

**검증**: `claude --version` → `2.1.132 (Claude Code)` 이상

### Step 2: Git + repo clone (3분)
```powershell
# Git 설치 확인
git --version

# repo clone
mkdir D:\
cd D:\
git clone https://github.com/eluoaxjun/eluohub.git eluo-hub_v4
```

**검증**: `ls D:\eluo-hub_v4\.claude-shared\skills | wc -l` → 42

### Step 3: Junction 부트스트랩 (1분)
```powershell
D:\eluo-hub_v4\tools\bootstrap-claude-junctions.ps1
```

**예상 출력**:
```
✓ junction: skills
✓ junction: agents
✓ junction: commands
✓ junction: lib
✓ junction: ref
✓ copy: AGENTS.md
✓ copy: SKILLS_CATALOG.md
✓ copy: CLAUDE.md
```

**검증** (PowerShell):
```powershell
(Get-Item ~\.claude\skills).Attributes  # 'ReparsePoint' 포함
(Get-ChildItem ~\.claude\skills).Count  # 42
```

### Step 4: 시크릿 환경변수 주입 (5분)
시크릿 매니저(Bitwarden/1Password)에서 복사:

```powershell
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "<from-vault>", "User")
[Environment]::SetEnvironmentVariable("FIGMA_PERSONAL_ACCESS_TOKEN", "<from-vault>", "User")
# 산출물 사이트 운영 시:
[Environment]::SetEnvironmentVariable("SYS_AUTH_PASSWORD", "<from-vault>", "User")

# 새 셸에서 확인
echo $env:GEMINI_API_KEY  # 공백 아님
```

> 자세한 인벤토리: [SECRETS_INVENTORY.md](./SECRETS_INVENTORY.md)

### Step 5: MCP 재인증 (3분)
Claude Code 시작 후 자동으로 Figma/Supabase OAuth 흐름. 첫 사용 시:
```
# 새 셸에서
claude
# 안에서 Figma 도구 호출 시 → 브라우저 OAuth → 토큰 자동 저장
```

### Step 6: 검증 (1분)
```
/doctor
/status
```

**예상**:
- `/doctor`: 모든 자산 OK, 시크릿 누락 알림 (있으면 Step 4 보강)
- `/status`: 프로젝트 인식 (있는 경우)

### Step 7: 프로젝트 작업 디렉토리 (선택)
운영 중인 프로젝트 repo 별도 clone:
```powershell
# 예시
git clone <project-repo-url> D:\SYS_v4
git clone <client-project-repo> D:\<client>
```

## 일상 운영 — Daily SOP

### A. 작업 시작 (매일)
```powershell
cd D:\eluo-hub_v4
git pull
# Junction이 .claude-shared/를 가리키므로 자동 반영
```

### B. ~/.claude 변경 push (변경 시마다)
**중요**: 시뮬레이션 Issue #1 — 이 단계 스킵하면 다른 기기는 옛 버전 봄.

```powershell
# 1. 변경 작업 후
D:\eluo-hub_v4\tools\sync-claude-to-shared.ps1

# 2. 검토
cd D:\eluo-hub_v4
git status
git diff --stat .claude-shared/

# 3. commit (pre-commit 시크릿 스캔 자동)
git add .claude-shared/
git commit -m "sync(claude-shared): {요약}"
git push
```

### C. dkb/tests 변경 push (선택, 자산 추가 시)
```powershell
D:\eluo-hub_v4\tools\sync-l2-to-repo.ps1
git add dkb/ tests/baseline/
git commit -m "sync(l2): {요약}"
git push
```

## 트러블슈팅

### "Junction이 깨졌어요"
```powershell
# 재실행 — 기존 junction 감지 → 재생성
D:\eluo-hub_v4\tools\bootstrap-claude-junctions.ps1
```

### "/doctor 가 'skills 누락' 알림"
```powershell
# .claude-shared/ 가 비어있을 가능성
ls D:\eluo-hub_v4\.claude-shared\skills | wc -l  # 0 이면

# git pull 누락
cd D:\eluo-hub_v4
git pull
```

### "Figma MCP 인증 안 됨"
```powershell
# Claude Code 안에서:
# /doctor 실행 → "Figma MCP: token expired" 등 알림
# 해결: Claude Code 재시작 후 첫 Figma 도구 호출 → 자동 OAuth 흐름
```

### "pre-commit 훅이 정상 시크릿(예: 테스트 fixture)을 막아요"
화이트리스트 경로 사용 — `tools/pre-commit-secret-scan.sh:55` 의 `whitelist_regex` 참조:
- `fixtures/` `test/` `tests/` `.example` `.template` 안의 시크릿은 통과

### "Sync 실행 시 robocopy exit 1"
robocopy는 0~7이 성공. PowerShell이 마지막 exit code를 그대로 반환해서 1로 표시될 뿐. 실제 출력에서 `✓` 표시 + 파일 수 확인되면 정상.

## 시간 예산 (실측)

| Phase | 예상 시간 |
|---|---|
| Step 1 (claude login) | 5분 |
| Step 2 (git clone, 97MB+) | 3분 |
| Step 3 (Junction) | 1분 |
| Step 4 (env vars, 8개) | 5분 |
| Step 5 (MCP) | 3분 |
| Step 6 (검증) | 1분 |
| **총** | **~20분** (plan §의 "30분" 목표 안) |

## 검증된 위험 완화

| 위험 | 완화책 | 적용 위치 |
|---|---|---|
| sync 누락 → 옛 버전 노출 | Daily SOP §B 강제, 향후 watcher 검토 | 본 문서 |
| 시크릿 평문 commit | `.gitignore` + pre-commit 훅 (빨간팀 통과) | `D:\eluo-hub_v4\.git\hooks\pre-commit` |
| 시크릿 동기화 사고 | `.claude-shared/` 제외 패턴 (memory/credentials) | `tools/sync-claude-to-shared.ps1` §ExcludePatterns |
| Junction 권한 부족 | `/J` 만 사용 (`/D` 사용 안 함) | `tools/bootstrap-claude-junctions.ps1` |
| 클라이언트 만료 미인지 | D-1 배너 + visit counter | `auth-gate` SKILL.md §auth.js |

## Watch List (향후 검토)

| # | 항목 | 트리거 |
|---|---|---|
| 1 | `~/.claude/` 변경 감지 → 자동 sync watcher | sync 누락 사고 1회 이상 발생 시 |
| 2 | `ops-deploy` 최초 실행 | 클라이언트 산출물 공유 요청 시 |
| 3 | `auth-gate` Tier-B 도입 | PII/계약/금액 산출물 등장 시 |
| 4 | `dkb/section-packs/` 본격 등재 | 현재 0건 → 디자인 품질 정체 시 |
| 5 | 시크릿 매니저 통합 (1Password CLI 등) | 환경변수 수동 주입 부담 증가 시 |

## 변경 이력

| 일자 | 변경 |
|---|---|
| 2026-05-18 | 초안 작성. 시뮬레이션 검증 (auth-gate 6/6 패치 확인). Issue #1 (sync 누락) 발견 → Daily SOP §B 강제. |
