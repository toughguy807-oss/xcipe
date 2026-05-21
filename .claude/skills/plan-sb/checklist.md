# 화면설계서 (SB) 체크리스트 v2

## JSON 데이터 완전성
- [ ] project 필수 필드 존재: `id`, `title`, `serviceName`, `version`, `date`, `writer` (권장: `company.name`, `requestor`)
- [ ] `$schema: "screen-design-schema-v2"` 또는 v1 자동 정규화 조건 충족 (`assignment` 필드 존재)
- [ ] `history[]` 최소 1건 존재
- [ ] `screens[]` 최소 1건 존재
- [ ] 각 screen의 `descriptions[]` 최소 1건 존재 (design/description 타입)

## 슬라이드 구성
- [ ] Cover 슬라이드 존재 (프로젝트명, 버전, 작성일, 작성자)
- [ ] History 슬라이드 존재 (변경 이력 테이블)
- [ ] Screen 슬라이드 수 = `screens[]` 수와 일치
- [ ] `hasDivider: true`인 screen 수만큼 Divider 슬라이드 자동 삽입 확인
- [ ] End of Document 슬라이드 존재

## 16:9 슬라이드 규격 (v2)
- [ ] 모든 슬라이드 1920×1080px 고정 (overflow:hidden)
- [ ] PDF landscape 출력 (`size: 1920px 1080px landscape`)
- [ ] 슬라이드 구조: slide-header(54px) + slide-body + slide-footer(36px)
- [ ] Design 슬라이드 레이아웃: 좌 60% wireframe-area + 우 40% description-panel

## Screen 슬라이드 품질
- [ ] 슬라이드 헤더 바: interfaceId | interfaceName | pageName 표시
- [ ] 슬라이드 푸터 바: company / writer / modifiedDate 표시
- [ ] UI 캡처 또는 와이어프레임 요소 정상 표시
- [ ] Description 영역: 마커 번호 + 영역명 + 상세 항목 표시
- [ ] 변경 유형 마크업: `changeType` 존재 시 변경|추가|삭제 표기

## fnRef 필드 (v2)
- [ ] 연계 모드(context/fn.md 존재) 시 `descriptions[].fnRef` 배열에 FN 코드 1건 이상
- [ ] fnRef 존재 시 Description 패널 하단 `[FN 참조]` 섹션 렌더링 확인
- [ ] fnRef: [] (독립 모드 또는 미연계)이면 [FN 참조] 섹션 미표시 확인
- [ ] FN 처리 로직·알고리즘·AC 수치 기준이 Description에 복사되지 않음

## MSG Case 분리 (v2)
- [ ] `screenType:'design'` + `msgCases[]` 동시 존재 시 별도 슬라이드 자동 생성 확인
- [ ] design 슬라이드 내 msgCase 인라인 혼재 0건 (verify.js ERROR 0건)

## 이미지 참조
- [ ] `uiImagePath` 지정 시 파일 존재 확인
- [ ] 이미지 미존재 시 wireframe placeholder 정상 표시

## PDF 출력
- [ ] HTML 파일 정상 생성
- [ ] PDF 파일 정상 생성 (Playwright 미설치 시 자동 설치)
- [ ] PDF landscape 1920×1080px 확인
- [ ] 배경 인쇄 포함 (printBackground: true)
- [ ] 슬라이드 간 페이지 구분 정상 (page-break-after: always)

## 검증 (verify.js)
- [ ] `node verify.js output/{프로젝트}/{날짜}/{파일명}.html` 실행 성공
- [ ] ERROR 0건 (MSG 인라인 혼재 없음)
- [ ] WARN 가급적 0건 (overflow, 콘텐츠밀도, fnRef 누락 확인 후 판단)
- [ ] 스크린샷 수 = 슬라이드 수 일치 (`verify/{파일명}-slide{NNN}.png`)
