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
      video: { select: { title: true, createdAt: true, thumbnailUrl: true } },
    },
  });
};

export const findVideoInProject = async (projectId, videoId) => {
  return await prisma.video.findFirst({
    where: {
      id: BigInt(videoId),
      projectId: BigInt(projectId),
      status: "ready",
    },
  });
};

// 기존에 동일한 설정으로 생성된 링크가 있는지 확인
export const findExistingLink = async (projectId, scope, videoId) => {
  return await prisma.shareLink.findFirst({
    where: {
      projectId: BigInt(projectId),
      scope: scope,
      videoId: videoId ? BigInt(videoId) : null,
      isActive: true,
    },
    include: {
      project: { select: { title: true } },
      video: { select: { title: true, createdAt: true, thumbnailUrl: true } },
    },
  });
};

export const findShareLinkWithContent = async (token) => {
  return await prisma.shareLink.findFirst({
    where: { shareToken: token },
    include: {
      project: {
        include: {
          slides: {
            where: {
              isDeleted: false,
            },
            orderBy: {
              slideNum: "asc",
            },
            include: {
              script: true,
              assets: {
                where: {
                  assetType: "image",
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
              slideDurations: true,
            },
          },
          comments: {
            where: {
              isDeleted: false,
              OR: [
                { targetType: "video" },
                {
                  AND: [
                    { targetType: "slide" },
                    {
                      slide: { isDeleted: false },
                    },
                  ],
                },
              ],
            },
            orderBy: {
              createdAt: "asc",
            },
            include: {
              user: {
                select: {
                  nickName: true,
                },
              },
            },
          },
        },
      },
      video: true,
    },
  });
};

export const incrementViewCount = async (linkId) => {
  await prisma.shareLink.update({
    where: { id: linkId },
    data: {
      viewCount: { increment: 1 },
    },
  });
};

export const getShareLinkList = async (projectId) => {
  return await prisma.shareLink.findMany({
    where: { projectId: BigInt(projectId) },
    orderBy: { createdAt: "desc" },
    include: {
      video: { select: { title: true, createdAt: true, thumbnailUrl: true } },
    },
  });
};

export const getVideoList = async (projectId, page, pageSize) => {
  const skip = (page - 1) * pageSize;

  // 전체 개수와 페이지 조회를 Promise를 이용해 병렬로 처리
  const [totalCount, videos] = await Promise.all([
    prisma.video.count({
      where: {
        projectId: BigInt(projectId),
        status: "ready",
      },
    }),
    prisma.video.findMany({
      where: {
        projectId: BigInt(projectId),
        status: "ready",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        thumbnailUrl: true,
      },
      orderBy: { createdAt: "desc" },
      skip: skip,
      take: pageSize,
    }),
  ]);

  return { totalCount, videos };
};

// 삭제된 프로젝트인지 확인
export const findProjectById = async (projectId) => {
  return await prisma.project.findUnique({
    where: { id: BigInt(projectId) },
    select: { id: true, isDeleted: true },
  });
};
