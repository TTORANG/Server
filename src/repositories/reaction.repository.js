import { prisma } from "../db.config.js";

export function findReaction(where) {
  return prisma.reaction.findFirst({
    where: {
      userId: where.userId,
      sessionId: where.sessionId,
      targetType: where.targetType,
      targetId: where.targetId,
      timestampMs: where.timestampMs,
      emojiType: where.emojiType,
    },
  });
}

export async function findVideoReactionsGrouped(videoId) {
  return prisma.reaction.groupBy({
    by: ["timestampMs", "emojiType"],
    where: {
      targetType: "video",
      targetId: videoId,
      timestampMs: { not: null },
      isDeleted: false,
    },
    _count: { _all: true },
  });
}

export function createReaction(data) {
  return prisma.reaction.create({ data });
}

export function updateReaction(id, isDeleted) {
  return prisma.reaction.update({
    where: { id },
    data: { isDeleted },
  });
}

export function countSlideReactions(slideId) {
  return prisma.reaction.groupBy({
    by: ["emojiType"],
    where: {
      targetType: "slide",
      targetId: BigInt(slideId),
      isDeleted: false,
    },
    _count: { _all: true },
  });
}

export function findSlideByIdWithOwner(slideId, userId) {
  if (!userId) return null;

  return prisma.slide.findFirst({
    where: {
      id: BigInt(slideId),
      isDeleted: false,
      project: {
        is: {
          userId: BigInt(userId),
          isDeleted: false,
        },
      },
    },
    select: { id: true },
  });
}

export const aggregateVideoReactionsByBucket = async ({ videoId, intervalMs }) => {
  // timestamp_ms가 null인 row는 제외 (재생바 마커용이므로)
  return prisma.$queryRaw`
    SELECT
      (FLOOR(r.timestamp_ms / ${intervalMs}) * ${intervalMs}) AS bucketMs,
      r.emoji_type AS emojiType,
      COUNT(*) AS count
    FROM reaction r
    WHERE
      r.target_type = 'video'
      AND r.target_id = ${videoId}
      AND r.is_deleted = 0
      AND r.timestamp_ms IS NOT NULL
    GROUP BY bucketMs, emojiType
    ORDER BY bucketMs ASC
  `;
};

export const aggregateVideoReactionsByTimeWindow = async ({ videoId, startMs, endMs }) => {
  return prisma.reaction.groupBy({
    by: ["emojiType"],
    where: {
      targetType: "video",
      targetId: videoId,
      timestampMs: {
        gte: startMs,
        lte: endMs,
      },
      isDeleted: false,
    },
    _count: { _all: true },
  });
};

export function findVideoReaction({ userId, videoId, timestampMs, emojiType }) {
  return prisma.reaction.findFirst({
    where: {
      userId,
      targetType: "video",
      targetId: BigInt(videoId),
      timestampMs,
      emojiType,
    },
  });
}

export function updateReactionIsDeleted(reactionId, isDeleted) {
  return prisma.reaction.update({
    where: { id: reactionId },
    data: { isDeleted },
  });
}

export function createVideoReaction({ userId, videoId, timestampMs, emojiType }) {
  return prisma.reaction.create({
    data: {
      userId,
      targetType: "video",
      targetId: BigInt(videoId),
      timestampMs,
      emojiType,
    },
  });
}

export function findProjectByIdWithOwner(projectId, userId) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
      isDeleted: false,
    },
    select: { id: true },
  });
}

export function findProjectWithSlides(projectId, userId) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
      isDeleted: false,
    },
    select: {
      id: true,
      slides: {
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
        },
      },
    },
  });
}

export function countProjectSlideReactionsBySlideIds(slideIds) {
  if (!slideIds.length) return [];
  return prisma.reaction.groupBy({
    by: ["emojiType"],
    where: {
      targetType: "slide",
      targetId: { in: slideIds },
      isDeleted: false,
    },
    _count: { _all: true },
  });
}
