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
