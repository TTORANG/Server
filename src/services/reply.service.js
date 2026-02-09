import { CommentNotFoundError } from "../errors/comment.error.js";
import { InvalidParameterError } from "../errors/video.error.js";
import eventBus from "../events/eventBus.js";
import { EventTypes } from "../events/eventTypes.js";
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

  const reply = await createComment({
    projectId: parent.projectId ?? null,
    userId,
    targetType: parent.targetType,
    targetId: parent.targetId,
    parentId: parentCommentId,
    content,
  });

  const targetPayload =
    parent.targetType === "slide"
      ? { slideId: parent.targetId }
      : parent.targetType === "video"
        ? { videoId: parent.targetId }
        : {};

  await eventBus.publish(EventTypes.COMMENT_CREATED, {
    commentId: reply.id,
    projectId: parent.projectId,
    userId,
    content: reply.content,
    createdAt: reply.createdAt,
    parentCommentId: parentCommentId,
    ...targetPayload,
  });

  return reply;
};

// 답글 목록 조회
export const getRepliesByParentId = async (parentCommentId) => {
  const parent = await findCommentById(parentCommentId);

  if (!parent || parent.isDeleted) {
    throw new CommentNotFoundError({ commentId: String(parentCommentId) });
  }

  return findReplies(parentCommentId);
};
