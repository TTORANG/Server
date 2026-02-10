export function buildCommentTargetPayload(comment) {
  if (comment.targetType === "slide") {
    return {
      targetType: "slide",
      targetId: comment.targetId,
      slideId: comment.targetId,
      videoId: null,
      timestampMs: null,
    };
  }

  if (comment.targetType === "video") {
    return {
      targetType: "video",
      targetId: comment.targetId,
      slideId: null,
      videoId: comment.targetId,
      timestampMs: comment.timestampMs ?? null,
    };
  }

  return {
    targetType: null,
    targetId: null,
    slideId: null,
    videoId: null,
    timestampMs: null,
  };
}
