# 변경 관리 프로토콜

파이프라인 외 전역 변경사항은 Notion + 로컬 이중 기록으로 관리한다.

## 대상

| # | 대상 | Notion DB | 버전 파일 |
|---|------|-----------|-----------|
| 1 | 전역 세팅 | DB-1: Settings Change Log | MEMORY.md |
| 2 | 설치 가이드 | DB-2: Install Guide Version | install.bat, catalog.md, standards.md |
| 3 | 디자인 가이드 | DB-3: Design Guide Version | DESIGN_PRINCIPLES.md |

## 규칙
- 변경 시 반드시 로컬 이력 + Notion 동시 기록
- 버전업 규칙: `project-assets/notion-changelog-protocol.md` 참조
- MEMORY.md 변경 이력 테이블은 계속 유지 (Notion과 이중 관리)
