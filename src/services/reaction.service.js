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
  countVideoReactionsByEmoji,
  countProjectSlideReactionsBySlideIds,
  countSlideReactions,
  createReaction,
  findProjectWithSlides,
  findReaction,
  findSlideById,
  findVideoReaction,
  updateReaction,
  upsertVideoReaction,
} from "../repositories/reaction.repository.js";
import { findVideoByIdWithProject } from "../repositories/video.repository.js";

async function publishSlideReactionEvent({
  isActive,
  reactionId,
  projectId,
  slideId,
  userId,
  emojiType,
}) {
  const eventType = isActive ? EventTypes.REACTION_ADDED : EventTypes.REACTION_REMOVED;
  const payload = {
    reactionId,
    projectId,
    targetType: "slide",
    targetId: BigInt(slideId),
    slideId: BigInt(slideId),
    videoId: null,
    timestampMs: null,
    emojiType,
    userId: userId ?? null,
    active: isActive,
  };

  await eventBus.publish(eventType, payload);
}

async function publishVideoReactionCountUpdated({ projectId, videoId }) {
  const rows = await countVideoReactionsByEmoji(videoId);
  const counts = Object.fromEntries(ALLOWED_EMOJIS.map((emoji) => [emoji, 0]));

  for (const row of rows) {
    counts[row.emojiType] = Number(row._count._all);
  }

  const totalCount = Object.values(counts).reduce((sum, current) => sum + current, 0);

  await eventBus.publish(EventTypes.REACTION_COUNT_UPDATED, {
    projectId,
    videoId: BigInt(videoId),
    counts,
    totalCount,
  });
}

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
      const nextActive = !newIsDeleted;

      await publishSlideReactionEvent({
        isActive: nextActive,
        reactionId: existing.id,
        projectId: slide.projectId,
        slideId,
        userId,
        emojiType,
      });

      return { active: nextActive };
    }

    const createdReaction = await createReaction({
      ...where,
      projectId: slide.projectId,
    });

    await publishSlideReactionEvent({
      isActive: true,
      reactionId: createdReaction.id,
      projectId: slide.projectId,
      slideId,
      userId,
      emojiType,
    });

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
export async function toggleVideoReaction({ videoId, emojiType, timestampMs, userId, active }) {
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
    emojiType,
  });

  // active를 주면 명시 상태 적용, 미전달 시 기존 토글 동작을 유지한다.
  if (active !== undefined && typeof active !== "boolean") {
    throw new InvalidParameterError({ active }, "active는 boolean 이어야 합니다.");
  }

  const nextIsDeleted =
    typeof active === "boolean" ? !active : existing ? !existing.isDeleted : false;

  const upserted = await upsertVideoReaction({
    userId,
    videoId: vid,
    projectId: video.projectId,
    timestampMs: ts,
    emojiType,
    isDeleted: nextIsDeleted,
  });

  const prevActive = existing ? !existing.isDeleted : false;
  const nextActive = !nextIsDeleted;

  if (!prevActive && nextActive) {
    await eventBus.publish(EventTypes.REACTION_ADDED, {
      reactionId: upserted.id,
      projectId: video.projectId,
      targetType: "video",
      targetId: vid,
      slideId: null,
      videoId: vid,
      userId: userId ?? null,
      emojiType,
      timestampMs: ts,
      active: true,
    });
    await publishVideoReactionCountUpdated({
      projectId: video.projectId,
      videoId: vid,
    });
  } else if (prevActive && !nextActive) {
    await eventBus.publish(EventTypes.REACTION_REMOVED, {
      reactionId: upserted.id,
      projectId: video.projectId,
      targetType: "video",
      targetId: vid,
      slideId: null,
      videoId: vid,
      userId: userId ?? null,
      emojiType,
      timestampMs: ts,
      active: false,
    });
    await publishVideoReactionCountUpdated({
      projectId: video.projectId,
      videoId: vid,
    });
  }

  return videoReactionToggleResponseDTO({
    reactionId: upserted.id,
    videoId: vid,
    active: nextActive,
  });
}

function validateVideoTimelineParams({ videoId, intervalMs }) {
  let vid;
  try {
    vid = BigInt(videoId);
  } catch {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  if (vid <= 0n) {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }

  const safeInterval =
    intervalMs === undefined || intervalMs === null ? 5000 : Number(intervalMs);
  if (!Number.isInteger(safeInterval) || safeInterval <= 0) {
    throw new InvalidParameterError({ intervalMs });
  }

  return { vid, safeInterval };
}

// 영상 리액션 집계
export const getReactionMarkers = async ({ videoId, intervalMs }) => {
  const { vid, safeInterval } = validateVideoTimelineParams({ videoId, intervalMs });

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

// 영상 버킷별 전체 리액션 집계
export const getReactionBuckets = async ({ videoId, intervalMs }) => {
  const { vid, safeInterval } = validateVideoTimelineParams({ videoId, intervalMs });

  const video = await findVideoByIdWithProject(vid);
  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const rows = await aggregateVideoReactionsByBucket({
    videoId: vid,
    intervalMs: safeInterval,
  });

  const createEmptyReactionMap = () => {
    return Object.fromEntries(ALLOWED_EMOJIS.map((emojiType) => [emojiType, 0]));
  };

  const byBucket = new Map();
  for (const row of rows) {
    const bucketMs = Number(row.bucketMs);
    const count = Number(row.count);

    if (!byBucket.has(bucketMs)) {
      byBucket.set(bucketMs, {
        timestampMs: bucketMs,
        totalCount: 0,
        reactions: createEmptyReactionMap(),
      });
    }

    const bucket = byBucket.get(bucketMs);
    bucket.reactions[row.emojiType] = count;
    bucket.totalCount += count;
  }

  const buckets = [...byBucket.values()].sort((a, b) => a.timestampMs - b.timestampMs);

  return { intervalMs: safeInterval, buckets };
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
