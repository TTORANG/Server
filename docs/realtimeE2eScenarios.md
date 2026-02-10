# Realtime E2E 검증 시나리오

## 목표
comment/reaction 실시간 동기화의 end-to-end 연결을 검증합니다.
- service 이벤트 발행
- EventBus 중계
- socket 브로드캐스트
- payload 스키마 일관성

## 사전 조건
- Server가 실행 중이며 접근 가능해야 합니다.
- 대상 환경에서 Redis가 연결되어 있어야 합니다.
- 유효한 `projectId`가 있어야 합니다.
- 해당 프로젝트에서 comment/reaction 동작을 발생시킬 수 있는 클라이언트/사용자가 있어야 합니다.

## 빠른 실행
Windows (`cmd.exe`):
```bat
set E2E_SERVER_URL=http://localhost:8080
set E2E_PROJECT_ID=<project-id>
set E2E_JWT_TOKEN=<jwt-token>
set E2E_TIMEOUT_MS=120000
npm run e2e:realtime
```

macOS/Linux (`bash`, `zsh` 등):
```bash
export E2E_SERVER_URL=http://localhost:8080
export E2E_PROJECT_ID=<project-id>
export E2E_JWT_TOKEN=<jwt-token>
export E2E_TIMEOUT_MS=120000
npm run e2e:realtime
```

옵션:
- `E2E_SESSION_ID`: 익명 세션 모드로 실행합니다.
- `E2E_EXPECT_EVENTS`: 기대 이벤트를 쉼표로 구분해 직접 지정할 수 있습니다.
  - 기본값:
    - `new-comment`
    - `comment-updated`
    - `comment-deleted`
    - `new-reaction`
    - `reaction-removed`
    - `reaction-count-updated`

## 시나리오 단계
1. `npm run e2e:realtime`를 실행합니다.
2. 대상 프로젝트에서 `comment created`를 발생시킵니다.
3. `comment updated`를 발생시킵니다.
4. `comment deleted`를 발생시킵니다.
5. `reaction added`를 발생시킵니다.
6. `reaction removed`를 발생시킵니다.
7. `video reaction count changed`를 발생시킵니다(또는 video reaction 추가/삭제).
8. 스크립트 결과가 `RESULT: PASS`인지 확인합니다.

## Payload 계약 검증
스크립트는 각 이벤트별 필수 필드/타입을 검증합니다.

- `new-comment`, `comment-updated`, `comment-deleted`
  - `projectId`, `commentId`, `targetType`, `targetId`, `slideId`, `videoId`, `timestampMs`
- `new-reaction`, `reaction-removed`
  - `projectId`, `reactionId`, `targetType`, `targetId`, `slideId`, `videoId`
  - `emojiType`, `timestampMs`, `active`
- `reaction-count-updated`
  - `projectId`, `targetType`, `targetId`, `videoId`, `counts`, `totalCount`

## PASS/FAIL 기준
- PASS:
  - 모든 기대 이벤트를 최소 1회 이상 수신해야 합니다.
  - payload 스키마 오류가 없어야 합니다.
- FAIL:
  - 모든 기대 이벤트를 수신하기 전에 타임아웃이 발생한 경우
  - 이벤트 누락 또는 payload 타입/필드 불일치가 있는 경우
