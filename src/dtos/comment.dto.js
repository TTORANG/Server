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

export const commentListItemDTO = (comment) => ({
  commentId: comment.id.toString(),
  content: comment.content,
  user: {
    userId: comment.user.id.toString(),
    nickName: comment.user.nickName,
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

export const videoCommentListItemDTO = (comment) => ({
  commentId: comment.id.toString(),
  content: comment.content,
  timestampMs: comment.timestampMs,
  user: {
    userId: comment.user.id.toString(),
    nickName: comment.user.nickName,
  },
  createdAt: comment.createdAt,
});

export const videoCommentListResponseDTO = (comments) => ({
  comments: comments.map(videoCommentListItemDTO),
});

export const videoCommentResponseDTO = (comment) => ({
  id: comment.id.toString(),
  content: comment.content,
  timestampMs: comment.timestampMs,
  createdAt: comment.createdAt,
});
