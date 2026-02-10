import { ALLOWED_EMOJIS } from "../constants/reaction.js";
import {
  projectSlideReactionSummaryResponseDTO,
  slideReactionCreateResponseDTO,
  slideReactionSummaryResponseDTO,
  videoReactionCreateResponseDTO,
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
  createVideoReaction,
  createReaction,
  findProjectWithSlides,
  findSlideById,
} from "../repositories/reaction.repository.js";
import { findVideoByIdWithProject } from "../repositories/video.repository.js";

const VIDEO_REACTION_WINDOW_MS = 100;
const VIDEO_REACTION_MAX_REQUESTS = 1;
const reactionRateLimitStore = new Map();

async function publishSlideReactionEvent({
  reactionId,
  projectId,
  slideId,
  userId,
  emojiType,
}) {
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
    active: true,
  };

  await eventBus.publish(EventTypes.REACTION_ADDED, payload);
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

  enforceReactionRateLimit({
    userId,
    targetKey: `slide:${slideId}`,
  });

  try {
    const createdReaction = await createReaction({
      userId,
      sessionId: null,
      targetType: "slide",
      targetId: BigInt(slideId),
      timestampMs: null,
      emojiType,
      projectId: slide.projectId,
    });

    await publishSlideReactionEvent({
      reactionId: createdReaction.id,
      projectId: slide.projectId,
      slideId,
      userId,
      emojiType,
    });

    return slideReactionCreateResponseDTO({
      reactionId: createdReaction.id,
      slideId,
      emojiType,
      createdAt: createdReaction.createdAt,
    });
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
export async function createVideoReactionEvent({ videoId, emojiType, timestampMs, userId }) {
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

  enforceReactionRateLimit({
    userId,
    targetKey: `video:${vid.toString()}`,
  });

  const video = await findVideoByIdWithProject(vid);

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const created = await createVideoReaction({
    userId,
    videoId: vid,
    projectId: video.projectId,
    timestampMs: ts,
    emojiType,
  });

  await eventBus.publish(EventTypes.REACTION_ADDED, {
    reactionId: created.id,
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

  return videoReactionCreateResponseDTO({
    reactionId: created.id,
    videoId: vid,
    emojiType,
    timestampMs: ts,
    createdAt: created.createdAt,
  });
}

function enforceReactionRateLimit({ userId, targetKey }) {
  const now = Date.now();
  const key = `${userId}:${targetKey}`;
  const history = reactionRateLimitStore.get(key) ?? [];
  const nextHistory = history.filter((t) => now - t < VIDEO_REACTION_WINDOW_MS);

  if (nextHistory.length >= VIDEO_REACTION_MAX_REQUESTS) {
    throw new InvalidParameterError(
      {
        limit: VIDEO_REACTION_MAX_REQUESTS,
        windowMs: VIDEO_REACTION_WINDOW_MS,
      },
      "리액션 요청은 100ms당 1회만 가능합니다."
    );
  }

  nextHistory.push(now);
  reactionRateLimitStore.set(key, nextHistory);
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
