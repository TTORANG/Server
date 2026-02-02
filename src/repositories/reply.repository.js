import { prisma } from "../db.config.js";

export const findReplies = async (parentCommentId) => {
  return prisma.comment.findMany({
    where: {
      parentId: parentCommentId,
      isDeleted: false,
    },
    orderBy: { createdAt: "asc" },
  });
};
