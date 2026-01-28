export const EventTypes = {
  // ========== 댓글 관련 ==========
  COMMENT_CREATED: "comment:created", // 댓글 생성
  COMMENT_UPDATED: "comment:updated", // 댓글 수정
  COMMENT_DELETED: "comment:deleted", // 댓글 삭제

  // ========== 리액션 관련 ==========
  REACTION_ADDED: "reaction:added", // 리액션 추가
  REACTION_REMOVED: "reaction:removed", // 리액션 제거

  // ========== 분석/추적 관련 ==========
  ANALYTICS_PAGEVIEW: "analytics:pageview", // 페이지 조회 기록
  ANALYTICS_SLIDE_VIEW: "analytics:slide-view", // 슬라이드 조회 기록
  ANALYTICS_VIDEO_EVENT: "analytics:video-event", // 영상 재생 이벤트
  ANALYTICS_EXIT: "analytics:exit", // 이탈 지점 기록

  // ========== 프로젝트 관련 ==========
  PROJECT_UPDATED: "project:updated", // 프로젝트 업데이트
};
