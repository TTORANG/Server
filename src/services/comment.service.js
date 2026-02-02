import { prisma } from "../db.config.js";
import { AuthSessionRequiredError } from "../errors/auth.error.js";
import {
  CommentListFetchFailedError,
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
  findCommentsBySlideId,
  findVideoCommentsByTimestamp,
  softDeleteComment,
  updateCommentContent,
} from "../repositories/comment.repository.js";
import { getSlideWithProject } from "../repositories/slide.repository.js";

// 댓글 작성
export const createSlideComment = async ({ slideId, content, userId }) => {
  if (slideId === undefined || slideId === null || typeof slideId !== "bigint" || slideId <= 0n) {
    throw new InvalidSlideIdError(slideId?.toString());
  }

  if (!content || !content.trim()) {
    throw new EmptyCommentContentError();
  }

  // slide → project 조회
  const slide = await getSlideWithProject(slideId);
  if (!slide) {
    throw new SlideNotFoundError(slideId?.toString());
  }

  //권한 체크 (프로젝트 소유자 기준)
  if (slide.project.userId !== userId) {
    throw new NoCommentPermissionError();
  }

  return createComment({
    userId,
    targetType: "slide",
    targetId: slideId,
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

// 댓글 목록 조회
export const getSlideComments = async ({ slideId, userId, page = 1, limit = 20 }) => {
  // slideId 검증
  if (slideId === undefined || slideId === null || typeof slideId !== "bigint" || slideId <= 0n) {
    throw new InvalidSlideIdError(slideId?.toString());
  }

  // userId 검증
  if (userId === undefined || userId === null) {
    throw new NoCommentPermissionError();
  }

  const project = await prisma.project.findFirst({
    where: {
      slides: {
        some: { id: slideId },
      },
      userId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!project) {
    throw new NoCommentPermissionError();
  }

  // pagination 보정
  const safePage = Math.max(1, Number(page));
  const safeLimit = Math.min(50, Math.max(1, Number(limit)));

  const skip = (safePage - 1) * safeLimit;

  try {
    const { items, total } = await findCommentsBySlideId({
      slideId,
      skip,
      take: safeLimit,
    });

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  } catch (e) {
    throw new CommentListFetchFailedError(slideId?.toString());
  }
};

// 영상 타임스탬프 댓글 생성
export async function createVideoComment({ videoId, content, timestampMs, userId }) {
  const vid = BigInt(videoId);
  const ts = timestampMs !== undefined && timestampMs !== null ? Number(timestampMs) : null;

  if (vid <= 0n) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }
  if (!content || !content.trim()) {
    throw new InvalidParameterError({ content }, "댓글 내용은 비워둘 수 없습니다.");
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
  }

  const video = await prisma.video.findFirst({
    where: { id: vid, deletedAt: null },
    select: { id: true, projectId: true },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const comment = await prisma.comment.create({
    data: {
      userId,
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

  return comment;
}

// 시간대별 댓글 조회
export const getVideoCommentsByTimestamp = async ({
  videoId,
  timestampMs,
  windowMs = 10000, // 10초
  userId,
}) => {
  const vid = BigInt(videoId);
  const ts = Number(timestampMs);

  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "timestampMs 오류");
  }

  const video = await prisma.video.findFirst({
    where: {
      id: vid,
      deletedAt: null,
      project: {
        userId,
        isDeleted: false,
      },
    },
    select: { id: true },
  });

  if (!video) {
    const videoExists = await prisma.video.findFirst({
      where: { id: vid, deletedAt: null },
      select: { id: true },
    });
    if (!videoExists) {
      throw new VideoNotFoundError({ videoId: String(videoId) });
    } else {
      throw new NoCommentPermissionError();
    }
  }

  return findVideoCommentsByTimestamp({
    videoId: vid,
    fromMs: Math.floor(ts / windowMs) * windowMs,
    toMs: Math.floor(ts / windowMs) * windowMs + windowMs,
  });
};
