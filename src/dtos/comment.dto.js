export const createSlideCommentRequestDTO = (body) => {
  return {
    content: body.content?.trim(),
  };
};

export const commentResponseDTO = (comment) => ({
  commentId: comment.id?.toString(),
  content: comment.content,
  userId: comment.userId?.toString(),
  createdAt: comment.createdAt,
});

export const updateCommentResponseDTO = (comment) => {
  const baseResponse = {
    content: comment.content,
    userId: comment.userId?.toString(),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };

  if (comment.parentId) {
    return {
      ...baseResponse,
      updatedTargetType: "reply",
      parentCommentId: comment.parentId.toString(),
      replyId: comment.id.toString(),
    };
  }

  return {
    ...baseResponse,
    updatedTargetType: "comment",
    commentId: comment.id.toString(),
  };
};

export const commentListItemDTO = (comment) => ({
  commentId: comment.id.toString(),
  content: comment.content,
  user: {
    userId: comment.user?.id?.toString() ?? null,
    nickName: comment.user?.nickName ?? null,
  },
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

export const commentListResponseDTO = ({ items, pagination }) => ({
  comments: items.map(commentListItemDTO),
  pagination,
});

export const createCommentReplyRequestDTO = (body) => {
  return {
    content: typeof body?.content === "string" ? body.content.trim() : "",
  };
};

export const replyCreateResponseDTO = (reply) => ({
  parentCommentId: reply.parentId?.toString(),
  replyId: reply.id?.toString(),
  content: reply.content,
  userId: reply.userId?.toString(),
  createdAt: reply.createdAt,
});

export const videoCommentListItemDTO = (comment) => ({
  commentId: comment.id.toString(),
  content: comment.content,
  timestampMs: comment.timestampMs,
  user: {
    userId: comment.user?.id?.toString() ?? null,
    nickName: comment.user?.nickName ?? null,
  },
  createdAt: comment.createdAt,
});

export const videoCommentListResponseDTO = (comments) => ({
  comments: comments.map(videoCommentListItemDTO),
});

export const videoCommentResponseDTO = (comment) => ({
  commentId: comment.id.toString(),
  content: comment.content,
  timestampMs: comment.timestampMs,
  createdAt: comment.createdAt,
});

export const deleteCommentResponseDTO = ({ commentId, parentCommentId }) => {
  if (parentCommentId) {
    return {
      deletedTargetType: "reply",
      parentCommentId: parentCommentId.toString(),
      replyId: commentId.toString(),
    };
  }

  return {
    deletedTargetType: "comment",
    commentId: commentId.toString(),
  };
};
