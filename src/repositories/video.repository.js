import { prisma } from "../db.config.js";

export const getVideoWithChunks = async (videoId) => {
  return await prisma.video.findUnique({
    where: { id: BigInt(videoId) },
    include: {
      chunks: {
        orderBy: { chunkIndex: "asc" },
      },
    },
  });
};

export const updateVideoStatus = async (videoId, status, extra = {}) => {
  return await prisma.video.update({
    where: { id: BigInt(videoId) },
    data: { status, ...extra },
  });
};

export const updateVideoHlsUrl = async (videoId, hlsMasterUrl) => {
  return await prisma.video.update({
    where: { id: BigInt(videoId) },
    data: {
      hlsMasterUrl,
      status: "ready",
    },
  });
};

export const deleteVideoChunks = async (videoId) => {
  return await prisma.videoChunk.deleteMany({
    where: { videoId: BigInt(videoId) },
  });
};

export const getVideoChunksByVideoId = async (videoId) => {
  return await prisma.videoChunk.findMany({
    where: { videoId: BigInt(videoId) },
    orderBy: { chunkIndex: "asc" },
  });
};
