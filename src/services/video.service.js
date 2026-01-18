import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { createUploadUrl, verifyUploadedObject } from "./gcs.service.js";
import { MAX_SIZE_BYTES } from "../constants/files.js";
import { startVideoEncodingPipeline } from "./conversionJob.service.js";
import {
  InvalidVideoChunkError,
  InvalidVideoStatusError,
  NoVideoChunksError,
  VideoNotFoundError,
} from "../errors/video.error.js";

function toInt(value) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(n) ? n : NaN;
}

function requireProjectId(projectId) {
  const pid = toInt(projectId);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new InvalidUploadError({ projectId }, "프로젝트 ID가 올바르지 않습니다.");
  }
  return pid;
}

export async function createVideo({ projectId, title }) {
  // projectId 형식 검증
  const pid = requireProjectId(projectId);

  // 프로젝트 존재 + 미삭제 여부 검증 (핵심)
  const project = await prisma.project.findFirst({
    where: {
      id: pid,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!project) {
    throw new InvalidUploadError({ projectId: pid }, "존재하지 않는 프로젝트입니다.");
  }

  // 비디오 생성
  const video = await prisma.video.create({
    data: {
      projectId: pid,
      title,
      status: "uploading",
    },
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      videoId: video.id.toString(),
    },
  };
}

export async function createVideoChunkUploadUrl(input) {
  const projectId = requireProjectId(input.projectId);
  const videoId = toInt(input.videoId);
  const chunkIndex = toInt(input.chunkIndex);
  const size = typeof input.size === "string" ? Number(input.size) : input.size;
  const contentType = input.contentType;

  if (!Number.isInteger(videoId) || videoId <= 0) {
    throw new VideoNotFoundError({ videoId });
  }
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    throw new InvalidVideoChunkError({ chunkIndex });
  }

  if (contentType !== "video/webm") {
    throw new InvalidVideoChunkError({ contentType });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE_BYTES) {
    throw new InvalidVideoChunkError({ size, max: MAX_SIZE_BYTES });
  }

  // video_chunk 목적 Signed URL 발급 (gcs.service.js가 projectId를 요구하는 상태면 그대로 통과)
  return await createUploadUrl({
    purpose: "video_chunk",
    projectId,
    videoId,
    chunkIndex,
    size: Math.trunc(size),
    contentType,
  });
}

export async function completeVideoChunk(input) {
  const projectId = requireProjectId(input.projectId);
  const videoId = toInt(input.videoId);
  const chunkIndex = toInt(input.chunkIndex);
  const objectKey = input.objectKey;

  if (!objectKey) throw new InvalidVideoChunkError({ objectKey });
  if (!Number.isInteger(videoId) || videoId <= 0) throw new VideoNotFoundError({ videoId });
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0)
    throw new InvalidVideoChunkError({ chunkIndex });

  const meta = await verifyUploadedObject({ objectKey });

  if (meta.contentType !== "video/webm") {
    throw new InvalidVideoChunkError({ contentType: meta.contentType });
  }
  const sizeBytes = Number(meta.size);

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
    throw new InvalidVideoChunkError({ size: meta.size, max: MAX_SIZE_BYTES });
  }

  await prisma.videoChunk.create({
    data: {
      videoId,
      chunkIndex,
      sizeBytes: meta.size,
      storageBucket: process.env.GCS_BUCKET_NAME,
      storageKey: objectKey,
      url: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectKey}`,
    },
  });

  return { ok: true };
}

export async function completeVideoUpload(input) {
  const projectId = requireProjectId(input.projectId);
  const videoId = toInt(input.videoId);

  if (!Number.isInteger(videoId) || videoId <= 0) {
    throw new VideoNotFoundError({ videoId });
  }

  // video 존재 + project 소속 검증
  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      projectId,
      deletedAt: null,
    },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId, projectId });
  }

  // 상태 검증
  if (video.status !== "uploading") {
    throw new InvalidVideoStatusError({
      videoId,
      status: video.status,
    });
  }

  // 청크 존재 if (!Number.isInteger(chunkIndex) || chunkIndex < 0)
  const chunkCount = await prisma.videoChunk.count({
    where: { videoId },
  });

  if (chunkCount <= 0) {
    throw new NoVideoChunksError({ videoId });
  }

  // 상태 변경
  await prisma.video.update({
    where: { id: videoId },
    data: { status: "processing" },
  });

  // 변환 Job 생성
  await startVideoEncodingPipeline({ videoId });

  return { ok: true };
}
