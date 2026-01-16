import { prisma } from "../db.config.js";

export const getSlidesByProjectId = async (projectId) => {
  return await prisma.slide.findMany({
    where: {
      projectId: BigInt(projectId),
      isDeleted: false,
    },
    include: {
      assets: {
        select: {
          url: true,
          assetType: true,
        },
      },
    },
    orderBy: {
      slideNum: "asc",
    },
  });
};

export const getSlideWithProject = async (slideId) => {
  return await prisma.slide.findFirst({
    where: {
      id: BigInt(slideId),
      isDeleted: false,
    },
    include: {
      project: true,
      assets: true,
    },
  });
};

export const getProjectExist = async (projectId, userId) => {
  return await prisma.project.findFirst({
    where: { id: BigInt(projectId), userId, isDeleted: false },
  });
};
