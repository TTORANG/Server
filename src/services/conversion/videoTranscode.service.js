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

const FFMPEG = FFMPEG_PATH;

export const videoTranscode = async (jobOrId) => {
  const jobId = typeof jobOrId === "object" ? jobOrId.id : jobOrId;

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

  await updateVideoStatus(video.id, "processing");

  const workDir = tmpPath(`video-work-${jobId}`);
  const chunksDir = path.join(workDir, "chunks");
  const mergedExt = video.container === "webm" ? "webm" : "mp4";
  // const mergedPath = path.join(workDir, `merged.${mergedExt}`);
  const mergedPath = path.join(workDir, `merged.mp4`);
  const hlsDir = path.join(workDir, "hls");

  try {
    await fs.mkdir(chunksDir, { recursive: true });
    await fs.mkdir(hlsDir, { recursive: true });

    await downloadChunks(video.chunks, chunksDir, mergedExt);
    await mergeChunks(chunksDir, mergedPath, video.chunks, mergedExt);

    const meta = await probeVideoMeta(mergedPath);

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
          where: { videoId_slideId: { videoId: video.id, slideId: lastEvent.slideId } },
          update: { totalDurationMs: { increment: lastDurationMs } },
          create: { videoId: video.id, slideId: lastEvent.slideId, totalDurationMs: lastDurationMs },
        });
      }
    }

    await encodeToHLS(mergedPath, hlsDir);
    const hlsMasterUrl = await uploadHLSToGCS(hlsDir, video);
    await updateVideoHlsUrl(video.id, hlsMasterUrl);

    return { ok: true, hlsMasterUrl };
  } catch (error) {
    console.error("======= FFmpeg Transcoding Error =======");
    console.error(error);
    await updateVideoStatus(video.id, "failed", { errorMessage: error.message });
    throw error instanceof BaseError ? error : new VideoEncodingFailedError({ videoId: video.id });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};

const downloadChunks = async (chunks, destDir, ext) => {
  const limit = pLimit(5);
  await Promise.all(
      chunks.map((chunk) =>
          limit(async () => {
            const destPath = path.join(destDir, `chunk_${String(chunk.chunkIndex).padStart(5, "0")}.${ext}`);
            await downloadFromGCS({ bucketName: chunk.storageBucket, objectKey: chunk.storageKey, destPath });
          })
      )
  );
};

const mergeChunks = async (chunksDir, outputPath, chunks, ext) => {
  const listPath = path.join(chunksDir, "concat_list.txt");
  const fileList = chunks
      .map((c) => `file 'chunk_${String(c.chunkIndex).padStart(5, "0")}.${ext}'`)
      .join("\n");

  await fs.writeFile(listPath, fileList);

  await runCmd(FFMPEG, [
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-pix_fmt", "yuv420p", // 호환성 높은 픽셀 포맷
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "faststart", // 스트리밍 최적화
    "-y", // 기존 파일 덮어쓰기 허용
    outputPath // 여기서 outputPath는 .mp4여야 함
  ], { cwd: chunksDir });
};

const encodeToHLS = async (inputPath, hlsDir) => {
  await runCmd(FFMPEG, [
    "-i", inputPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-s", "1280x720",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ac", "2",
    "-af", "aresample=async=1", // 인코딩 시에도 오디오 누락 방지
    "-f", "hls",
    "-hls_time", "10",
    "-hls_list_size", "0",
    "-hls_segment_filename", path.join(hlsDir, "segment_%03d.ts"),
    path.join(hlsDir, "master.m3u8")
  ]);
};

const uploadHLSToGCS = async (hlsDir, video) => {
  const env = envPrefix();
  const videoUuid = uuid();
  const destPrefix = `${env}/video/${video.id}/hls/${videoUuid}`;
  const bucketName = process.env.GCS_BUCKET_NAME;

  const files = await listFiles(hlsDir).catch(() => []);

  for (const file of files) {
    const filename = path.basename(file);
    const ext = path.extname(filename).slice(1);
    const contentType = ext === "m3u8" ? "application/vnd.apple.mpegurl" : "video/mp2t";

    await uploadToGCS({
      bucketName,
      srcPath: file,
      objectKey: `${destPrefix}/${filename}`,
      contentType,
    });
  }

  const cdnHost = process.env.CDN_HOST;
  return cdnHost ? `${cdnHost}/${destPrefix}/master.m3u8` : `gs://${bucketName}/${destPrefix}/master.m3u8`;
};