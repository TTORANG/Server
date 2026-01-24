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
import { AuthSessionRequiredError } from "../errors/auth.error.js";

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

  if (!Number.isInteger(videoId) || videoId <= 0) {
    throw new InvalidUploadError({ videoId }, "비디오 ID가 올바르지 않습니다.");
  }
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    throw new InvalidUploadError({ chunkIndex }, "비디오 청크 인덱스가 올바르지 않습니다.");
  }

  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      projectId,
      deletedAt: null,
    },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  if (video.status !== "uploading") {
    throw new InvalidVideoStatusError({
      videoId: String(videoId),
      status: video.status,
    });
  }

  // video_chunk 목적 Signed URL 발급 (gcs.service.js가 projectId를 요구하는 상태면 그대로 통과)
  return await createUploadUrl({
    purpose: "video_chunk",
    projectId,
    videoId,
    chunkIndex,
    size: input.size,
    contentType: input.contentType,
  });
}

export async function completeVideoChunk(input) {
  const projectId = requireProjectId(input.projectId);
  const videoId = toInt(input.videoId);
  const chunkIndex = toInt(input.chunkIndex);
  const objectKey = input.objectKey;

  if (!objectKey) throw new InvalidVideoChunkError({ objectKey });
  if (!Number.isInteger(videoId) || videoId <= 0)
    throw new VideoNotFoundError({ videoId: String(videoId) });
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0)
    throw new InvalidVideoChunkError({ chunkIndex });

  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      projectId,
      deletedAt: null,
    },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  if (video.status !== "uploading") {
    throw new InvalidVideoStatusError({
      videoId: String(videoId),
      status: video.status,
    });
  }

  const keyParts = objectKey.split("/");
  if (
    keyParts.length < 7 ||
    toInt(keyParts[2]) !== projectId ||
    toInt(keyParts[4]) !== videoId ||
    toInt(keyParts[6]) !== chunkIndex
  ) {
    throw new InvalidVideoChunkError({ reason: "objectKey가 요청 파라미터와 일치하지 않습니다." });
  }

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
    throw new VideoNotFoundError({ videoId: String(videoId) });
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
    throw new VideoNotFoundError({
      videoId: String(videoId),
      projectId: String(projectId),
    });
  }

  // 상태 검증
  if (video.status !== "uploading") {
    throw new InvalidVideoStatusError({
      videoId: String(videoId),
      status: video.status,
    });
  }

  // 청크 존재
  const chunkCount = await prisma.videoChunk.count({
    where: { videoId },
  });

  if (chunkCount <= 0) {
    throw new NoVideoChunksError({ videoId: String(videoId) });
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

// 영상 목록 조회
export async function getVideoList({ projectId }) {
  const pid = requireProjectId(projectId);

  // 프로젝트 존재 검증
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

  const videos = await prisma.video.findMany({
    where: {
      projectId: pid,
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

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      videos: videos.map((v) => ({
        ...v,
        id: v.id.toString(),
      })),
    },
  };
}

// 영상 상세 조회
export async function getVideoDetail({ videoId }) {
  const vid = toInt(videoId);
  if (!Number.isInteger(vid) || vid <= 0) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  // 영상 정보, 리액션, 댓글 가져옴
  const [video, reactions, comments] = await Promise.all([
    prisma.video.findFirst({
      where: {
        id: vid,
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
    }),
    prisma.reaction.groupBy({
      by: ["timestampMs", "emojiType"],
      where: {
        targetType: "video",
        targetId: vid,
        timestampMs: { not: null },
        isDeleted: false,
      },
      _count: { _all: true },
    }),
    prisma.comment.findMany({
      where: {
        targetType: "video",
        targetId: vid,
        isDeleted: false,
      },
      orderBy: { timestampMs: "asc" },
      select: {
        id: true,
        timestampMs: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(vid) });
  }

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      video: {
        ...video,
        id: video.id.toString(),
      },
      timeline: {
        reactions: reactions.map((r) => ({
          timestampMs: r.timestampMs,
          emojiType: r.emojiType,
          count: r._count._all,
        })),
        comments: comments.map((c) => ({
          ...c,
          id: c.id.toString(),
          user: {
            ...c.user,
            id: c.user.id.toString(),
          },
        })),
      },
    },
  };
}

// 영상 타임스탬프 리액션 생성
export async function toggleVideoReaction({ videoId, emojiType, timestampMs, userId, sessionId }) {
  if (!sessionId) {
    throw new AuthSessionRequiredError({
      userId: String(userId),
      videoId: String(videoId),
    });
  }

  const vid = toInt(videoId);
  const ts = toInt(timestampMs);

  if (!Number.isInteger(vid) || vid <= 0) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }
  if (!emojiType || typeof emojiType !== "string") {
    throw new InvalidVideoStatusError({ emojiType });
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidVideoStatusError({ timestampMs });
  }

  const video = await prisma.video.findFirst({
    where: {
      id: vid,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const existing = await prisma.reaction.findFirst({
    where: {
      userId,
      sessionId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      emojiType,
    },
  });

  if (existing) {
    await prisma.reaction.update({
      where: { id: existing.id },
      data: { isDeleted: !existing.isDeleted },
    });

    return {
      resultType: "SUCCESS",
      error: null,
      success: { active: existing.isDeleted },
    };
  }

  await prisma.reaction.create({
    data: {
      userId,
      sessionId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      emojiType,
    },
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: { active: true },
  };
}

// 영상 타임스탬프 댓글 생성
export async function createVideoComment({ videoId, content, timestampMs, userId, sessionId }) {
  if (!sessionId) {
    throw new AuthSessionRequiredError({
      userId: String(userId),
      videoId: String(videoId),
    });
  }

  const vid = toInt(videoId);
  const ts = toInt(timestampMs);

  if (!Number.isInteger(vid) || vid <= 0) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }
  if (!content || !content.trim()) {
    throw new InvalidVideoStatusError({ content });
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidVideoStatusError({ timestampMs });
  }

  const video = await prisma.video.findFirst({
    where: {
      id: vid,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const comment = await prisma.comment.create({
    data: {
      userId,
      sessionId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      content,
    },
    select: {
      id: true,
      content: true,
      timestampMs: true,
      createdAt: true,
    },
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      id: comment.id.toString(),
      content: comment.content,
      timestampMs: comment.timestampMs,
      createdAt: comment.createdAt,
    },
  };
}
