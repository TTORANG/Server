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
