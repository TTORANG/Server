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

export const countSlidesByIdsAndProjectId = async ({ projectId, slideIds }) => {
  return prisma.slide.count({
    where: {
      id: { in: slideIds },
      projectId,
    },
  });
};

export const updateSlideTitle = async (slideId, newTitle) => {
  return await prisma.slide.update({
    where: { id: BigInt(slideId) },
    data: {
      title: newTitle,
    },
    include: {
      assets: true,
    },
  });
};

export const getPrevSlideId = async (projectId, currentSlideNum) => {
  const prevSlide = await prisma.slide.findFirst({
    where: {
      projectId: BigInt(projectId),
      slideNum: { lt: currentSlideNum },
      isDeleted: false,
    },
    orderBy: { slideNum: "desc" },
    select: { id: true },
  });

  return prevSlide ? prevSlide.id.toString() : null;
};

export const getNextSlideId = async (projectId, currentSlideNum) => {
  const nextSlide = await prisma.slide.findFirst({
    where: {
      projectId: BigInt(projectId),
      slideNum: { gt: currentSlideNum },
      isDeleted: false,
    },
    orderBy: { slideNum: "asc" },
    select: { id: true },
  });

  return nextSlide ? nextSlide.id.toString() : null;
};
