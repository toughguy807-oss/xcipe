# JSON 출력 (기계 간 인터페이스)

마크다운 산출물과 함께, 동일 경로에 `.json` 파일을 생성합니다.

**파일명**: `REQ_{프로젝트코드}_v{N}.json`

```json
{
  "meta": {
    "skill": "plan-req",
    "version": "v1",
    "project": "{프로젝트코드}",
    "created": "{YYYY-MM-DD}",
    "self_check": "{PASS/FAIL}",
    "self_check_detail": "{n/n}",
    "score": null
  },
  "summary": {
    "fr_count": 0,
    "nfr_count": 0,
    "must": 0,
    "should": 0,
    "could": 0,
    "first_fr": "FR-001",
    "last_fr": "FR-000"
  },
  "items": [
    {
      "id": "FR-001",
      "title": "",
      "priority": "Must|Should|Could",
      "category": "",
      "acceptance_criteria": ["AC 1", "AC 2"],
      "related_qst": ["Q-001"]
    }
  ],
  "nfr": [
    {
      "id": "NFR-001",
      "category": "성능|보안|접근성|호환성",
      "description": "",
      "measurement": "",
      "target": ""
    }
  ],
  "dependencies": {
    "input": ["QST"],
    "next": ["plan-fn"]
  }
}
```

**필수 규칙**:
- `id`: 반드시 `FR-###` 또는 `NFR-###` 형식 (3자리 제로패딩)
- `priority`: 반드시 `Must`, `Should`, `Could` 중 하나
- `acceptance_criteria`: 반드시 배열, 최소 1개
- `related_qst`: 연계 모드 시 배열, 독립 모드 시 빈 배열
- null/빈 문자열 금지
