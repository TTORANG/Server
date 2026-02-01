import { prisma } from "../db.config.js";
import { BaseError } from "../errors/base.error.js";
import {
  InvalidEmojiTypeError,
  ReactionProcessError,
  SlideNotFoundError,
} from "../errors/reaction.error.js";
import { InvalidParameterError, VideoNotFoundError } from "../errors/video.error.js";
import eventBus from "../events/eventBus.js";
import { EventTypes } from "../events/eventTypes.js";
import {
  aggregateVideoReactionsByBucket,
  aggregateVideoReactionsByTimeWindow,
  countSlideReactions,
  createReaction,
  findReaction,
  findSlideByIdWithOwner,
  updateReaction,
} from "../repositories/reaction.repository.js";
import { findVideoById, findVideoByIdWithOwner } from "../repositories/video.repository.js";

const ALLOWED_EMOJIS = ["thumbs_up", "heart", "eyes", "clap"];

// 리액션 추가 및 취소
export async function toggleSlideReaction({ slideId, emojiType, userId }) {
  if (!ALLOWED_EMOJIS.includes(emojiType)) {
    throw new InvalidEmojiTypeError({ emojiType });
  }

  const slide = await findSlideByIdWithOwner(slideId, userId);
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
export async function getSlideReactionSummary({ slideId, userId }) {
  const slide = await findSlideByIdWithOwner(slideId, userId);
  if (!slide) throw new SlideNotFoundError({ slideId });

  const rows = await countSlideReactions(slideId);

  // 기본값 0 세팅
  const summary = {};
  ALLOWED_EMOJIS.forEach((e) => (summary[e] = 0));

  rows.forEach((r) => {
    summary[r.emojiType] = r._count._all;
  });

  return summary;
}

// 영상 타임스탬프 리액션 생성
export async function toggleVideoReaction({ videoId, emojiType, timestampMs, userId }) {
  const vid = BigInt(videoId);
  const ts = timestampMs !== undefined && timestampMs !== null ? Number(timestampMs) : null;

  if (vid <= 0n) {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  if (!emojiType || typeof emojiType !== "string") {
    throw new InvalidParameterError({ emojiType }, "잘못된 이모지 타입입니다.");
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
  }

  const video = await findVideoByIdWithOwner(vid, userId);

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const existing = await prisma.reaction.findFirst({
    where: {
      userId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      emojiType,
    },
  });

  if (existing) {
    const newIsDeleted = !existing.isDeleted;

    await prisma.reaction.update({
      where: { id: existing.id },
      data: { isDeleted: newIsDeleted },
    });

    // 실시간 알림을 위한 이벤트 발행
    if (newIsDeleted) {
      await eventBus.publish(EventTypes.REACTION_REMOVED, {
        reactionId: existing.id,
        projectId: video.projectId,
        videoId: vid,
      });
    } else {
      await eventBus.publish(EventTypes.REACTION_ADDED, {
        reactionId: existing.id,
        projectId: video.projectId,
        videoId: vid,
        userId,
        emoji: emojiType,
        timestampMs: ts,
      });
    }

    return { active: !newIsDeleted };
  }

  const reaction = await prisma.reaction.create({
    data: {
      userId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      emojiType,
    },
  });

  // 실시간 알림을 위한 이벤트 발행
  await eventBus.publish(EventTypes.REACTION_ADDED, {
    reactionId: reaction.id,
    projectId: video.projectId,
    videoId: vid,
    userId,
    emoji: emojiType,
    timestampMs: ts,
  });

  return { active: true };
}

// 영상 리액션 집계
export const getReactionMarkers = async ({ videoId, intervalMs = 5000 }) => {
  // videoId 검증
  if (typeof videoId !== "bigint" || videoId <= 0n) {
    throw new InvalidParameterError({ videoId: String(videoId) });
  }
  // interval 검증
  const safeInterval = Number(intervalMs);
  if (!Number.isInteger(safeInterval) || safeInterval <= 0) {
    throw new InvalidParameterError({ intervalMs });
  }
  // video 존재 검증
  const video = await findVideoById(videoId);
  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  // 집계 로우: (bucketMs, emojiType, count)
  const rows = await aggregateVideoReactionsByBucket({
    videoId,
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
export const getVideoReactionsByTime = async ({ videoId, timestampMs, windowMs }) => {
  if (!Number.isInteger(timestampMs) || timestampMs < 0) {
    throw new InvalidParameterError({ timestampMs });
  }

  const startMs = Math.max(0, timestampMs - windowMs);
  const endMs = timestampMs + windowMs;

  const rows = await aggregateVideoReactionsByTimeWindow({
    videoId,
    startMs,
    endMs,
  });

  return rows.map((r) => ({
    emojiType: r.emojiType,
    count: r._count._all,
  }));
};
