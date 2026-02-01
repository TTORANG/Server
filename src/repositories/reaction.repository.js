import { prisma } from "../db.config.js";

export function findSlideById(slideId) {
  return prisma.slide.findFirst({
    where: { id: BigInt(slideId), isDeleted: false },
    select: { id: true },
  });
}

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

export function createReaction(data) {
  return prisma.reaction.create({ data });
}

export function updateReaction(id, isDeleted) {
  return prisma.reaction.update({
    where: { id },
    data: { isDeleted },
  });
}
