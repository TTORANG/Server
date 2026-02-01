import { prisma } from "../db.config.js";
import { AuthSessionRequiredError } from "../errors/auth.error.js";
import {
  CommentNotFoundError,
  EmptyCommentContentError,
  InvalidCommentIdError,
  InvalidSlideIdError,
  NoCommentPermissionError,
  SlideNotFoundError,
} from "../errors/comment.error.js";
import { InvalidParameterError, VideoNotFoundError } from "../errors/video.error.js";
import eventBus from "../events/eventBus.js";
import { EventTypes } from "../events/eventTypes.js";
import {
  createComment,
  findCommentById,
  softDeleteComment,
  updateCommentContent,
} from "../repositories/comment.repository.js";
import { getSlideWithProject } from "../repositories/slide.repository.js";

// 댓글 작성
export const createSlideComment = async ({ slideId, content, userId }) => {
  if (slideId === undefined || slideId === null || typeof slideId !== "bigint" || slideId <= 0n) {
    throw new InvalidSlideIdError(slideId?.toString());
  }

  if (!content) {
    throw new EmptyCommentContentError();
  }

  const slide = await getSlideWithProject(slideId);
  if (!slide) {
    throw new SlideNotFoundError(slideId);
  }

  return createComment({
    userId,
    targetType: "slide",
    targetId: BigInt(slideId),
    content,
  });
};

// 댓글 수정
export const updateComment = async ({ commentId, content, userId }) => {
  if (
    commentId === undefined ||
    commentId === null ||
    typeof commentId !== "bigint" ||
    commentId <= 0n
  ) {
    throw new InvalidCommentIdError(commentId?.toString());
  }

  if (!content) {
    throw new EmptyCommentContentError();
  }

  const comment = await findCommentById(commentId);
  if (!comment) {
    throw new CommentNotFoundError(commentId);
  }

  if (comment.userId !== userId) {
    throw new NoCommentPermissionError();
  }

  return updateCommentContent(commentId, content);
};

// 댓글 삭제
export const deleteComment = async ({ commentId, userId }) => {
  if (
    commentId === undefined ||
    commentId === null ||
    typeof commentId !== "bigint" ||
    commentId <= 0n
  ) {
    throw new InvalidCommentIdError(commentId?.toString());
  }

  const comment = await findCommentById(commentId);
  if (!comment) {
    throw new CommentNotFoundError(commentId);
  }

  if (comment.userId !== userId) {
    throw new NoCommentPermissionError();
  }

  await softDeleteComment(commentId);
};

// 영상 타임스탬프 댓글 생성
export async function createVideoComment({ videoId, content, timestampMs, userId, sessionId }) {
  if (!sessionId) {
    throw new AuthSessionRequiredError({
      userId: String(userId),
      videoId: String(videoId),
    });
  }

  const vid = toInt(videoId);
  const ts = toInt(timestampMs);

  if (!Number.isInteger(vid) || vid <= 0) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }
  if (!content || !content.trim()) {
    throw new InvalidParameterError({ content }, "댓글 내용은 비워둘 수 없습니다.");
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
  }

  const video = await prisma.video.findFirst({
    where: {
      id: vid,
      deletedAt: null,
    },
    select: { id: true, projectId: true },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const comment = await prisma.comment.create({
    data: {
      userId,
      sessionId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      content,
    },
    select: {
      id: true,
      content: true,
      timestampMs: true,
      createdAt: true,
    },
  });

  // 실시간 알림을 위한 이벤트 발행
  await eventBus.publish(EventTypes.COMMENT_CREATED, {
    commentId: comment.id,
    projectId: video.projectId,
    videoId: vid,
    userId,
    content: comment.content,
    timestampMs: comment.timestampMs,
    createdAt: comment.createdAt,
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      id: comment.id.toString(),
      content: comment.content,
      timestampMs: comment.timestampMs,
      createdAt: comment.createdAt,
    },
  };
}
