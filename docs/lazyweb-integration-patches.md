# Lazyweb 통합 패치 초안

> 2026-05-15 작성. 운영 스킬 적용 전 사용자 검토 필수.
> 토큰 발급 완료, 캐시 흡수 모델 결정 ([[project_lazyweb_evaluation]] 참조).

## Patch 1 · `dkb-search/SKILL.md` Step 6 직전 신설

**위치**: `C:\Users\hj.moon\.claude\skills\dkb-search\SKILL.md`, 현재 Step 6 (매칭 0건 처리) 직전에 Step 5.5 추가.

```markdown
### Step 5.5: Lazyweb 폴백 (2026-05-15 신설 · 캐시 흡수 모델)

조건:
- Top N 매칭이 부족(scores < threshold) 또는 매칭 0건
- `~/.lazyweb/lazyweb_mcp_token` 존재 (없으면 SKIP → Step 6)

호출:
```
mcp.lazyweb.lazyweb_search({
  query: f"{industry} {tone} {priority}",
  filters: { category, company, platform },
  limit: 3
})
```

응답 처리 (캐시 흡수):
1. 각 결과를 `~/.claude/dkb/references/_lazyweb_cache/{slug}/`에 저장
2. `dkb-analyze` 자동 호출로 18축 임시 채점 + DNA.md 생성
3. 사용자 게이트: "Lazyweb에서 3건 후보. 정식 등재할까요?" → 승인 시 tier-2 이상으로 승격
4. `provenance` 필드에 `source: lazyweb` + `cached_at: ISO` 명시

게이트 룰:
- [[feedback_user_gate_value]] — 외부 자원 차용 시 사용자 게이트 1회 의무
- 게이트 거부 시 _lazyweb_cache/에 보존만 하고 references 풀에서 제외
- 30일 미사용 캐시는 dkb-curate가 자동 삭제 대상

Lazyweb 서비스 종료 영향: 0 (이미 흡수된 캐시는 영구 보존).
```

---

## Patch 2 · `ref/design-taste.md` Anti-Patterns 통합

**위치**: `C:\Users\hj.moon\.claude\ref\design-taste.md`, "통합 매트릭스" 표 직후 또는 NEVER List 섹션 직전에 추가.

```markdown
## Anti-Patterns 외부 소싱 (2026-05-15 신설 · Lazyweb 통합)

Anti-Slop 룰은 자체 NEVER List + Lazyweb `lazyweb-design-research` 리포트의
**Anti-Patterns 섹션**을 융합. 충돌 시 자체 NEVER List 우선.

흡수 규칙:
1. `lazyweb-design-research` 호출 결과의 `.lazyweb/{skill}/{topic}-{date}/report.md` 파싱
2. `## Anti-Patterns` 섹션만 추출
3. 항목별 검증: 자체 NEVER List와 중복 → SKIP, 신규 → 후보 큐
4. 사용자 게이트 후 본 문서 NEVER List에 명시 추가 (출처: lazyweb-{date})

활용 시점:
- design-replicate V3(비판 대안) 시안 생성 직전 — V3 프롬프트 네거티브 제약으로 주입
- publish-visual-verify Phase 1 Grep 룰 보강 — 신규 Anti-Pattern 발견 시
- reviewer 채점 — 시안에 Lazyweb Anti-Pattern 일치 시 감점

제약:
- 산출물(클라이언트 전달물)에는 Lazyweb 출처 스크린샷 직접 포함 금지 (참고 전용)
- Anti-Pattern 텍스트만 흡수, 이미지는 캐시에 보존만
```

---

## Patch 3 · `design-replicate/SKILL.md` V3 보강

**위치**: `C:\Users\hj.moon\.claude\skills\design-replicate\SKILL.md`, V3 프롬프트 정의 섹션.

```markdown
### V3 (비판 대안) — Lazyweb 비교 강화 (2026-05-15 신설)

V3 프롬프트 생성 절차:
1. 매칭된 reference의 DNA.md에서 시그니처 추출 (existing)
2. 토큰 존재 시 → `mcp.lazyweb.lazyweb_compare_image({ ref_image })` 호출
3. 응답에서 다음 추출:
   - 유사 화면 중 reference와 정반대 시그니처 사용한 3건
   - 해당 화면들의 공통 Anti-Pattern (있다면)
4. V3 프롬프트에 네거티브 제약으로 주입:
   ```
   다음 패턴을 피하라 (Lazyweb 비교 결과):
   - {anti_pattern_1}
   - {anti_pattern_2}

   다음 대안 방향을 시도하라:
   - {opposite_signature_from_lazyweb}
   ```
5. 사용자 게이트: V3 시안 생성 전 "Lazyweb 비교 결과 적용?" 1회 확인

토큰 미존재 또는 호출 실패 시: 기존 V3 프롬프트 그대로 사용 (graceful degradation).

비용: lazyweb_compare_image 1회 호출 = MCP API 1회. 무료/무한도이므로 비용 게이트 불필요.
```

---

## 적용 순서 권고

1. **즉시 적용 가능** (안전): Patch 2 (design-taste.md NEVER List 신규 섹션 추가 — 영향 적음)
2. **테스트 후 적용**: Patch 1 (dkb-search Step 5.5 — 캐시 디렉토리 생성 영향)
3. **마지막 적용**: Patch 3 (design-replicate V3 — 시안 생성 흐름에 영향)

## 적용 전 사용자 확인 사항

- [ ] Patch 1: `~/.claude/dkb/references/_lazyweb_cache/` 디렉토리명 OK?
- [ ] Patch 2: NEVER List에 외부 소스 항목 표시 방식 OK? (출처 라벨링)
- [ ] Patch 3: 사용자 게이트 1회 추가가 V3 흐름 방해하지 않는가?
- [ ] Claude Code 플러그인 설치 실행 여부:
  ```
  claude plugin marketplace add https://github.com/aboul3ata/lazyweb-skill
  claude plugin install lazyweb@lazyweb
  ```
