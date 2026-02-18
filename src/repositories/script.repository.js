import { prisma } from "../db.config.js";
import { ScriptNotFoundError, VersionNotFoundError } from "../errors/script.error.js";

// 대본 저장
export const updateScriptText = async (slideId, text, charCount, duration) => {
  return await prisma.$transaction(async (tx) => {
    const script = await tx.script.upsert({
      where: {
        slideId: BigInt(slideId),
      },
      update: {
        scriptText: text,
        charCount: charCount,
        estimatedDurationSeconds: duration,
      },
      create: {
        slideId: BigInt(slideId),
        scriptText: text,
        charCount: charCount,
        estimatedDurationSeconds: duration,
      },
    });

    const lastVersion = await tx.scriptVersion.findFirst({
      where: {
        scriptId: script.id,
      },
      orderBy: {
        versionNumber: "desc",
      },
    });

    const nextVersion = lastVersion ? lastVersion.versionNumber + 1 : 1;

    await tx.scriptVersion.create({
      data: {
        scriptId: script.id,
        scriptText: text,
        charCount,
        estimatedDurationSeconds: duration,
        versionNumber: nextVersion,
      },
    });

    return script;
  });
};

// 대본 조회
export const getScriptText = async (slideId) => {
  return await prisma.script.findUnique({
    where: {
      slideId: BigInt(slideId),
    },
  });
};

// 대본 버전 조회
export const getScriptVersionList = async (slideId) => {
  return await prisma.scriptVersion.findMany({
    where: {
      script: {
        slideId: BigInt(slideId),
      },
    },
    orderBy: {
      versionNumber: "desc",
    },
  });
};

// 프로젝트 슬라이드/대본 목록 조회 (일괄 수정용)
export const getProjectSlidesWithScripts = async (projectId, userId) => {
  return await prisma.project.findFirst({
    where: {
      id: BigInt(projectId),
      userId: BigInt(userId),
      isDeleted: false,
    },
    select: {
      id: true,
      slides: {
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          slideNum: true,
          script: {
            select: {
              scriptText: true,
            },
          },
        },
        orderBy: [{ slideNum: "asc" }, { id: "asc" }],
      },
    },
  });
};

// 대본 버전 복원
export const postScriptVersion = async (slideId, versionNumber) => {
  return await prisma.$transaction(async (tx) => {
    const currentScript = await tx.script.findUnique({
      where: { slideId: BigInt(slideId) },
    });

    if (!currentScript) {
      throw new ScriptNotFoundError({ slideId });
    }

    const versionData = await tx.scriptVersion.findUnique({
      where: {
        uq_script_version: {
          scriptId: currentScript.id,
          versionNumber: parseInt(versionNumber),
        },
      },
    });

    if (!versionData) {
      throw new VersionNotFoundError({ slideId });
    }

    return await tx.script.update({
      where: {
        id: currentScript.id,
      },
      data: {
        scriptText: versionData.scriptText,
        charCount: versionData.charCount,
        estimatedDurationSeconds: versionData.estimatedDurationSeconds,
      },
    });
  });
};
