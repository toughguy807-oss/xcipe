# Bridge server 디버깅 노트

`bridge-server.js` 의 `http://localhost:3939/preview/` 가 느리거나 무한 로딩에 빠질 때 참조. 2026-05-15 디버깅 세션 결과 정리 — bridge-server.js 에 영구 수정 반영 완료.

## 증상

- 처음엔 "목록에서 파일 클릭 후 이동이 느림"
- 점점 "단일 페이지에서 무한 로딩"
- 결국 "3-4 페이지 navigation 후 새 요청이 영영 Pending"

증상은 하나처럼 보였지만 **서로 다른 4 개 원인이 누적**돼 있었다. 한 겹씩 벗기면서 진짜 원인이 드러나는 구조.

## 4 단계 원인

| # | 원인 | 증상 | 결정적 증거 |
|---|---|---|---|
| 1 | 서버가 `127.0.0.1` 에만 listen — 브라우저 `localhost` 가 IPv6 `::1` 먼저 시도하다 폴백 | 모든 요청에 +200ms 균일 페널티 | `curl 127.0.0.1:3939` 13ms vs `curl localhost:3939` 214ms |
| 2 | `/preview-list` 가 매 navigation 마다 동기 `readdir + stat × N` | 추가 누적 지연 (Windows 백신 후킹 환경에서 특히) | 캐시 도입 후 첫 호출 30ms, 이후 7-13ms |
| 3 | Node 기본 `keepAliveTimeout = 5s` < 브라우저 idle | 30s+ 머문 후 navigation 시 dead conn 재사용 → request 가 void 로 | `netstat` 의 `CLOSE_WAIT` 누적 |
| 4 | **(진짜 원인)** 브라우저가 page unload 시 `EventSource` 자동 cleanup 누락. 서버는 FIN 못 받아 좀비 SSE 가 65s (keepAlive timeout) 까지 살아있음 | **3-4 페이지 navigation 후 무한 로딩.** 브라우저 HTTP/1.1 origin-당-6-연결 한도 초과 | `/diag` 에서 `sseClients=7`, 이전 SSE 들이 62613ms 후에야 `aborted` |

## 적용한 수정 (`bridge-server.js` 에 영구 반영)

| 영역 | 변경 | 무엇을 막는가 |
|---|---|---|
| `server.listen` | IPv4 (`127.0.0.1`) + IPv6 (`::1`) loopback 동시 바인딩 | #1 |
| `listHtmlRels()` / `listHtmlFiles()` | in-memory 캐시 + chokidar 가 HTML add/unlink/change 시 무효화 | #2 |
| `applyKeepAliveTuning` | `keepAliveTimeout=65s`, `headersTimeout=66s` | #3 race 차단 |
| 모든 일반 응답 헤더 | `Connection: close` 추가 (SSE 만 keep-alive 유지) | #3 변수 자체 제거 |
| `LIVE_RELOAD_SNIPPET` 클라이언트 | `pagehide` 에 `es.close()` 명시 + iframe SSE 가드 + `window.load` 이후 SSE 시작 | #4 좀비 발생 자체 차단 |
| SSE 핸들러 서버 | ping 5s 주기 + `res.writable` 체크 + write 실패 즉시 `cleanup()` + `socket.destroy()` | #4 안전망 (그래도 좀비 생기면 5s 안 회수) |

## 영구화된 진단 도구

다음 회 재발 시 즉시 사용. 모두 `bridge-server.js` 안에 박혀있음.

### `/diag` 엔드포인트

```bash
curl http://localhost:3939/diag
```

반환 필드:
- `sseClients` — **2 초과면 좀비 누적 의심**. 정상은 페이지당 1
- `totalRequests` — 누적 요청 수
- `activePreview` — 현재 브라우저가 보고 있다고 보고한 파일
- `injectInProgress` — auto-inject 체인 진행 중인 타겟 (오래 차있으면 hang)
- `uptimeSec`, `pid`, `nodeVersion`

### 요청 lifecycle 로깅

```bash
# 시작 시 켜기
BRIDGE_TRACE=1 node bridge-server.js

# 동작 중 토글 (POSIX)
kill -USR1 <pid>
```

로그 포맷:
```
[req#N] ← METHOD path (sock IP:PORT)
[req#N] → status ended|aborted after Nms
[sse] connect — clients=N
[sse] disconnect (req-close|res-close|write-error|not-writable) — clients=N
```

### OS 레벨 연결 상태

```bash
netstat -ano | grep :3939
```

신호 해석:
- `CLOSE_WAIT` 누적 → keep-alive race (서버가 닫았는데 브라우저는 모름)
- `ESTABLISHED` 가 sseClients 보다 훨씬 많음 → 좀비 SSE 또는 idle keep-alive 잔존

## 향후 재발 시 진단 순서

1. `curl http://localhost:3939/diag` — `sseClients` 확인
2. 비정상이면 `BRIDGE_TRACE=1` 로 재기동 후 사용자에게 재현 요청
3. 로그에서 `[sse] connect` 가 cleanup 없이 누적되는지, 특정 요청이 `ended` 못 가고 `aborted` 되는지 관찰
4. 추측 fix 는 **최대 2 회**. 그 후엔 데이터 확보 모드로 전환 (이 원칙은 메모리에도 저장됨)

## 핵심 교훈

원인 1-3 까지는 가설 기반으로 합당한 수정이었지만 진짜 원인이 아니었다. 4번째 시도에서 비로소 instrumentation 을 깔고 사용자에게 재현을 부탁한 순간 `sseClients=7` 한 줄로 원인이 즉시 보였다.

**2회 가설 fix 가 통하지 않으면 즉시 instrumentation 으로 전환.** 데이터 없이 한 번 더 추측하는 비용보다 진단 도구 깔고 재현 요청하는 비용이 훨씬 싸다.
