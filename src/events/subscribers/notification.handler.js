/**
 * 알림 관련 이벤트 핸들러
 * 댓글/리액션 생성 시 알림 처리
 */

/**
 * 새 댓글 생성 시 알림 처리
 * @param {object} data - { commentId, projectId, userId, content }
 */
export const onCommentCreated = async (data) => {
  console.log("[Notification] 새 댓글 알림:", data);

  // TODO: 실제 알림 로직 구현
  // 1. 프로젝트 소유자 조회
  // 2. 알림 DB 저장
  // 3. WebSocket으로 실시간 알림 전송 (W4에서 구현)
};

/**
 * 새 리액션 추가 시 알림 처리
 * @param {object} data - { reactionId, projectId, userId, emoji }
 */
export const onReactionAdded = async (data) => {
  console.log("[Notification] 새 리액션 알림:", data);

  // TODO: 실제 알림 로직 구현
};

/**
 * 댓글 삭제 시 처리
 * @param {object} data - { commentId, projectId }
 */
export const onCommentDeleted = async (data) => {
  console.log("[Notification] 댓글 삭제됨:", data);

  // TODO: 관련 알림 정리 등
};
