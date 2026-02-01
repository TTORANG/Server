import { prisma } from "../db.config.js";

export const createComment = async (data) => {
  return prisma.comment.create({
    data,
  });
};
