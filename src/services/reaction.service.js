import { ALLOWED_EMOJIS } from "../constants/reaction.js";
import {
  projectSlideReactionSummaryResponseDTO,
  slideReactionSummaryResponseDTO,
  videoReactionToggleResponseDTO,
} from "../dtos/reaction.dto.js";
import { BaseError } from "../errors/base.error.js";
import { ProjectNotFoundError } from "../errors/project.error.js";
import {
  InvalidEmojiTypeError,
  InvalidReactionParameterError,
  ReactionProcessError,
  SlideNotFoundError,
} from "../errors/reaction.error.js";
import { InvalidParameterError, VideoNotFoundError } from "../errors/video.error.js";
import eventBus from "../events/eventBus.js";
import { EventTypes } from "../events/eventTypes.js";
import {
  aggregateVideoReactionsByBucket,
  aggregateVideoReactionsByTimeWindow,
  countProjectSlideReactionsBySlideIds,
  countSlideReactions,
  createReaction,
  createVideoReaction,
  findProjectWithSlides,
  findReaction,
  findSlideById,
  findVideoReaction,
  updateReaction,
  updateReactionIsDeleted,
} from "../repositories/reaction.repository.js";
import { findVideoByIdWithProject } from "../repositories/video.repository.js";

// 리액션 추가 및 취소
export async function toggleSlideReaction({ slideId, emojiType, userId }) {
  if (!ALLOWED_EMOJIS.includes(emojiType)) {
    throw new InvalidEmojiTypeError({ emojiType });
  }

  const slide = await findSlideById(slideId);
  if (!slide) {
    throw new SlideNotFoundError({ slideId });
  }

  const where = {
    userId,
    sessionId: null,
    targetType: "slide",
    targetId: BigInt(slideId),
    timestampMs: null,
    emojiType,
  };

  try {
    const existing = await findReaction(where);

    if (existing) {
      const newIsDeleted = !existing.isDeleted;
      await updateReaction(existing.id, newIsDeleted);
      return { active: !newIsDeleted };
    }

    await createReaction(where);
    return { active: true };
  } catch (e) {
    if (e instanceof BaseError) throw e;
    console.error("[toggleSlideReaction error]", e);
    throw new ReactionProcessError({ slideId, emojiType });
  }
}

// 리액션 집계 조회
export async function getSlideReactionSummary({ slideId }) {
  const slide = await findSlideById(slideId);
  if (!slide) throw new SlideNotFoundError({ slideId });

  const rows = await countSlideReactions(slideId);

  return slideReactionSummaryResponseDTO({
    slideId,
    rows,
  });
}

