import { prisma } from "../db.config.js";

export const createComment = async (data) => {
  return prisma.comment.create({
    data,
  });
};

export const findCommentById = async (commentId) => {
  return prisma.comment.findFirst({
    where: {
      id: commentId,
      isDeleted: false,
    },
  });
};

export const updateCommentContent = async (commentId, content) => {
  return prisma.comment.update({
    where: { id: commentId },
    data: { content },
  });
};

export const softDeleteComment = async (commentId) => {
  return prisma.comment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });
};

export const findCommentsBySlideId = async ({ slideId, skip, take }) => {
  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: {
        targetType: "slide",
        targetId: slideId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "asc",
      },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            nickName: true,
          },
        },
      },
    }),
    prisma.comment.count({
      where: {
        targetType: "slide",
        targetId: slideId,
        isDeleted: false,
      },
    }),
  ]);

  return { items, total };
};

export async function findVideoComments(videoId) {
  return prisma.comment.findMany({
    where: {
      targetType: "video",
      targetId: videoId,
      isDeleted: false,
    },
    orderBy: { timestampMs: "asc" },
    select: {
      id: true,
      timestampMs: true,
      content: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export const findVideoCommentsByTimestamp = async ({ videoId, fromMs, toMs }) => {
  return prisma.comment.findMany({
    where: {
      targetType: "video",
      targetId: videoId,
      isDeleted: false,
      timestampMs: {
        gte: fromMs,
        lt: toMs,
      },
    },
    orderBy: { timestampMs: "asc" },
    include: {
      user: {
        select: { id: true, nickName: true },
      },
    },
  });
};

export const createVideoComment = async ({ userId, videoId, timestampMs, content }) => {
  return prisma.comment.create({
    data: {
      userId,
      targetType: "video",
      targetId: videoId,
      timestampMs,
      content,
    },
    select: {
      id: true,
      content: true,
      timestampMs: true,
      createdAt: true,
    },
  });
};

/**
 * 프로젝트의 최근 영상 댓글 조회 (슬라이드 정보 포함)
 * @param {Object} params
 * @param {bigint} params.projectId - 프로젝트 ID
 * @param {number} params.limit - 조회할 댓글 수
 */
export const findRecentVideoCommentsByProjectId = async ({ projectId, limit = 10 }) => {
  // 프로젝트의 모든 영상 댓글 조회 (최신순)
  const comments = await prisma.comment.findMany({
    where: {
      projectId,
      targetType: "video",
      isDeleted: false,
      timestampMs: { not: null }, // 타임스탬프가 있는 댓글만
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          nickName: true,
          name: true,
        },
      },
    },
  });

  return comments;
};
