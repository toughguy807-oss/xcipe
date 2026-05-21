# DKB Feedback Loop (2026-05-04 신설)

**용도**: dkb-search 매칭 결과에 대한 사용자/오케스트레이터 reject 신호를 수집해 다음 매칭 시 동적 가중치 적용
**관련 룰**: `lib/rules/dkb-policy.md` §9 Reject Feedback Loop
**관련 스킬**: `skills/dkb-search` Step 0.5 / Step 7

## 디렉토리 구조

```
~/.claude/dkb/feedback/
├── README.md             ← 이 파일 (스키마 + 운영 정책)
├── rejections.jsonl      ← append-only reject 로그 (한 줄 = 한 reject 이벤트)
└── stats.json            ← 집계 캐시 (선택 — 50건 이상 시 자동 생성)
```

## rejections.jsonl 스키마

각 라인은 단일 JSON 객체:

```json
{
  "ts": "2026-05-04T15:30:00+09:00",
  "ref_path": "~/.claude/dkb/references/tier-1/anthropic.com/DNA.md",
  "ref_type": "page" | "section_pack" | "pattern",
  "context": {
    "industry": "industrial-ai",
    "target": "investor",
    "priority": "signature",
    "tone": "brand-safe"
  },
  "reason_code": "tone_mismatch" | "domain_unfit" | "visual_overlap" | "user_taste" | "duplicate_signature" | "other",
  "reason_text": "프로젝트 톤이 brand-safe인데 Editorial Serif가 너무 강함",
  "source": "user" | "orchestrator" | "reviewer",
  "session_id": "{optional}"
}
```

### 필드 의미

| 필드 | 의미 | 필수 |
|------|------|:---:|
| `ts` | reject 발생 시각 (ISO 8601, KST) | ✓ |
| `ref_path` | reject된 자산 절대 경로 (references / section-packs / patterns) | ✓ |
| `ref_type` | `page`(references) / `section_pack` / `pattern` | ✓ |
| `context` | reject 발생한 매칭 컨텍스트 (industry/target/priority/tone) | ✓ |
| `reason_code` | 사유 코드 (6종 중 택 1, 가중치 산정용) | ✓ |
| `reason_text` | 자유 서술 (사람용 — 자동 분석 X) | - |
| `source` | reject 주체 (사용자 / orchestrator 자동 / reviewer 검수) | ✓ |
| `session_id` | 추적용 세션 ID | - |

## reason_code 별 가중치 (Step 0.5에서 적용)

| reason_code | 동일 컨텍스트 페널티 | 글로벌 페널티 (모든 컨텍스트) |
|-------------|:---:|:---:|
| `tone_mismatch` | -3 | -1 |
| `domain_unfit` | -5 | -2 |
| `visual_overlap` | -2 | 0 |
| `user_taste` | -2 | -1 |
| `duplicate_signature` | -2 | 0 |
| `other` | -1 | 0 |

**누적 룰**:
- 동일 ref + 동일 컨텍스트 N회 reject → 페널티 × N (선형 누적, max -10)
- 동일 ref + 다른 컨텍스트 → 글로벌 페널티만 적용
- 90일 초과 reject 이벤트 → 페널티 0.5× (시간 감쇠)
- 180일 초과 reject 이벤트 → 무시

## 적용 대상

dkb-search Step 3(우선순위 정렬) 점수 계산 직후, Step 4(Top N 선정) 직전:

```
final_score = base_score + tier_weight + axis_weight + target_weight - reject_penalty
```

- 페널티가 너무 커서 final_score가 0 이하가 되면 Top N 후보에서 자동 제외 (단, references 풀이 N 미만이 되면 제외 룰 무시 — 빈 결과 방지)

## 호출 방식

### 자동 reject (orchestrator)

```
design-orchestrator가 design-replicate Step 종료 후 V1/V3/V4 시안 검수에서
references 1개를 사용자가 BLOCK한 경우 → orchestrator가 자동 append:

Bash: echo '{"ts":"...","ref_path":"...","reason_code":"tone_mismatch",...}' >> ~/.claude/dkb/feedback/rejections.jsonl
```

