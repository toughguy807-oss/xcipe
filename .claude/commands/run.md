# 전체 파이프라인 실행
프롬프트 1줄로 Planning→Design→Build→QA까지 전자동 실행합니다.

## 동작 방식

1. **프롬프트 파싱**: 프로젝트명, 업종, 규모, 핵심 기능, 플랫폼 자동 추출
2. **PROJECT.md 자동 생성**: 추출된 정보로 5섹션 스캐폴딩
3. **CCD 모드 활성화**: 전 오케스트레이터에 자동 게이트 적용
4. **순차 실행**: planning → design → publish → qa
5. **handoff 체이닝**: 각 단계 META 블록으로 다음 단계 입력 자동 연결

## 실행 조건

- CCD 모드 자동 활성화 (사용자 확인 0회 목표)
- 에스컬레이션 발생 시에만 중단
- Self-Check PASS + reviewer 80점+ 자동 통과

## 출력

```
output/{프로젝트명}/
├── planning/   REQ, FN, IA, WBS
├── design/     STYLE, LAYOUT, UI시안
├── build/      HTML/CSS/JS (또는 플랫폼별 코드)
├── qa/         테스트 결과
├── trace/      FR→FN→UI→TC 추적 매트릭스
└── summary.md  1장짜리 경영 요약
```

## 실행

pm-router를 CCD 모드로 호출합니다. 프롬프트 전문을 전달합니다.

$ARGUMENTS
