import { prisma } from "../db.config.js";

export const createConversionJob = async ({ uploadedFileId, jobType }) => {
  return await prisma.conversionJob.create({
    data: {
      uploadedFileId,
      jobType,
      status: "queued",
      progress: 0,
      createdAt: new Date(),
    },
  });
};

export const updateJobToProcessing = async (jobId) => {
  return await prisma.conversionJob.update({
    where: { id: BigInt(jobId) },
    data: {
      status: "processing",
      startedAt: new Date(),
    },
  });
};

export const updateJobToCompleted = async (jobId) => {
  return await prisma.conversionJob.update({
    where: { id: BigInt(jobId) },
    data: {
      status: "completed",
      progress: 100,
      finishedAt: new Date(),
    },
  });
};

export const updateJobToFailed = async (jobId, errorMessage) => {
  return await prisma.conversionJob.update({
    where: { id: BigInt(jobId) },
    data: {
      status: "failed",
      errorMessage,
      finishedAt: new Date(),
    },
  });
};
