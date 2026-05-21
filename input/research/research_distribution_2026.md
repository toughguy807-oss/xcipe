# ELUO SYS v4.0 배포/수익화 리서치 (2026-03-25)

## 배포 표준
- Plugin Marketplace가 최적: `.claude-plugin/plugin.json` 1개 추가로 배포 가능
- rules/ 디렉토리 대안 필요 (Plugin에 rules/ 전용 경로 없음)
- agentskills.io 오픈 표준: Codex/Gemini CLI/Cursor에서도 SKILL.md 호환
- 경쟁사: BMAD(npx+Plugin), superpowers(Plugin), gstack(Git Clone)

## 수익화 플랫폼
| 플랫폼 | 직접 판매 | 적합성 |
|--------|---------|--------|
| n8n 서드파티 | O ($49~$299) | 낮음 (워크플로 형식 불일치) |
| MindStudio | O (월 $200~$800) | 낮음 (에이전트 앱 형식) |
| Claude Marketplace | O (0% 수수료) | 엔터프라이즈만 |
| SkillsMP | X (디렉토리) | 브랜딩용 |
| GitHub + Gumroad | O | **현실적 1순위** |

## 결론
- 1차: GitHub 오픈코어 + Gumroad 프리미엄 번들
- n8n/MindStudio 직접 배포 부적합 → 폐기
- Plugin Marketplace는 개인 배포 경로 미확인 → 2차 대기
