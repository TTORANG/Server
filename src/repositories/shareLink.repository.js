import { prisma } from "../db.config.js";

export const createShareLink = async (data) => {
  return await prisma.shareLink.create({
    data: {
      projectId: BigInt(data.projectId),
      videoId: data.videoId ? BigInt(data.videoId) : null,
      scope: data.scope,
      shareToken: data.shareToken,
      expiredAt: data.expiredAt || null,
    },
    include: {
      project: {
        select: { title: true },
      },
    },
  });
};

export const findVideoInProject = async (proejctId, videoId) => {
  return await prisma.video.findFirst({
    where: {
      id: BigInt(videoId),
      projectId: BigInt(projectId),
      status: "ready",
    },
  });
};
