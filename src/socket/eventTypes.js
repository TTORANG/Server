export const SocketEvents = {
  // ========== 클라이언트 → 서버 ==========
  JOIN_PROJECT: "join-project", // 프로젝트 Room 입장
  LEAVE_PROJECT: "leave-project", // 프로젝트 Room 퇴장
  GET_ROOMS: "get-rooms", // 참여 중인 Room 목록 조회

  // ========== 서버 → 클라이언트 ==========
  // Room 관련
  JOINED_PROJECT: "joined-project", // 프로젝트 입장 확인
  LEFT_PROJECT: "left-project", // 프로젝트 퇴장 확인
  ROOMS_LIST: "rooms-list", // Room 목록 응답

  // 댓글 관련
  NEW_COMMENT: "new-comment", // 새 댓글 알림
  COMMENT_UPDATED: "comment-updated", // 댓글 수정됨
  COMMENT_DELETED: "comment-deleted", // 댓글 삭제됨

  // 리액션 관련
  NEW_REACTION: "new-reaction", // 새 리액션 알림
  REACTION_REMOVED: "reaction-removed", // 리액션 제거됨
  REACTION_COUNT_UPDATED: "reaction-count-updated", // 리액션 카운트 갱신

  // 에러
  ERROR: "error", // 에러 발생
};
