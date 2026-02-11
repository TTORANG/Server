import { ALLOWED_EMOJIS, createEmptyReactionMap } from "../constants/reaction.js";
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
  createVideoReaction as createVideoReactionRow,
  createReaction,
  findProjectWithSlides,
  findSlideById,
} from "../repositories/reaction.repository.js";
import { findVideoByIdWithProject } from "../repositories/video.repository.js";
import Redis from "ioredis";

const VIDEO_REACTION_WINDOW_MS = 100;
const VIDEO_REACTION_MAX_REQUESTS = 1;
const REACTION_RATE_LIMIT_EXCEEDED_MESSAGE = `리액션 요청은 ${VIDEO_REACTION_WINDOW_MS}ms당 ${VIDEO_REACTION_MAX_REQUESTS}회만 가능합니다.`;
const reactionRateLimitStore = new Map();
const REACTION_RATE_LIMIT_FALLBACK_CLEANUP_INTERVAL_MS = 30000;
const REACTION_RATE_LIMIT_REDIS_RETRY_INTERVAL_MS = 10000;
const reactionRateLimitRedis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true,
});
let isReactionRateLimitRedisUnavailable = false;
let lastReactionRateLimitRedisRetryAt = 0;
let lastReactionRateLimitFallbackCleanupAt = 0;

