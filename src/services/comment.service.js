import {
  CommentListFetchFailedError,
  CommentNotFoundError,
  EmptyCommentContentError,
  InvalidCommentIdError,
  InvalidSlideIdError,
  NoCommentViewPermissionError,
  SlideNotFoundError,
} from "../errors/comment.error.js";
import { InvalidParameterError, VideoNotFoundError } from "../errors/video.error.js";
import {
  createComment,
  createVideoComment as createVideoCommentRepo,
  findAllVideoComments,
  findCommentById,
  findCommentsBySlideId,
  findVideoCommentsByTimestamp,
  softDeleteComment,
  updateCommentContent,
} from "../repositories/comment.repository.js";
import { getSlideWithProject } from "../repositories/slide.repository.js";
import { findVideoByIdWithProject } from "../repositories/video.repository.js";


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

  const comment = await createComment({
    projectId: slide.project.id,
    userId,
    targetType: "slide",
    targetId: slideId,
    content,
  });

  return comment;
};

// 댓글 수정
export const updateComment = async ({ commentId, content }) => {
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

  const updatedComment = await updateCommentContent(commentId, content);

  return updatedComment;
};

// 댓글 삭제
export const deleteComment = async ({ commentId }) => {
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

  await softDeleteComment(commentId);

  return {
    commentId: comment.id,
    parentCommentId: comment.parentId ?? null,
  };
};

// 댓글 목록 조회
export const getSlideComments = async ({ slideId, userId, page = 1, limit = 20 }) => {
  // slideId 검증
  if (slideId === undefined || slideId === null || typeof slideId !== "bigint" || slideId <= 0n) {
    throw new InvalidSlideIdError(slideId?.toString());
  }

  const slide = await getSlideWithProject(slideId);
  if (!slide) {
    throw new SlideNotFoundError(slideId?.toString());
  }

  if (userId === undefined || userId === null) {
    throw new NoCommentViewPermissionError();
  }

  let requesterId;
  try {
    requesterId = typeof userId === "bigint" ? userId : BigInt(userId);
  } catch {
    throw new NoCommentViewPermissionError();
  }

  if (slide.project.userId !== requesterId) {
    throw new NoCommentViewPermissionError();
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

  const video = await findVideoByIdWithProject(vid);
  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const comment = await createVideoCommentRepo({
    projectId: video.projectId,
    userId,
    videoId: vid,
    timestampMs: ts,
    content,
  });

  return comment;
}

// 시간대별 댓글 조회
export const getVideoCommentsByTimestamp = async ({
  videoId,
  timestampMs,
  windowMs = 10000, // 10초
}) => {
  const vid = BigInt(videoId);
  const ts = Number(timestampMs);

  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "timestampMs 오류");
  }

  const videoExists = await findVideoByIdWithProject(vid);
  if (!videoExists) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  return findVideoCommentsByTimestamp({
    videoId: vid,
    fromMs: Math.floor(ts / windowMs) * windowMs,
    toMs: Math.floor(ts / windowMs) * windowMs + windowMs,
  });
};

// 영상 전체 댓글 조회
export const getAllVideoComments = async ({ videoId }) => {
  let vid;
  try {
    vid = BigInt(videoId);
  } catch {
    throw new InvalidParameterError({ videoId }, "videoId가 올바르지 않습니다.");
  }

  if (vid <= 0n) {
    throw new InvalidParameterError({ videoId }, "videoId가 올바르지 않습니다.");
  }

  const videoExists = await findVideoByIdWithProject(vid);
  if (!videoExists) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  return findAllVideoComments({ videoId: vid });
};
