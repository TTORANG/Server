import { CommentNotFoundError } from "../errors/comment.error.js";
import { InvalidParameterError } from "../errors/video.error.js";
import { createComment, findCommentById } from "../repositories/comment.repository.js";
import { findReplies } from "../repositories/reply.repository.js";

// 답글 작성
export const createCommentReply = async ({ parentCommentId, content, userId }) => {
  if (!content) {
    throw new InvalidParameterError({ content });
  }

  const parent = await findCommentById(parentCommentId);

  if (!parent || parent.isDeleted) {
    throw new CommentNotFoundError({ commentId: String(parentCommentId) });
  }

  if (parent.parentId) {
    throw new InvalidParameterError(
      { parentCommentId: String(parentCommentId) },
      "답글에는 답글을 달 수 없습니다."
    );
  }

  return createComment({
    userId,
    targetType: parent.targetType,
    targetId: parent.targetId,
    parentId: parentCommentId,
    content,
  });
};

// 답글 목록 조회
export const getRepliesByParentId = async (parentCommentId) => {
  const parent = await findCommentById(parentCommentId);

  if (!parent || parent.isDeleted) {
    throw new CommentNotFoundError({ commentId: String(parentCommentId) });
  }

  return findReplies(parentCommentId);
};
