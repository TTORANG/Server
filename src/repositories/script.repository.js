import { prisma } from "../db.config.js";

// 대본 저장
export const updateScriptText = async (slideId, text, charCount, duration) => {
  return await prisma.script.upsert({
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
};
