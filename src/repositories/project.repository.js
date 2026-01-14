import { prisma } from "../db.config.js";
import { ProjectNotFoundError } from "../errors/project.error.js";

// 프로젝트 생성 및 파일 연결
export const createProject = async (userId, title, uploadedFileId) => {
  return await prisma.$transaction(async (tx) => {
    const file = await tx.uploadedFile.findUnique({
      where: { id: BigInt(uploadedFileId) },
    });

    if (!file) throw new ProjectNotFoundError();

    const project = await tx.project.create({
      data: {
        userId: userId,
        title: title,
      },
    });

    const updatedFile = await tx.uploadedFile.update({
      where: { id: BigInt(uploadedFileId) },
      data: { projectId: project.id },
    });

    return { project, file: updatedFile };
  });
};

// 프로젝트 이름 수정
export const updatePrjectTitle = async (projectId, userId, title) => {
  return await prisma.project.update({
    where: {
      id: BigInt(projectId),
      userId: userId,
    },
    data: {
      title: title,
    },
  });
};

// 프로젝트 삭제
export const deleteProject = async (projectId, userId) => {
  return await prisma.project.update({
    where: {
      id: BigInt(projectId),
      userId: userId,
    },
    data: { isDeleted: true },
  });
};

// 프로젝트 목록 조회/검색
export const getProjectList = async (userId, { page, limit, search, maxDuration, sort }) => {
  const skip = (page - 1) * limit;

  let orderBy = {
    createdAt: "desc",
  };

  if (sort === "name") {
    orderBy = { title: "asc" };
  } else if (sort === "feedback") {
    // orderBy = { comments: { _count: "desc" } };
  }
  const where = {
    userId,
    isDeleted: false,

    ...(search && {
      title: { contains: search },
    }),

    ...(maxDuration && {
      durationSeconds: { lte: parseInt(maxDuration) },
    }),
  };

  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: orderBy,
      include: {
        uploadedFiles: {
          select: {
            storageUrl: true,
            fileExt: true,
          },
        },
        _count: {
          select: {
            materials: true,
          },
        },
      },
    }),
  ]);

  return { total, projects };
};
