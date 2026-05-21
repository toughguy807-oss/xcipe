# 실행 환경·장애 대응

Windows / macOS / Linux 혼재 환경에서 파이프라인·스크립트가 일관되게 동작하기 위한 공통 규칙.

## 크로스플랫폼 호환성

| 항목 | 원칙 | 사유 |
|------|------|------|
| **Bash `grep` 플래그** | `-P` 금지 → `-E` (확장 정규식) 또는 `-oE` 사용 | Git Bash(Windows)는 `-P` 미지원. `Grep` 도구(ripgrep)는 무관 |
| **파일 다운로드 경로** | `curl -sL -o "/절대경로/..."` 형식 | 상대경로는 실행 위치에 따라 실패. 절대경로 강제 |
| **로컬 서버 캐시** | `npx http-server . -p 8080 --cors -c-1` | 캐시 없이 현 산출물 즉시 반영 |
| **경로 구분자** | 쉘에서는 `/` 고정, Windows 네이티브 명령에서만 `\` 허용 | 셸 환경 기반 (CLAUDE.md 지침) |
| **node 경로** | `node` → 실패 시 `C:\Program Files\nodejs\node.exe` 또는 `/usr/local/bin/node` 순서 시도 | PATH 미등록 환경 대응 |
| **라인 엔딩** | LF 고정 (Git attributes 의존) | CRLF 혼용 시 스크립트 파싱 오류 |

## 장애 대응 공통 원칙

스크립트 / API / 외부 도구 실패 시, **전역 실패로 종료하지 않고 단계 스킵 후 나머지 계속 진행**한다. CCD 모드에서도 동일.

| 실패 유형 | 조치 |
|----------|------|
| 스크립트 실행 실패 (node/python/shell) | 1) 에러 메시지를 사용자에게 안내 <br>2) 해당 단계 스킵 <br>3) 나머지 단계 진행 <br>4) 최종 보고에 스킵 사유 기록 |
| 외부 API 호출 실패 (Firecrawl / Gemini / WebFetch) | 폴백 도구 시도 → 모두 실패 시 스킵 + `[미확인]` 표기 |
| MCP 서버 미기동 | fallback CLI 우선, 없으면 스킵 + 수동 확인 안내 |
| node/npm 실행 불가 | 환경세팅 가이드(`환경세팅_가이드.md` 또는 `CLAUDE.md`) 참조 안내 |
| 환경변수 미설정 (`GEMINI_API_KEY` 등) | 실행 전 검증 → 에러 메시지 + 발급 URL 안내 → 스킵 |

**원칙**: 실패를 **무음 처리 금지**. 반드시 에러 로그를 산출물 또는 `_context.md`에 기록하여 사후 추적 가능하게 한다.

## 로컬 서버 포트 관리 프로토콜 (2026-04 추가)

Playwright/curl 기반 렌더 검증 직전, 포트 점유 상태를 반드시 확인한다. 실측 사고 케이스 — 기존 http-server가 v4를 서빙하는 동안 v5 캡처를 시도해 "v5를 검증한다 생각했으나 v4를 검증한" 사고 발생 (curl MD5 비교로 사후 확정).

| # | 절차 | 명령 |
|---|------|------|
| 1 | 포트 점유 + 마커 확인 | `node C:/Users/hj.moon/.claude/skills/publish-visual-verify/scripts/check-server-port.js --port 8080 --marker "publish-v{n}"` |
| 2 | 마커 불일치 시 다음 가용 포트 사용 | 반환된 `suggested` 포트로 `npx http-server {dir} -p {suggested} --cors -c-1` |
| 3 | curl MD5 로 실제 서빙 대상 대조 (권장) | `curl -s http://localhost:{port}/ \| md5sum` — 산출물 HTML의 md5와 비교 |
| 4 | 캡처 후 서버 종료 | 백그라운드 PID 기록 후 작업 종료 시 `kill` |

**원칙**: "서버가 떠 있다" ≠ "정확한 산출물을 서빙한다". 매 세션 마커 + MD5로 실제 대상 확인.

## 금지 사항

| # | 금지 | 사유 |
|---|------|------|
| 1 | `grep -P` 사용 | Windows Git Bash 미지원 |
| 2 | 스크립트 실패를 전역 실패로 처리 | CCD 모드에서 파이프라인 전체 중단 방지 |
| 3 | 실패 로그 무음 처리 | 사후 추적 불가 |
| 4 | 하드코딩 경로 사용 | 환경별 실패 (예: `/Users/foo/...`) |
| 5 | 환경변수 미검증 실행 | 중간 실패로 부분 산출물 오염 |
| 6 | 포트 점유 확인 없이 캡처 시작 | 엉뚱한 디렉토리를 검증하는 사고 재발 방지 |

## 참조

- `rules/cli-internalization.md` — CLI Skill 카탈로그
- `rules/figma-sync.md` — Figma MCP + CLI fallback 패턴
- `rules/pipeline.md` — Ralph Loop 이터레이션 규칙
