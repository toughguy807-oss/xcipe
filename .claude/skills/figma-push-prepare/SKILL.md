---
name: figma-push-prepare
description: >
  Figma Push 자동화 (MVP2-A) — design-knowledge/layout/ui/plan-sb 산출물의 _figma 변환본을
  Figma 파일로 전송하기 위한 captureId 발급. SYS_v4 pipeline-worker 가 design step 완료 후
  자동으로 큐잉합니다. 사용자 직접 호출 금지 (시스템 전용).
argument-hint: "[parent-step JSON: figma_push_ready 메타]"
---

## 응답 제약

- **MUST**: 출력은 이 SKILL.md에 정의된 형식을 정확히 따를 것
- **MUST**: `mcp__figma__generate_figma_design` 1회만 호출 — outputMode 결정 + captureId 발급
- **MUST**: 출력 META 블록에 captureId / endpoint / outputMode 명시 (노드 후처리가 파싱)
- **MUST NOT**: Chrome 캡처/폴링/Bash 호출 금지 (다음 step 또는 노드 hook 영역)
- **MUST NOT**: 산출물 파일 작성 금지 — 본문은 보고용 마크다운만
- **MUST NOT**: 다른 도구(Write/Edit/Read) 사용 금지

**범위 이탈 감지 시 즉시 중단**:
```
[범위 이탈 감지] {작업} 은 figma-push-prepare 범위 외.
→ figma-push-finalize / pipeline-worker 영역.
```

---

## 입력

parent step (design-knowledge/design-layout/design-ui/plan-sb)의 artifact.meta_json 안:

```json
{
  "figma_push_ready": {
    "skill": "design-knowledge",
    "figma": {
      "file_key": "ABC123",
      "node_id": null,
      "design_system": "KDS"
    },
    "prepared_files": ["_figma/preview-figma.html"],
    "push_command": "/figma-push preview.html"
  }
}
```

## 절차 (단일 호출)

### Step 1: outputMode 결정

| 조건 | outputMode | 비고 |
|------|------------|------|
| `figma.file_key` 존재 + `figma.node_id` 존재 | `existingFile` | 기존 노드 업데이트 |
| `figma.file_key` 존재 + node_id 없음 | `existingFile` | 파일 안 새 페이지 추가 |
| 둘 다 없음 (호출 자체가 안 됨) | — | parent hook 가 차단 |

### Step 2: MCP 호출

```
mcp__figma__generate_figma_design({
  outputMode: "existingFile",
  fileKey: "{figma.file_key}",
  fileName: "{project.code}-{skill}-{date}"
})
```

응답: `{ captureId, endpoint, status: "pending" }`

### Step 3: 응답 마크다운 + META

```markdown
# Figma Push Prepare — {skill}

| 항목 | 값 |
|------|-----|
| skill | {skill} |
| file_key | {figma.file_key} |
| outputMode | existingFile |
| captureId | {captureId} |
| endpoint | {endpoint} |
| prepared_files | {N}개 |

## 다음 단계

노드 hook 가 puppeteer 로 _figma/{name}-figma.html 을 captureId 주입한 URL 로 로드하여 캡처를 트리거합니다. 그 다음 figma-push-finalize step 이 자동으로 폴링을 시작합니다.

<!-- META { "skill": "figma-push-prepare", "version": "v1", "self_check": "PASS",
  "figma_push": {
    "captureId": "{captureId}",
    "endpoint": "{endpoint}",
    "outputMode": "existingFile",
    "fileKey": "{figma.file_key}",
    "parent_skill": "{skill}",
    "prepared_files": [...]
  }
} -->
```

## 실패 처리

- MCP 호출 실패: META 에 `"self_check": "FAIL"` + `"self_check_reason"` 명시
- captureId 미수신: `"self_check": "FAIL"` + sleep/retry 안 함 (parent reject)

[Self-Check] PASS / 미충족: 없음