// 영상 타임스탬프 리액션 생성
export async function toggleVideoReaction({ videoId, emojiType, timestampMs, userId }) {
  let vid;
  try {
    vid = BigInt(videoId);
  } catch {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  const ts = timestampMs !== undefined && timestampMs !== null ? Number(timestampMs) : null;

  if (vid <= 0n) {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  if (!emojiType || typeof emojiType !== "string") {
    throw new InvalidParameterError({ emojiType }, "잘못된 이모지 타입입니다.");
  }
  if (!ALLOWED_EMOJIS.includes(emojiType)) {
    throw new InvalidEmojiTypeError({ emojiType });
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
  }

  const video = await findVideoByIdWithProject(vid);

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const existing = await findVideoReaction({
    userId,
    videoId: vid,
    timestampMs: ts,
    emojiType,
  });

  if (existing) {
    const isDeleted = !existing.isDeleted;

    const updated = await updateReactionIsDeleted(existing.id, isDeleted);

    if (isDeleted) {
      await eventBus.publish(EventTypes.REACTION_REMOVED, {
        reactionId: updated.id,
        projectId: video.projectId,
        videoId: vid,
      });
    } else {
      await eventBus.publish(EventTypes.REACTION_ADDED, {
        reactionId: updated.id,
        projectId: video.projectId,
        videoId: vid,
        userId,
        emoji: emojiType,
        timestampMs: ts,
      });
    }

    return videoReactionToggleResponseDTO({
      reactionId: updated.id,
      videoId: vid,
      active: !isDeleted,
    });
  }

  const created = await createVideoReaction({
    userId,
    videoId: vid,
    timestampMs: ts,
    emojiType,
  });

  await eventBus.publish(EventTypes.REACTION_ADDED, {
    reactionId: created.id,
    projectId: video.projectId,
    videoId: vid,
    userId,
    emoji: emojiType,
    timestampMs: ts,
  });

  return videoReactionToggleResponseDTO({
    reactionId: created.id,
    videoId: vid,
    active: true,
  });
}

// 영상 리액션 집계
export const getReactionMarkers = async ({ videoId, intervalMs }) => {
  let vid;
  try {
    vid = BigInt(videoId);
  } catch {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  if (vid <= 0n) {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  // interval 검증
  const safeInterval =
    intervalMs === undefined || intervalMs === null ? 5000 : Number(intervalMs);
  if (!Number.isInteger(safeInterval) || safeInterval <= 0) {
    throw new InvalidParameterError({ intervalMs });
  }
  // video 존재 검증
  const video = await findVideoByIdWithProject(vid);
  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  // 집계 로우: (bucketMs, emojiType, count)
  const rows = await aggregateVideoReactionsByBucket({
    videoId: vid,
    intervalMs: safeInterval,
  });

  // bucket별 대표 emoji 선택
  const byBucket = new Map();
  for (const r of rows) {
    const bucketMs = Number(r.bucketMs);
    const current = byBucket.get(bucketMs);
    if (!current || r.count > current.count) {
      byBucket.set(bucketMs, {
        timestampMs: bucketMs,
        emojiType: r.emojiType,
        count: Number(r.count),
      });
    }
  }

  const markers = [...byBucket.values()].sort((a, b) => a.timestampMs - b.timestampMs);

  return { intervalMs: safeInterval, markers };
};

// 시간대별 리액션 조회
export const getVideoReactionsByTime = async ({
  videoId,
  timestampMs,
  windowMs,
}) => {
  let vid;
  try {
    vid = BigInt(videoId);
  } catch {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  if (vid <= 0n) {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }

  const ts = Number(timestampMs);
  const safeWindowMs =
    windowMs === undefined || windowMs === null ? 2000 : Number(windowMs);

  const video = await findVideoByIdWithProject(vid);
  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs });
  }
  if (!Number.isInteger(safeWindowMs) || safeWindowMs < 0) {
    throw new InvalidParameterError({ windowMs });
  }

  const startMs = Math.max(0, ts - safeWindowMs);
  const endMs = ts + safeWindowMs;

  const rows = await aggregateVideoReactionsByTimeWindow({
    videoId: vid,
    startMs,
    endMs,
  });

  return rows.map((r) => ({
    emojiType: r.emojiType,
    count: r._count._all,
  }));
};

function parsePositiveBigIntParam(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    throw new InvalidReactionParameterError({ [fieldName]: value });
  }

  let parsed;
  try {
    parsed = BigInt(value);
  } catch (e) {
    throw new InvalidReactionParameterError({ [fieldName]: value });
  }

  if (parsed <= 0n) {
    throw new InvalidReactionParameterError({ [fieldName]: value });
  }

  return parsed;
}

// 프로젝트 모든 리액션 집계 조회
export async function getProjectSlidesReactionSummary({ projectId }) {
  const projectIdBigInt = parsePositiveBigIntParam(projectId, "projectId");

  const project = await findProjectWithSlides(projectIdBigInt);
  if (!project) {
    throw new ProjectNotFoundError({ projectId: projectIdBigInt.toString() });
  }

  const slideIds = project.slides.map((s) => s.id);
  const rows = await countProjectSlideReactionsBySlideIds(slideIds);

  return projectSlideReactionSummaryResponseDTO({
    projectId: project.id,
    rows,
  });
}
