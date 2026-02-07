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
import { ALLOWED_VIDEO_MIME } from "../constants/files.js";
import { MAX_SLIDE_DURATION_MS } from "../constants/videos.js";
import {
  createVideoChunk,
  createVideoSession,
  countVideoChunks,
  findProjectById,
  findVideoForChunkUpload,
  findVideoForFinish,
  findVideoDetailById,
  findVideosByProjectId,
  findVideoSlideEnterEvents,
  findVideoStatusById,
  findVideoSlideDurations,
  saveVideoSlideLogsAndSetStatus,
  setVideoUploadingWithContainer,
} from "../repositories/video.repository.js";
import { countSlidesByIdsAndProjectId } from "../repositories/slide.repository.js";
import {
  recordingFinishSuccessDTO,
  recordingStartSuccessDTO,
  videoChunkUploadSuccessDTO,
  videoDetailResponseDTO,
  videoListResponseDTO,
  videoSlideTimelineResponseDTO,
} from "../dtos/video.dto.js";
import { findVideoReactionsGrouped } from "../repositories/reaction.repository.js";
import { findVideoComments } from "../repositories/comment.repository.js";

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

// 영상 세션 생성
export async function createVideo({ projectId, title, userId }) {
  let pid = null;

  if (projectId !== undefined) {
    pid = requireProjectId(projectId);

    const project = await findProjectById(pid);
    if (!project) {
      throw new InvalidUploadError({ projectId: pid }, "존재하지 않는 프로젝트입니다.");
    }

    if (!userId) {
      throw new AuthSessionRequiredError({ projectId: String(pid) });
    }

    if (project.userId !== userId) {
      throw new AuthSessionRequiredError({
        projectId: String(pid),
        userId: String(userId),
      });
    }
  }

  // 비디오 생성
  const video = await createVideoSession({ projectId: pid, title });

  return {
    resultType: "SUCCESS",
    error: null,
    success: recordingStartSuccessDTO(video),
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
  if (!ALLOWED_VIDEO_MIME.has(file.mimetype)) {
    throw new InvalidVideoChunkError({ contentType: file.mimetype });
  }

  const video = await findVideoForChunkUpload(vid);

  if (!video) throw new VideoNotFoundError({ videoId: String(vid) });
  if (!["recording", "uploading"].includes(video.status)) {
    throw new InvalidVideoStatusError({ videoId: String(vid), status: video.status });
  }

  const ext = file.mimetype === "video/mp4" ? "mp4" : "webm";

  // mp4 + webm 혼합 업로드 방지
  if (video.container && video.container !== ext) {
    throw new InvalidVideoChunkError({
      reason: "동일한 영상은 하나의 포맷(mp4 또는 webm)만 업로드할 수 있습니다.",
      videoId: String(vid),
      current: video.container,
      incoming: ext,
    });
  }

  // 첫 청크면 Video.container 저장
  if (video.status === "recording" && !video.container) {
    await setVideoUploadingWithContainer(vid, ext);
  }

  const env = process.env.NODE_ENV || "dev";
  const projectPart = video.projectId ? `project/${video.projectId}` : "orphan";
  const objectKey = `${env}/${projectPart}/video/${vid}/chunks/${chunkIndex}.${ext}`;

  // GCS 업로드 (서버가 받은 buffer로 직접 업로드)
  const uploaded = await uploadBufferToGCS({
    objectKey,
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
  const sizeBytes = BigInt(file.size);

  await createVideoChunk({
    videoId: vid,
    chunkIndex: idx,
    sizeBytes,
    sha256,
    storageBucket: uploaded.storageBucket,
    storageKey: uploaded.storageKey,
    url: uploaded.url,
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: videoChunkUploadSuccessDTO(),
  };
}

// 영상 업로드 성공 검증
export async function finishRecording({ videoId, slideLogs, userId }) {
  const vid = toInt(videoId);

  if (!Number.isInteger(vid) || vid <= 0) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }
  if (!Array.isArray(slideLogs)) {
    throw new InvalidParameterError({ slideLogs }, "slideLogs가 필요합니다.");
  }

  const video = await findVideoForFinish(vid);

  if (!video) throw new VideoNotFoundError({ videoId: String(videoId) });
  if (!["recording", "uploading"].includes(video.status)) {
    throw new InvalidVideoStatusError({ videoId: String(videoId), status: video.status });
  }

  // IDOR 방지: 소유권 검증
  if (!userId) {
    throw new AuthSessionRequiredError({ videoId: String(videoId) });
  }

  if (!video.project || video.project.userId !== userId) {
    throw new AuthSessionRequiredError({ videoId: String(videoId), userId: String(userId) });
  }

  for (const l of slideLogs) {
    if (!Number.isInteger(toInt(l.slideId))) {
      throw new InvalidParameterError({ slideId: l.slideId });
    }
    if (!Number.isInteger(toInt(l.timestampMs)) || l.timestampMs < 0) {
      throw new InvalidParameterError({ timestampMs: l.timestampMs });
    }
  }

  const uniqueSlideIds = [...new Set(slideLogs.map((l) => toInt(l.slideId)))];

  if (!video.projectId && uniqueSlideIds.length > 0) {
    throw new InvalidParameterError(
      { videoId: String(vid), slideIds: uniqueSlideIds },
      "프로젝트가 없는 영상에는 slideLogs를 저장할 수 없습니다."
    );
  }

  if (video.projectId && uniqueSlideIds.length > 0) {
    const validCount = await countSlidesByIdsAndProjectId({
      projectId: video.projectId,
      slideIds: uniqueSlideIds,
    });

    if (validCount !== uniqueSlideIds.length) {
      throw new InvalidParameterError(
        { videoId: String(vid), slideIds: uniqueSlideIds, projectId: video.projectId },
        "slideLogs에 프로젝트에 속하지 않은 slideId가 포함되어 있습니다."
      );
    }
  }

  // 업로드 검증
  const chunkCount = await countVideoChunks(vid);
  if (chunkCount <= 0) {
    throw new NoVideoChunksError({ videoId: String(videoId) });
  }

  const sorted = [...slideLogs].sort((a, b) => a.timestampMs - b.timestampMs);

  const calcSafeDurationMs = (currTs, nextTs) => {
    if (!Number.isInteger(currTs) || !Number.isInteger(nextTs) || nextTs <= currTs) return 0;

    const d = nextTs - currTs;
    if (d > MAX_SLIDE_DURATION_MS) return 0;

    return d;
  };

  const durationUpserts = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const slideId = toInt(sorted[i].slideId);
    const durationMs = calcSafeDurationMs(sorted[i].timestampMs, sorted[i + 1].timestampMs);

    if (durationMs <= 0) continue;

    durationUpserts.push({ slideId, durationMs });
  }

  // 트랜잭션: 슬라이드 로그 저장 + 상태 변경
  await saveVideoSlideLogsAndSetStatus({
    videoId: vid,
    slideEvents: sorted.map((l) => ({
      videoId: vid,
      slideId: toInt(l.slideId),
      timestampMs: toInt(l.timestampMs),
      eventType: "enter",
    })),
    durationUpserts,
    status: "processing",
  });

  const slideDurations = await findVideoSlideDurations(vid);

  // 인코딩 파이프라인 시작
  await startVideoEncodingPipeline({ videoId: vid });

  return {
    resultType: "SUCCESS",
    error: null,
    success: recordingFinishSuccessDTO({
      videoId: vid,
      status: "processing",
      slideDurations,
    }),
  };
}

// 영상 목록 조회
export async function getVideoList({ projectId }) {
  const pid = requireProjectId(projectId);

  // 프로젝트 존재 검증
  const project = await findProjectById(pid);

  if (!project) {
    throw new InvalidUploadError({ projectId: pid }, "존재하지 않는 프로젝트입니다.");
  }

  const videos = await findVideosByProjectId(pid);

  return {
    resultType: "SUCCESS",
    error: null,
    success: videoListResponseDTO(videos),
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
    findVideoDetailById(vid),
    findVideoReactionsGrouped(vid),
    findVideoComments(vid),
  ]);

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(vid) });
  }

  return {
    resultType: "SUCCESS",
    error: null,
    success: videoDetailResponseDTO({
      video,
      reactions,
      comments,
    }),
  };
}

// 영상-슬라이드 동기화 데이터 조회
export async function getVideoSlideTimeline({ videoId }) {
  const vid = toInt(videoId);
  if (!Number.isInteger(vid) || vid <= 0) {
    throw new InvalidParameterError({ videoId: String(videoId) }, "videoId가 올바르지 않습니다.");
  }

  const video = await findVideoStatusById(vid);

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  if (video.status !== "ready") {
    throw new InvalidVideoStatusError({
      videoId: String(videoId),
      status: video.status,
    });
  }

  const events = await findVideoSlideEnterEvents(vid);

  return {
    resultType: "SUCCESS",
    error: null,
    success: videoSlideTimelineResponseDTO(events),
  };
}
