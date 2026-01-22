import { prisma } from "../db.config.js";

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
