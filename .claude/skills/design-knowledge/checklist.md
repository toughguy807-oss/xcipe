# Style Guide (Design-Knowledge) 체크리스트

## 7대 카테고리 완결성
- [ ] 컬러: Primary/Secondary/Neutral/Semantic 정의
- [ ] 컬러: 50~900 스케일 또는 shade 체계
- [ ] 타이포: font-size 8단계 (4xl~xs)
- [ ] 타이포: font-weight 4단계 (bold/semibold/medium/regular)
- [ ] 타이포: line-height 3단계 (tight/normal/relaxed)
- [ ] 타이포: font-family KO/EN 쌍 (heading/body/mono)
- [ ] 간격: 4px 기반 스케일 (xs~4xl)
- [ ] 둥근 모서리: sm/md/lg/full 정의
- [ ] 그림자: sm/md/lg 정의
- [ ] 전환: fast/normal/slow + easing 정의
- [ ] 아이콘: 시스템 선택 + 크기 스케일 정의

## 토큰 네이밍
- [ ] `--{카테고리}-{속성}` 패턴 전수 준수
- [ ] CSS Custom Properties 형식으로 출력 가능
- [ ] 카테고리 간 네이밍 충돌 없음

## 접근성 (대비)
- [ ] Primary ↔ 배경 대비비 4.5:1 이상 (AA 본문)
- [ ] 대형 텍스트 대비비 3:1 이상
- [ ] Semantic 컬러 대비 검증 (error/success 등)

## 브랜드 정합성
- [ ] PROJECT.md 브랜드 시트의 컬러가 토큰에 반영
- [ ] PROJECT.md 브랜드 시트의 폰트가 토큰에 반영
- [ ] 업종 프리셋 적용 시 커스터마이징 근거 명시

## 벤치마킹 반영
- [ ] BM 산출물의 디자인 포인트가 토큰에 반영
- [ ] 채택 사유 기록 (어떤 BM에서 어떤 토큰을 참고)
- [ ] BM 미실시 시 `[미확인]` 태그 부여

## 실용성
- [ ] 토큰 수가 과다하지 않음 (카테고리당 3~12개 범위)
- [ ] 반응형에서 토큰이 깨지는 구간 없음
- [ ] 퍼블리싱에서 바로 사용 가능한 형식
