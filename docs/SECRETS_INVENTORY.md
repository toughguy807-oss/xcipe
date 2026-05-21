# SYS_v4 시크릿 인벤토리

> 일자: 2026-05-15 · 분기 D⁺ 외부 SaaS 의존 0 원칙
>
> **이 문서에 실제 시크릿 값을 적지 마세요.** 위치·이름·만료·재발급 절차만 기록.

## 1. 시크릿 매니저 위치 규약

| 자원 | 매니저 항목명 (권장) | 비고 |
|---|---|---|
| Claude Code OAuth | `Claude Code / OAuth` | refresh token은 자동 갱신, 수동 백업 불필요 |
| Figma MCP OAuth | `SYS_v4 / Figma MCP` | claude login --mcp로 재인증 가능 |
| Supabase MCP (2종) | `SYS_v4 / Supabase / {project_ref}` | project_ref 2개: `rcndirlsdmovufswhlqo`, `uznradrxwtolsvtinofe` |
| FIGMA_PERSONAL_ACCESS_TOKEN | `SYS_v4 / Figma PAT` | figma.com → 계정 설정에서 재발급 |
| GEMINI_API_KEY | `SYS_v4 / Gemini API` | aistudio.google.com → API key |
| NOTION_API_KEY | `SYS_v4 / Notion API (DEPRECATED)` | 분기 D⁺로 폐기. 잔존 시 정리 |
| OPENAI_API_KEY | `SYS_v4 / OpenAI` | 사용처 미상 — 검토 후 보관 또는 폐기 |
| SYS_AUTH_PASSWORD | `Project / {프로젝트명} / AuthGate PW` | 산출물 사이트 패스워드 (Tier-A) |
| GITHUB_TOKEN | `SYS_v4 / GitHub PAT` | ops-deploy / pre-commit / Actions |
| ANTHROPIC_API_KEY | `SYS_v4 / Anthropic API (PENDING)` | 미수급 — memory project_anthropic_key_pending |

## 2. 발급처 + 재인증 절차

### 2.1 Claude Code OAuth
- 발급: `claude login` → 브라우저 → toughguy807@gmail.com
- 저장: `~/.claude/.credentials.json` (자동)
- 만료: refresh token 자동 갱신, 6개월 미사용 시 만료
- 새 기기: 단순히 `claude login` 재실행

### 2.2 Figma
- MCP: `claude login` 후 Figma MCP 권한 승인
- PAT: figma.com → 설정 → Personal Access Tokens → Create new
- 새 기기: PAT는 환경변수로 재주입 또는 MCP 재인증

### 2.3 Gemini API
- 발급: https://aistudio.google.com/apikey
- 저장: `$env:GEMINI_API_KEY` (PowerShell `[Environment]::SetEnvironmentVariable`)
- 비용: 무료 tier 충분 (design-image 사용량)

### 2.4 GitHub PAT (ops-deploy용)
- 권한: `repo` (private repo 푸시)
- 만료: 90일 → 매 분기 갱신
- 새 기기: 재발급 권장 (PAT 공유 비권장)

### 2.5 산출물 사이트 패스워드 (SYS_AUTH_PASSWORD)
- 프로젝트별로 발급 — 단일 공유 비번 1개
- GitHub Actions secret 등록: `gh secret set VGN_AUTH_PW`
- 로컬 빌드 시: `$env:SYS_AUTH_PASSWORD = "..."` 후 `ops-deploy` 실행
- 클라이언트 전달: 메신저/이메일은 비권장, 전화 또는 임시 텍스트 서비스 (Privnote 등)

## 3. 새 기기 부트스트랩 시크릿 체크리스트

```
[ ] Claude Code 설치 + claude login
[ ] Bitwarden/1Password 클라이언트 설치 + 마스터 비번
[ ] GEMINI_API_KEY 환경변수 (매니저에서 복사)
[ ] FIGMA_PERSONAL_ACCESS_TOKEN 환경변수 또는 MCP 재인증
[ ] (필요 시) GITHUB_TOKEN — gh auth login
[ ] (Tier-A 운영 시) SYS_AUTH_PASSWORD 환경변수
[ ] NOTION_API_KEY 미설정 확인 (분기 D⁺ 폐기 자원)
[ ] /doctor 실행 → 시크릿 누락 알림 확인
```

## 4. 금지 사항

| # | 금지 | 이유 |
|---|---|---|
| 1 | 시크릿을 코드/문서에 평문 기록 | Git 추적 시 즉시 유출 |
| 2 | `.credentials.json`을 Dropbox/iCloud로 동기화 | refresh token 충돌 + 유출 |
| 3 | 시크릿을 Slack/메일 첨부 전송 | 검색 인덱싱 + 백업 노출 |
| 4 | 시크릿을 환경변수로 영구 등록 후 PowerShell 프로파일에 저장 | 평문 디스크 잔존 |
| 5 | 여러 프로젝트가 같은 SYS_AUTH_PASSWORD 공유 | 1개 유출 = 전체 유출 |

## 5. 사고 대응 (시크릿 유출 시)

| 시크릿 | 즉시 조치 |
|---|---|
| Claude OAuth | https://claude.ai → 설정 → Sessions → Revoke all |
| Figma PAT/MCP | figma.com → 토큰 즉시 revoke + 재발급 |
| Gemini API | aistudio.google.com → API key delete |
| GitHub PAT | github.com/settings/tokens → Revoke |
| AuthGate PW | 빌드 환경변수 갱신 + `ops-deploy` 재실행 → 클라이언트 통지 |
| SUPABASE | Dashboard → 프로젝트 → Auth → revoke OAuth |

## 6. 점검 주기

| 항목 | 주기 |
|---|---|
| 시크릿 매니저 백업 | 매 분기 |
| GitHub PAT 갱신 | 매 분기 (90일) |
| Bitwarden/1Password 마스터 비번 | 매 6개월 |
| AuthGate PW 갱신 | 클라이언트 변경 시 또는 매 6개월 |
| 환경변수 정리 (사용 안 함) | 매 분기 — 본 문서 §1 표 기준 |
