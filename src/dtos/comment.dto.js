export const createSlideCommentRequestDTO = (body) => {
  return {
    content: body.content?.trim(),
  };
};

export const commentResponseDTO = (comment) => ({
  id: comment.id?.toString(),
  content: comment.content,
  userId: comment.userId?.toString(),
  createdAt: comment.createdAt,
});

export const commentListItemDTO = (comment) => ({
  id: comment.id.toString(),
  content: comment.content,
  user: {
    id: comment.user.id.toString(),
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