async function publishSlideReactionEvent({ reactionId, projectId, slideId, userId, emojiType }) {
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
export async function createSlideReactionEvent({ slideId, emojiType, userId }) {
  if (!ALLOWED_EMOJIS.includes(emojiType)) {
    throw new InvalidEmojiTypeError({ emojiType });
  }

  const slide = await findSlideById(slideId);
  if (!slide) {
    throw new SlideNotFoundError({ slideId });
  }

  await enforceReactionRateLimit({
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
    console.error("[createSlideReactionEvent error]", e);
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
  const video = await findVideoWithValidation(videoId);
  const vid = video.id;
  const ts = timestampMs !== undefined && timestampMs !== null ? Number(timestampMs) : null;

  if (!emojiType || typeof emojiType !== "string") {
    throw new InvalidParameterError({ emojiType }, "잘못된 이모지 타입입니다.");
  }
  if (!ALLOWED_EMOJIS.includes(emojiType)) {
    throw new InvalidEmojiTypeError({ emojiType });
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
  }

  await enforceReactionRateLimit({
    userId,
    targetKey: `video:${vid.toString()}`,
  });

  const created = await createVideoReactionRow({
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


async function enforceReactionRateLimit({ userId, targetKey }) {
  if (VIDEO_REACTION_MAX_REQUESTS === 1) {
    const acquired = await tryAcquireRateLimitLock({
      userId,
      targetKey,
      windowMs: VIDEO_REACTION_WINDOW_MS,
    });
    if (!acquired) {
      throw new InvalidParameterError(
        {
          limit: VIDEO_REACTION_MAX_REQUESTS,
          windowMs: VIDEO_REACTION_WINDOW_MS,
        },
        REACTION_RATE_LIMIT_EXCEEDED_MESSAGE
      );
    }
    return;
  }

  const now = Date.now();
  maybeCleanupFallbackRateLimitStore({ now, windowMs: VIDEO_REACTION_WINDOW_MS });
  const key = `${userId}:${targetKey}`;
  const history = reactionRateLimitStore.get(key) ?? [];
  const nextHistory = history.filter((t) => now - t < VIDEO_REACTION_WINDOW_MS);

  if (nextHistory.length >= VIDEO_REACTION_MAX_REQUESTS) {
    throw new InvalidParameterError(
      {
        limit: VIDEO_REACTION_MAX_REQUESTS,
        windowMs: VIDEO_REACTION_WINDOW_MS,
      },
      REACTION_RATE_LIMIT_EXCEEDED_MESSAGE
    );
  }

  nextHistory.push(now);
  reactionRateLimitStore.set(key, nextHistory);
}

async function tryAcquireRateLimitLock({ userId, targetKey, windowMs }) {
  const key = `reaction:rate-limit:${userId}:${targetKey}`;
  const now = Date.now();

  if (
    isReactionRateLimitRedisUnavailable &&
    now - lastReactionRateLimitRedisRetryAt >= REACTION_RATE_LIMIT_REDIS_RETRY_INTERVAL_MS
  ) {
    isReactionRateLimitRedisUnavailable = false;
    lastReactionRateLimitRedisRetryAt = now;
  }

  if (!isReactionRateLimitRedisUnavailable) {
    try {
      if (reactionRateLimitRedis.status === "wait") {
        await reactionRateLimitRedis.connect();
      }
      const result = await reactionRateLimitRedis.set(key, "1", "PX", windowMs, "NX");
      return result === "OK";
    } catch (error) {
      isReactionRateLimitRedisUnavailable = true;
      lastReactionRateLimitRedisRetryAt = now;
      console.warn("[ReactionRateLimit] Redis unavailable. Falling back to in-memory store.", error);
    }
  }

  maybeCleanupFallbackRateLimitStore({ now, windowMs });
  const fallbackHistory = reactionRateLimitStore.get(key) ?? [];
  const nextHistory = fallbackHistory.filter((t) => now - t < windowMs);
  if (nextHistory.length >= VIDEO_REACTION_MAX_REQUESTS) {
    return false;
  }
  nextHistory.push(now);
  reactionRateLimitStore.set(key, nextHistory);
  return true;
}

function maybeCleanupFallbackRateLimitStore({ now, windowMs }) {
  if (now - lastReactionRateLimitFallbackCleanupAt < REACTION_RATE_LIMIT_FALLBACK_CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [key, history] of reactionRateLimitStore.entries()) {
    const nextHistory = history.filter((t) => now - t < windowMs);
    if (nextHistory.length === 0) {
      reactionRateLimitStore.delete(key);
      continue;
    }
    if (nextHistory.length !== history.length) {
      reactionRateLimitStore.set(key, nextHistory);
    }
  }

  lastReactionRateLimitFallbackCleanupAt = now;
}

function validateVideoTimelineParams({ videoId, intervalMs }) {
  const vid = parsePositiveBigIntWithError(videoId, (value) => new InvalidParameterError({ videoId: value }));

  const safeInterval = intervalMs === undefined || intervalMs === null ? 5000 : Number(intervalMs);
  if (!Number.isInteger(safeInterval) || safeInterval <= 0) {
    throw new InvalidParameterError({ intervalMs });
  }

  return { vid, safeInterval };
}

// 영상 리액션 집계
export const getReactionMarkers = async ({ videoId, intervalMs }) => {
  const { vid, safeInterval } = validateVideoTimelineParams({ videoId, intervalMs });

  await ensureVideoExistsOrThrow(vid);

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

  await ensureVideoExistsOrThrow(vid);

  const rows = await aggregateVideoReactionsByBucket({
    videoId: vid,
    intervalMs: safeInterval,
  });

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
export const getVideoReactionsByTime = async ({ videoId, timestampMs, windowMs }) => {
  const vid = parsePositiveBigIntWithError(videoId, (value) => new InvalidParameterError({ videoId: value }));

  const ts = Number(timestampMs);
  const safeWindowMs = windowMs === undefined || windowMs === null ? 2000 : Number(windowMs);

  await ensureVideoExistsOrThrow(vid);
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

function parsePositiveBigIntWithError(value, createError) {
  const valueAsString = String(value);
  let parsed;
  try {
    parsed = BigInt(value);
  } catch {
    throw createError(valueAsString);
  }
  if (parsed <= 0n) {
    throw createError(valueAsString);
  }
  return parsed;
}

async function ensureVideoExistsOrThrow(videoIdBigInt) {
  const video = await findVideoByIdWithProject(videoIdBigInt);
  if (!video) {
    throw new VideoNotFoundError({ videoId: videoIdBigInt.toString() });
  }
  return video;
}

async function findVideoWithValidation(videoId) {
  const videoIdBigInt = parsePositiveBigIntWithError(videoId, (value) =>
    new InvalidParameterError({ videoId: value })
  );
  const video = await ensureVideoExistsOrThrow(videoIdBigInt);
  return video;
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
