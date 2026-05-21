---
name: figma-push-finalize
description: >
  Figma Push 자동화 (MVP2-C) — captureId 기반 폴링 + 결과 URL 수신.
  prepare step 의 captureId 와 노드의 puppeteer 캡처 완료 후 자동 큐잉됩니다.
  사용자 직접 호출 금지 (시스템 전용).
argument-hint: "[parent prepare step JSON: captureId/endpoint]"
---

## 응답 제약

- **MUST**: 출력은 이 SKILL.md에 정의된 형식을 정확히 따를 것
- **MUST**: `mcp__figma__generate_figma_design(captureId)` 폴링 — 최대 12회, 5초 간격
- **MUST**: status `completed` 시 figma_url / fileKey / nodeId 응답 META 에 명시
- **MUST**: status `failed` 시 self_check FAIL + reason
- **MUST NOT**: 새 captureId 발급 금지 (prepare 단계 영역)
- **MUST NOT**: Bash/puppeteer/Chrome 호출 금지
- **MUST NOT**: 파일 작성 금지 (본문은 보고용 마크다운)

**범위 이탈 감지 시 즉시 중단**:
```
[범위 이탈 감지] {작업} 은 figma-push-finalize 범위 외.
```

---

## 입력

prepare step 의 artifact.meta_json:

```json
{
  "figma_push": {
    "captureId": "abc-123",
    "endpoint": "https://mcp.figma.com/mcp/capture/abc-123/submit",
    "outputMode": "existingFile",
    "fileKey": "FILE_KEY",
    "parent_skill": "design-knowledge"
  }
}
```

추가로 노드 hook 가 capture trigger 완료 메타 주입:

```json
{
  "capture_trigger": {
    "ok": true,
    "durationMs": 6500,
    "timestamp": "2026-05-15T..."
  }
}
```

## 절차 (폴링)

```
for i in 1..12:
  result = mcp__figma__generate_figma_design({ captureId: "{captureId}" })
  if result.status == "completed":
    break
  if result.status == "failed":
    FAIL
  sleep 5s
```

## 출력

```markdown
# Figma Push Finalize — {parent_skill}

| 항목 | 값 |
|------|-----|
| captureId | {captureId} |
| status | completed |
| figma_url | {url} |
| fileKey | {fileKey} |
| nodeId | {nodeId or '-'} |
| polling_attempts | {N} |

## 결과

[Figma 에서 보기]({figma_url})

<!-- META { "skill": "figma-push-finalize", "version": "v1", "self_check": "PASS",
  "figma_push_result": {
    "captureId": "{captureId}",
    "status": "completed",
    "figma_url": "{url}",
    "fileKey": "{fileKey}",
    "nodeId": "{nodeId}",
    "polling_attempts": {N}
  }
} -->
```

## 실패 처리

- 12회 폴링 후 `pending` 유지 → `"self_check": "FAIL"`, reason: "timeout 60s"
- `failed` 응답 → `"self_check": "FAIL"`, reason: 응답 메시지
- 노드 hook 가 capture_trigger.ok=false 로 주입 → 즉시 FAIL (폴링 무의미)

[Self-Check] PASS / 미충족: 없음
