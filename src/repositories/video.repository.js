import { prisma } from "../db.config.js";

export const findVideoById = async (videoId) => {
  return prisma.video.findFirst({
    where: {
      id: videoId,
    },
    select: { id: true },
  });
};

export async function findVideoByIdWithOwner(videoId, userId) {
  return prisma.video.findFirst({
    where: {
      id: BigInt(videoId),
      deletedAt: null,
      project: {
        is: {
          userId: BigInt(userId),
          isDeleted: false,
        },
      },
    },
    select: { id: true, projectId: true },
  });
}

export async function findVideosByProjectId(projectId) {
  return prisma.video.findMany({
    where: {
      projectId,
      deletedAt: null,
      status: { not: "deleted" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      durationSeconds: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  });
}

export async function findVideoDetailById(videoId) {
  return prisma.video.findFirst({
    where: {
      id: videoId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      durationSeconds: true,
      width: true,
      height: true,
      fps: true,
      hlsMasterUrl: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  });
}

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

export const updateVideoMetadata = async (videoId, metadata) => {
  return prisma.video.update({
    where: { id: BigInt(videoId) },
    data: {
      durationSeconds: metadata.durationSeconds,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      codec: metadata.codec,
      thumbnailUrl: metadata.thumbnailUrl ?? undefined,
    },
  });
};

export async function findVideoStatusById(videoId) {
  return prisma.video.findFirst({
    where: {
      id: videoId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
}

export async function findVideoSlideEnterEvents(videoId) {
  return prisma.videoSlideEvent.findMany({
    where: {
      videoId,
      eventType: "enter",
    },
    orderBy: {
      timestampMs: "asc",
    },
    select: {
      slideId: true,
      timestampMs: true,
    },
  });
}
