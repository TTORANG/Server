import fs from "fs/promises";
import path from "path";
import {
  getVideoWithChunks,
  updateVideoStatus,
  updateVideoHlsUrl,
  deleteVideoChunks,
  updateVideoMetadata,
} from "../../repositories/video.repository.js";
import { getJobById } from "../../repositories/conversionJob.repository.js";
import {
  downloadFromGCS,
  uploadToGCS,
  runCmd,
  tmpPath,
  uuid,
  envPrefix,
  listFiles,
} from "../../utils/conversion.util.js";
import pLimit from "p-limit";
import { probeVideoMeta } from "../../utils/videoMeta.util.js";
import { extractVideoThumbnail } from "../../utils/videoThumbnail.util.js";
import { FFMPEG_PATH } from "../../utils/ffmpeg.util.js";
import {
  DEFAULT_THUMBNAIL_EXTRACT_SECONDS,
  FALLBACK_THUMBNAIL_EXTRACT_SECONDS,
  MAX_SLIDE_DURATION_MS,
  MIN_DURATION_FOR_ADVANCED_THUMBNAIL_SECONDS,
} from "../../constants/videos.js";
import {
  InvalidParameterError,
  NoVideoChunksError,
  VideoEncodingFailedError,
  VideoNotFoundError,
} from "../../errors/video.error.js";
import { BaseError } from "../../errors/base.error.js";
import { prisma } from "../../db.config.js";

/**
 * Video Transcode 서비스
 * - 청크 병합 → HLS 변환 → GCS 업로드
 *
 * jobType: video_transcode
 */

