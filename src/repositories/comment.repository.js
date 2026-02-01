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
