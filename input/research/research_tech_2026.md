# ELUO SYS v4.0 기술 리서치 (2026-03-25)

## 1. Figma Agent API
- MCP 서버에 쓰기(`use_figma`) 추가, Beta 무료, 유료 전환 예정
- `get_design_context`: 구조화된 React+Tailwind 코드 반환
- Skills 시스템: 마크다운 기반 에이전트 행동 지침
- `enabledPlugins`로 한 줄 토글 가능 (모듈화)
- 유료 전환 시 끄면 벤치마킹→HTML 경로로 자동 전환

## 2. Claude Code Auto Mode (2026-03-24)
- 분류기 기반 자동 승인/차단 (Research Preview)
- settings.json: `"permissions": {"defaultMode": "auto"}`
- 안전한 작업(파일 읽기/편집) → 자동 승인
- 위험한 작업(rm -rf, force push) → 자동 차단
- 기존 allow 100개+ 간소화 가능, deny는 유지

## 3. Hyperagents 논문 (Meta AI, 2026-03-19)
- 재귀적 메타인지: 개선 방법 자체를 개선
- 코드 수정 + 경험적 검증으로 프롬프트 기반 자기수정 한계 우회
- 적용 패턴: 재귀적 Self-Check, 편향 탐지, 적응적 이터레이션, 도메인 간 전이, 성능 추적

## 4. PlayerZero
- Engineering World Model, $20M 투자
- 코드 실행 없이 Sim-1 모델로 시뮬레이션 (92.6% 정확도)
- 직접 도입 과도, 패턴만 참고: Context Graph, 지식 영속성, PR 단위 예측 QA

## 5. Anthropic Long-running Claude
- Agent Teams: 리드 1명 + 팀메이트 N명 병렬 (토큰 7배)
- Background Tasks: 서브태스크 백그라운드 분리
- Scheduled Tasks: /loop(세션 내), Cloud(영구), Desktop(로컬)
- Headless Mode: CI/CD 비대화형 실행
- Git Worktree: 에이전트별 독립 브랜치
- 완전 온프레미스 모델 미지원 (실행은 로컬, 추론은 클라우드)

## 6. GitHub 연동 자동화
- `/install-github-app`: Claude 봇 설치
- `@claude` 멘션: PR/Issue 자동 처리
- `anthropics/claude-code-action@v1`: GitHub Actions CI/CD
- PR 자동 리뷰: 멀티에이전트 병렬 분석 (Research Preview, $15-25/리뷰)
- Issue→PR: `@claude` → 코드 작성 → PR 자동 생성
- Cloud Scheduled Tasks: PC 꺼져도 동작, 최소 1시간 간격
