/**
 * 이벤트 타입 상수 정의
 * Pub/Sub에서 사용하는 이벤트 채널명
 */

export const EventTypes = {
  // ========== 댓글 관련 ==========
  COMMENT_CREATED: "comment:created", // 댓글 생성
  COMMENT_UPDATED: "comment:updated", // 댓글 수정
  COMMENT_DELETED: "comment:deleted", // 댓글 삭제

  // ========== 리액션 관련 ==========
  REACTION_ADDED: "reaction:added", // 리액션 추가
  REACTION_REMOVED: "reaction:removed", // 리액션 제거
  REACTION_COUNT_UPDATED: "reaction:count-updated", // 리액션 카운트 갱신
};
