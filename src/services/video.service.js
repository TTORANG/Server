import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { startVideoEncodingPipeline } from "./conversion-job.service.js";
import {
  InvalidParameterError,
  InvalidVideoChunkError,
  InvalidVideoStatusError,
  NoVideoChunksError,
  VideoNotFoundError,
} from "../errors/video.error.js";
import { AuthSessionRequiredError } from "../errors/auth.error.js";
import { uploadBufferToGCS } from "./gcs.service.js";
import crypto from "crypto";

function toInt(value) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(n) ? n : NaN;
}

function requireProjectId(projectId) {
  const pid = toInt(projectId);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new InvalidParameterError({ projectId }, "프로젝트 ID가 올바르지 않습니다.");
  }
  return pid;
}

export async function createVideo({ projectId, title }) {
  let pid = null;

  if (projectId !== undefined) {
    pid = requireProjectId(projectId);

    const project = await prisma.project.findFirst({
      where: { id: pid, isDeleted: false },
      select: { id: true },
    });
    if (!project) {
      throw new InvalidUploadError({ projectId: pid }, "존재하지 않는 프로젝트입니다.");
    }
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

// 영상 청크 업로드
export async function uploadVideoChunk({ videoId, chunkIndex, file }) {
  const vid = toInt(videoId);
  const idx = toInt(chunkIndex);

  if (!Number.isInteger(vid) || vid <= 0)
    throw new VideoNotFoundError({ videoId: String(videoId) });
  if (!Number.isInteger(idx) || idx < 0) throw new InvalidVideoChunkError({ chunkIndex });

  if (!file || !file.buffer || !file.mimetype) {
    throw new InvalidVideoChunkError({ reason: "chunk 파일이 필요합니다." });
  }
  if (file.mimetype !== "video/webm") {
    throw new InvalidVideoChunkError({ contentType: file.mimetype });
  }

  const video = await prisma.video.findFirst({
    where: { id: vid, deletedAt: null },
    select: { id: true, status: true, projectId: true },
  });

  if (!video) throw new VideoNotFoundError({ videoId: String(vid) });
  if (video.status !== "uploading") {
    throw new InvalidVideoStatusError({ videoId: String(vid), status: video.status });
  }

  const env = process.env.NODE_ENV || "dev";
  const projectPart = video.projectId ? `project/${video.projectId}` : "orphan";
  const objectKey = `${env}/${projectPart}/video/${vid}/chunks/${chunkIndex}.webm`;

  // GCS 업로드 (서버가 받은 buffer로 직접 업로드)
  const uploaded = await uploadBufferToGCS({
    objectKey,
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
  const sizeBytes = BigInt(file.size);

  await prisma.videoChunk.create({
    data: {
      videoId: vid,
      chunkIndex: idx,
      sizeBytes,
      sha256,
      storageBucket: uploaded.storageBucket,
      storageKey: uploaded.storageKey,
      url: uploaded.url,
    },
  });

  return { ok: true };
}

// 영상 업로드 성공 검증
export async function completeVideoUpload({ videoId }) {
  const vid = toInt(videoId);

  if (!Number.isInteger(vid) || vid <= 0) {
    throw new VideoNotFoundError({ videoId: String(vid) });
  }

  // video 소속 검증
  const video = await prisma.video.findFirst({
    where: { id: vid, deletedAt: null },
  });

  // 상태 검증
  if (!video) throw new VideoNotFoundError({ videoId: String(vid) });
  if (video.status !== "uploading") {
    throw new InvalidVideoStatusError({ videoId: String(vid), status: video.status });
  }

  // 청크 존재
  const chunkCount = await prisma.videoChunk.count({ where: { videoId: vid } });
  if (chunkCount <= 0) throw new NoVideoChunksError({ videoId: String(vid) });

  // 상태 변경
  await prisma.video.update({
    where: { id: vid },
    data: { status: "processing" },
  });

  // 변환 Job 생성
  await startVideoEncodingPipeline({ videoId: vid });

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
    throw new InvalidParameterError({ emojiType }, "잘못된 이모지 타입입니다.");
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
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
    const newIsDeleted = !existing.isDeleted;

    await prisma.reaction.update({
      where: { id: existing.id },
      data: { isDeleted: newIsDeleted },
    });

    return {
      resultType: "SUCCESS",
      error: null,
      success: { active: !newIsDeleted },
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
    throw new InvalidParameterError({ content }, "댓글 내용은 비워둘 수 없습니다.");
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
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

// 영상-슬라이드 동기화 데이터 조회
export async function getVideoSlideTimeline({ videoId }) {
  const vid = toInt(videoId);
  if (!Number.isInteger(vid) || vid <= 0) {
    throw new InvalidParameterError({ videoId: String(videoId) }, "videoId가 올바르지 않습니다.");
  }

  const video = await prisma.video.findFirst({
    where: {
      id: vid,
      deletedAt: null,
    },
    select: { id: true, status: true },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  if (video.status !== "ready") {
    throw new InvalidVideoStatusError({
      videoId: String(videoId),
      status: video.status,
    });
  }

  const events = await prisma.videoSlideEvent.findMany({
    where: {
      videoId: vid,
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

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      slides: events.map((e) => ({
        slideId: e.slideId.toString(),
        timestampMs: e.timestampMs,
      })),
    },
  };
}