### 수동 reject (사용자)

```
사용자: "이 anthropic.com 매칭은 우리 프로젝트엔 안 맞아 — 톤이 너무 editorial이야"
→ 어시스턴트: dkb-search Step 7 (reject 기록) 호출
```

## stats.json 자동 생성 트리거 (2026-05-04 신설)

dkb-search Step 7이 reject를 append할 때마다 다음 룰로 stats.json 갱신을 트리거:

```
trigger_condition:
  rejections.jsonl line_count % 50 == 0   # 50, 100, 150, ... 마다
  OR
  last_stats_age > 30d                     # 한 달 이상 미갱신 시
```

**트리거 절차** (dkb-search Step 7 후미):

1. `wc -l ~/.claude/dkb/feedback/rejections.jsonl` 실행
2. 결과가 50의 배수면 stats.json 재생성 호출
3. 미배수면 트리거 스킵 (저비용 후속 처리)

**재생성 수도코드** (Bash):

```bash
LINES=$(wc -l < ~/.claude/dkb/feedback/rejections.jsonl)
if [ $((LINES % 50)) -eq 0 ] && [ $LINES -ge 50 ]; then
  node ~/.claude/skills/dkb-search/scripts/aggregate-stats.js \
    ~/.claude/dkb/feedback/rejections.jsonl \
    > ~/.claude/dkb/feedback/stats.json.new
  mv ~/.claude/dkb/feedback/stats.json.new ~/.claude/dkb/feedback/stats.json
fi
```

> `aggregate-stats.js` 헬퍼 미존재 시: dkb-search가 inline JS로 jsonl→stats.json 변환. 의존성 0.

**dkb-analyze --mode review와의 관계**:
- stats.json은 매 50건 단위 **스냅샷**
- dkb-analyze --mode review는 **실시간** rejections.jsonl 재계산 (스냅샷 무관)
- 둘은 독립 — stats.json은 외부 소비용(대시보드/모니터링) / review 모드는 운영자 의사결정용

## stats.json (선택 — 50건 도달 시 자동 생성)

```json
{
  "generated_at": "2026-05-04T15:30:00+09:00",
  "total_rejects": 73,
  "by_ref": {
    "tier-1/anthropic.com": {
      "count": 12,
      "by_context": {
        "industrial-ai|investor|signature|brand-safe": 8,
        "korea-b2b|executive|kpi-impact|brand-safe": 4
      },
      "by_reason": {"tone_mismatch": 9, "user_taste": 3}
    }
  },
  "trending_rejects_30d": ["tier-1/anthropic.com", "..."]
}
```

## 등재 영향 (deprioritization 임계)

동일 ref가 동일 컨텍스트에서 **5회 이상** reject되면 stats.json `trending_rejects_30d`에 기록.
이 시점에 dkb-curate / dkb-analyze 재검토 알림이 dkb-search 출력에 포함된다 (Step 5 출력의 `feedback_alert` 필드).

## 금지

- rejections.jsonl 라인 수정/삭제 금지 — append-only (감사 추적성)
- 사용자 의견 없이 LLM 자동 reject 금지 (orchestrator는 명시적 사용자 BLOCK 신호만 기록)
- 페널티 누적이 -10 초과해도 reference 자체 archive 금지 (운영자 명시 결정)
- reject 사유 6종 외 신규 코드 추가 시 dkb-policy.md §9 갱신 필수

## 후속 과제

- [ ] `commands/dkb-feedback.md` — reject 로그 조회/통계 명령 (예: `/dkb-feedback --ref anthropic.com --last 30d`)
- [ ] dkb-curate에 trending_rejects_30d 자동 검토 단계 추가 (등재 강등 결정 보조)
- [ ] reviewer 에이전트가 V1/V3/V4 시안 검수 시 BLOCK 결정을 자동 reject로 기록 (source: "reviewer")
