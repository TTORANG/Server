import { prisma } from "../db.config.js";

export const findProjectById = async (projectId) => {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false,
    },
    select: { id: true, userId: true },
  });
};

export const findVideoById = async (videoId) => {
  return prisma.video.findFirst({
    where: {
      id: videoId,
    },
    select: { id: true },
  });
};

export const findVideoByIdWithProject = async (videoId) => {
  return prisma.video.findFirst({
    where: {
      id: videoId,
      deletedAt: null,
    },
    select: { id: true, projectId: true },
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

export const createVideoSession = async ({ projectId, title }) => {
  return prisma.video.create({
    data: {
      projectId,
      title,
      status: "recording",
    },
    select: { id: true },
  });
};

export const findVideoForChunkUpload = async (videoId) => {
  return prisma.video.findFirst({
    where: { id: videoId, deletedAt: null },
    select: {
      id: true,
      status: true,
      projectId: true,
      container: true,
    },
  });
};

export const setVideoUploadingWithContainer = async (videoId, container) => {
  return prisma.video.update({
    where: { id: videoId },
    data: {
      status: "uploading",
      container,
    },
  });
};

export const createVideoChunk = async ({
  videoId,
  chunkIndex,
  sizeBytes,
  sha256,
  storageBucket,
  storageKey,
  url,
}) => {
  return prisma.videoChunk.create({
    data: {
      videoId,
      chunkIndex,
      sizeBytes,
      sha256,
      storageBucket,
      storageKey,
      url,
    },
  });
};

export const countVideoChunks = async (videoId) => {
  return prisma.videoChunk.count({
    where: { videoId },
  });
};

export const findVideoForFinish = async (videoId) => {
  return prisma.video.findFirst({
    where: { id: videoId, deletedAt: null },
    select: {
      id: true,
      status: true,
      projectId: true,
      project: { select: { userId: true } },
    },
  });
};

export const saveVideoSlideLogsAndSetStatus = async ({
  videoId,
  slideEvents,
  durationUpserts,
  status,
}) => {
  const durationOps = durationUpserts.map((d) =>
    prisma.videoSlideDuration.upsert({
      where: {
        videoId_slideId: { videoId, slideId: d.slideId },
      },
      update: {
        totalDurationMs: { increment: d.durationMs },
      },
      create: {
        videoId,
        slideId: d.slideId,
        totalDurationMs: d.durationMs,
      },
    })
  );

  return prisma.$transaction([
    prisma.videoSlideEvent.deleteMany({
      where: { videoId },
    }),
    prisma.videoSlideEvent.createMany({
      data: slideEvents,
    }),
    ...durationOps,
    prisma.video.update({
      where: { id: videoId },
      data: { status },
    }),
  ]);
};

export const findVideoSlideDurations = async (videoId) => {
  return prisma.videoSlideDuration.findMany({
    where: { videoId },
    orderBy: { slideId: "asc" },
    select: {
      slideId: true,
      totalDurationMs: true,
    },
  });
};

export async function findVideosByProjectId(projectId, { search, maxDurationSeconds } = {}) {
  const where = {
    projectId,
    deletedAt: null,
    status: { not: "deleted" },
  };

  if (typeof search === "string" && search.trim().length > 0) {
    where.title = {
      contains: search.trim(),
    };
  }

  if (Number.isInteger(maxDurationSeconds)) {
    where.durationSeconds = {
      lte: maxDurationSeconds,
    };
  }

  return prisma.video.findMany({
    where,
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

export async function findVideosByOwnerId(userId) {
  return prisma.video.findMany({
    where: {
      deletedAt: null,
      status: { not: "deleted" },
      project: {
        is: {
          userId,
          isDeleted: false,
        },
      },
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

export const groupVideoReactionsByVideoIds = (videoIds) =>
  prisma.reaction.groupBy({
    by: ["targetId"],
    where: {
      targetType: "video",
      isDeleted: false,
      targetId: { in: videoIds },
    },
    _count: { _all: true },
  });

export const groupVideoRootCommentsByVideoIds = (videoIds) =>
  prisma.comment.groupBy({
    by: ["targetId"],
    where: {
      targetType: "video",
      isDeleted: false,
      parentId: null,
      targetId: { in: videoIds },
    },
    _count: { _all: true },
  });

export const groupVideoRepliesByVideoIds = (videoIds) =>
  prisma.comment.groupBy({
    by: ["targetId"],
    where: {
      targetType: "video",
      isDeleted: false,
      parentId: { not: null },
      targetId: { in: videoIds },
    },
    _count: { _all: true },
  });

export const groupVideoPlaySessionsByVideoIds = (videoIds) =>
  prisma.analyticsVideoEvent.groupBy({
    by: ["videoId", "sessionId"],
    where: {
      eventType: "play",
      videoId: { in: videoIds },
    },
  });

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

export const updateVideoTitle = async (videoId, title) => {
  return await prisma.video.update({
    where: { id: BigInt(videoId) },
    data: { title },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
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

/**
 * 특정 타임스탬프에 표시되는 슬라이드 찾기
 * @param {bigint} videoId - 영상 ID
 * @param {number} timestampMs - 타임스탬프 (ms)
 * @returns {Promise<Object|null>} 슬라이드 정보와 이미지
 */
export async function findSlideByTimestamp(videoId, timestampMs) {
  // 해당 타임스탬프 이하의 가장 최근 enter 이벤트 찾기
  const event = await prisma.videoSlideEvent.findFirst({
    where: {
      videoId,
      eventType: "enter",
      timestampMs: { lte: timestampMs },
    },
    orderBy: {
      timestampMs: "desc",
    },
    include: {
      slide: {
        include: {
          assets: {
            where: {
              assetType: "image",
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              url: true,
            },
          },
        },
      },
    },
  });

  if (!event || !event.slide) {
    return null;
  }

  return {
    slideId: event.slide.id,
    slideNum: event.slide.slideNum,
    title: event.slide.title,
    imageUrl: event.slide.assets[0]?.url || null,
  };
}
