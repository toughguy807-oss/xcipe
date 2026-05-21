# JSON 출력 (기계 간 인터페이스)

마크다운 산출물과 함께, 동일 경로에 `.json` 파일을 생성합니다.

**파일명**: `FN_{프로젝트코드}_v{N}.json`

```json
{
  "meta": {
    "skill": "plan-fn",
    "version": "v1",
    "project": "{프로젝트코드}",
    "created": "{YYYY-MM-DD}",
    "self_check": "{PASS/FAIL}",
    "self_check_detail": "{n/n}",
    "score": null
  },
  "summary": {
    "fn_count": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "first_id": "FN-001",
    "last_id": "FN-000"
  },
  "items": [
    {
      "id": "FN-001",
      "title": "",
      "complexity": "high|medium|low",
      "priority": "Must|Should|Could",
      "related_fr": ["FR-001"],
      "validation": ["정상 시나리오", "예외 시나리오"],
      "dependencies": ["FN-002"]
    }
  ],
  "dependencies": {
    "input": ["REQ"],
    "next": ["plan-ia", "plan-wbs", "design-ui"]
  }
}
```

**필수 규칙**:
- `id`: 반드시 `FN-###` 형식 (3자리 제로패딩)
- `complexity`: 반드시 `high`, `medium`, `low` 중 하나 (한글 금지)
- `related_fr`: 반드시 배열, 연계 모드 시 최소 1개 (독립 모드 시 빈 배열)
- `validation`: 반드시 배열, 복잡도 중간 이상 시 최소 2개
- null/빈 문자열 금지 (값이 없으면 해당 필드 생략)