export const videoTranscode = async (jobOrId) => {
  const jobId = typeof jobOrId === "object" ? jobOrId.id : jobOrId;

  // Job에서 videoId 조회
  const job = await getJobById(jobId);

  if (!job?.videoId) {
    throw new InvalidParameterError({ jobId }, "변환 작업에 videoId가 존재하지 않습니다.");
  }

  const video = await getVideoWithChunks(job.videoId);
  if (!video) {
    throw new VideoNotFoundError({ videoId: job.videoId });
  }

  if (!video.chunks || video.chunks.length === 0) {
    throw new NoVideoChunksError({ videoId: job.videoId });
  }

  // 상태를 processing으로 변경
  await updateVideoStatus(video.id, "processing");

  const workDir = tmpPath(`video-work-${jobId}`);
  const chunksDir = path.join(workDir, "chunks");
  const mergedExt = video.container === "webm" ? "webm" : "mp4";
  const mergedPath = path.join(workDir, `merged.${mergedExt}`);
  const hlsDir = path.join(workDir, "hls");

  try {
    await fs.mkdir(chunksDir, { recursive: true });
    await fs.mkdir(hlsDir, { recursive: true });

    // 1. 청크 다운로드
    await downloadChunks(video.chunks, chunksDir, mergedExt);

    // 2. 청크 병합
    await mergeChunks(chunksDir, mergedPath, video.chunks, mergedExt);

    // 메타데이터 추출
    const meta = await probeVideoMeta(mergedPath);

    // 썸네일 추출
    let thumbnailUrl = null;

    const atSeconds =
      meta.durationSeconds && meta.durationSeconds > MIN_DURATION_FOR_ADVANCED_THUMBNAIL_SECONDS
        ? DEFAULT_THUMBNAIL_EXTRACT_SECONDS
        : FALLBACK_THUMBNAIL_EXTRACT_SECONDS;

    try {
      thumbnailUrl = await extractVideoThumbnail({
        inputPath: mergedPath,
        videoId: video.id,
        atSeconds,
      });
    } catch (e) {
      console.warn("[VideoThumbnail] failed:", e.message);
    }

    await updateVideoMetadata(video.id, {
      durationSeconds: meta.durationSeconds,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      codec: meta.codec,
      thumbnailUrl,
    });

    // 마지막 슬라이드 전환 이벤트 조회
    const lastEvent = await prisma.videoSlideEvent.findFirst({
      where: { videoId: video.id },
      orderBy: { timestampMs: "desc" },
    });

    if (lastEvent && meta.durationSeconds) {
      const videoDurationMs = meta.durationSeconds * 1000;

      const lastDurationMs = Math.max(
        0,
        Math.min(videoDurationMs - lastEvent.timestampMs, MAX_SLIDE_DURATION_MS)
      );

      if (lastDurationMs > 0) {
        await prisma.videoSlideDuration.upsert({
          where: {
            videoId_slideId: {
              videoId: video.id,
              slideId: lastEvent.slideId,
            },
          },
          update: {
            totalDurationMs: {
              increment: lastDurationMs,
            },
          },
          create: {
            videoId: video.id,
            slideId: lastEvent.slideId,
            totalDurationMs: lastDurationMs,
          },
        });
      }
    }

    // 3. HLS 변환
    await encodeToHLS(mergedPath, hlsDir);

    // 4. GCS 업로드
    const hlsMasterUrl = await uploadHLSToGCS(hlsDir, video);

    // 5. DB 업데이트
    await updateVideoHlsUrl(video.id, hlsMasterUrl);

    return { ok: true, hlsMasterUrl };
  } catch (error) {
    await updateVideoStatus(video.id, "failed", { errorMessage: error.message });
    throw error instanceof BaseError ? error : new VideoEncodingFailedError({ videoId: video.id });
  } finally {
    // 임시 파일 정리
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};

// 1. GCS에서 청크들 다운로드 (병렬 처리, 동시 최대 5개)
const downloadChunks = async (chunks, destDir, ext) => {
  const limit = pLimit(5);

  await Promise.all(
    chunks.map((chunk) =>
      limit(async () => {
        const destPath = path.join(
          destDir,
          `chunk_${String(chunk.chunkIndex).padStart(5, "0")}.${ext}`
        );
        await downloadFromGCS({
          bucketName: chunk.storageBucket,
          objectKey: chunk.storageKey,
          destPath,
        });
      })
    )
  );
};

const FFMPEG = FFMPEG_PATH;

// 2. 청크들을 하나의 파일로 병합
const mergeChunks = async (chunksDir, outputPath, chunks, ext) => {
  // concat demuxer용 파일 목록 생성
  const listPath = path.join(chunksDir, "concat_list.txt");
  const fileList = chunks
    .map((c) => `file 'chunk_${String(c.chunkIndex).padStart(5, "0")}.${ext}'`)
    .join("\n");

  await fs.writeFile(listPath, fileList);

  // FFmpeg concat
  await runCmd(FFMPEG, ["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath], {
    cwd: chunksDir,
  });
};

// 3. HLS 변환 (다중 품질)
const encodeToHLS = async (inputPath, hlsDir) => {
  // 720p + 1080p 다중 품질 HLS 생성
  await runCmd(FFMPEG, [
    "-i",
    inputPath,
    // 720p 스트림
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v:0",
    "libx264",
    "-b:v:0",
    "2500k",
    "-s:v:0",
    "1280x720",
    "-c:a:0",
    "aac",
    "-b:a:0",
    "128k",
    // 1080p 스트림
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v:1",
    "libx264",
    "-b:v:1",
    "5000k",
    "-s:v:1",
    "1920x1080",
    "-c:a:1",
    "aac",
    "-b:a:1",
    "192k",
    // HLS 설정
    "-f",
    "hls",
    "-hls_time",
    "10",
    "-hls_list_size",
    "0",
    "-hls_segment_filename",
    path.join(hlsDir, "v%v/segment_%03d.ts"),
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    "v:0,a:0 v:1,a:1",
    path.join(hlsDir, "v%v/playlist.m3u8"),
  ]);
};

// 4. HLS 파일들을 GCS에 업로드
const uploadHLSToGCS = async (hlsDir, video) => {
  const env = envPrefix();
  const videoUuid = uuid();
  const destPrefix = `${env}/video/${video.id}/hls/${videoUuid}`;
  const bucketName = process.env.GCS_BUCKET_NAME;

  // master.m3u8 업로드
  const masterPath = path.join(hlsDir, "master.m3u8");
  await uploadToGCS({
    bucketName,
    srcPath: masterPath,
    objectKey: `${destPrefix}/master.m3u8`,
    contentType: "application/vnd.apple.mpegurl",
  });

  // 각 품질별 디렉토리 업로드
  const qualityDirs = ["v0", "v1"];
  for (const qDir of qualityDirs) {
    const qPath = path.join(hlsDir, qDir);
    const files = await listFiles(qPath).catch(() => []);

    for (const file of files) {
      const filename = path.basename(file);
      const ext = path.extname(filename).slice(1);
      const contentType = ext === "m3u8" ? "application/vnd.apple.mpegurl" : "video/mp2t";

      await uploadToGCS({
        bucketName,
        srcPath: file,
        objectKey: `${destPrefix}/${qDir}/${filename}`,
        contentType,
      });
    }
  }

  // CDN URL 반환 (또는 GCS URL)
  const cdnHost = process.env.CDN_HOST;
  if (cdnHost) {
    return `${cdnHost}/${destPrefix}/master.m3u8`;
  }
  return `gs://${bucketName}/${destPrefix}/master.m3u8`;
};

// 청크 삭제 로직
const cleanupChunks = async (video) => {
  const { Storage } = await import("@google-cloud/storage");
  const storage = new Storage();
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

  // GCS에서 청크 파일 삭제
  for (const chunk of video.chunks) {
    await bucket
      .file(chunk.storageKey)
      .delete()
      .catch(() => {});
  }

  // DB에서 청크 레코드 삭제
  await deleteVideoChunks(video.id);
};
