import { prisma } from "../db.config.js";

export const createConversionJob = async ({ uploadedFileId, videoId, jobType, projectId }) => {
  return await prisma.conversionJob.create({
    data: {
      uploadedFileId: uploadedFileId ?? null,
      videoId: videoId ?? null,
      projectId: projectId ?? null,
      jobType,
      status: "queued",
      progress: 0,
      createdAt: new Date(),
    },
  });
};

export const getJobById = async (jobId) => {
  return await prisma.conversionJob.findUnique({
    where: { id: BigInt(jobId) },
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
