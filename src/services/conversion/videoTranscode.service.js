import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
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
 * - 청크 다운로드 → 병합(재인코딩) → HLS 변환 → GCS 업로드
 *  * jobType: video_transcode
 */

const FFMPEG = FFMPEG_PATH;

export const videoTranscode = async (jobOrId) => {
  const jobId = typeof jobOrId === "object" ? jobOrId.id : jobOrId;

  // 1. Job 및 비디오 정보 조회
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

  // 작업 시작: 상태를 processing으로 변경
  await updateVideoStatus(video.id, "processing");

  const workDir = tmpPath(`video-work-${jobId}`);
  const chunksDir = path.join(workDir, "chunks");

  // 업로드 컨테이너별 병합 경로 선택 (webm/mp4)
  const mergedExt = video.container === "mp4" ? "mp4" : "webm";

  //FFmpeg 인코딩 호환성을 위해 병합 파일은 .mp4로 고정
  const mergedPath = path.join(workDir, `merged.mp4`);
  const hlsDir = path.join(workDir, "hls");

  try {
    await fs.mkdir(chunksDir, { recursive: true });
    await fs.mkdir(hlsDir, { recursive: true });

    // 2. 청크 다운로드
    await downloadChunks(video.chunks, chunksDir, mergedExt);

    // 3. 청크 병합 (재인코딩)
    await mergeChunks(chunksDir, mergedPath, video.chunks, mergedExt);

    // 4. 메타데이터 및 썸네일 추출
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

    // DB에 비디오 정보 업데이트
    await updateVideoMetadata(video.id, {
      durationSeconds: meta.durationSeconds,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      codec: meta.codec,
      thumbnailUrl,
    });

    // 5. 슬라이드 듀레이션 계산
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
          create: {
            videoId: video.id,
            slideId: lastEvent.slideId,
            totalDurationMs: lastDurationMs,
          },
        });
      }
    }

    // 6. HLS 변환 및 업로드
    await encodeToHLS(mergedPath, hlsDir);
    const hlsMasterUrl = await uploadHLSToGCS(hlsDir, video);

    // 트랜스코딩이 완료되면 원본 청크 메타데이터 정리
    await deleteVideoChunks(video.id);

    // 최종 HLS URL 업데이트
    await updateVideoHlsUrl(video.id, hlsMasterUrl);

    return { ok: true, hlsMasterUrl };
  } catch (error) {
    console.error("======= FFmpeg Transcoding Error =======");
    console.error(error);
    await updateVideoStatus(video.id, "failed", { errorMessage: error.message });
    throw error instanceof BaseError ? error : new VideoEncodingFailedError({ videoId: video.id });
  } finally {
    // 임시 파일 정리 (성공/실패 여부 관계없이 수행)
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};

/**
 * GCS에서 청크 파일들을 병렬로 다운로드
 */
const downloadChunks = async (chunks, destDir, ext) => {
  const limit = pLimit(5); // 동시 다운로드 제한
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

const buildOrderedChunkPaths = (chunksDir, orderedChunks, ext) =>
  orderedChunks.map((chunk) =>
    path.join(chunksDir, `chunk_${String(chunk.chunkIndex).padStart(5, "0")}.${ext}`)
  );

/**
 * 청크로 만든 입력(webm/mp4, concat list 포함)을 "중간 mp4"로 통일합니다.
 * 왜 필요하나:
 * - 브라우저/청크마다 타임스탬프가 흔들릴 수 있어서(+genpts, make_zero) 먼저 정규화해야
 *   뒤 HLS 변환에서 길이/싱크가 안정적입니다.
 * - 코덱을 libx264+aac으로 고정해 플레이어 호환성을 높입니다.
 * - aresample=async로 오디오 타임라인을 보정해 소리 싱크 깨짐을 줄입니다.
 */
const transcodeToIntermediateMp4 = async (inputPath, outputPath, chunksDir, mode = "raw") => {
  const inputArgs =
    mode === "concat"
      ? ["-f", "concat", "-safe", "0", "-i", inputPath]
      : ["-i", inputPath];

  await runCmd(
    FFMPEG,
    [
      "-fflags",
      "+genpts",
      "-avoid_negative_ts",
      "make_zero",
      ...inputArgs,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-af",
      "aresample=async=1:first_pts=0",
      "-movflags",
      "+faststart",
      "-max_muxing_queue_size",
      "1024",
      "-y",
      outputPath,
    ],
    { cwd: chunksDir }
  );
};

const mergeByConcatDemuxer = async (chunkPaths, outputPath, chunksDir) => {
  const concatListPath = path.join(chunksDir, "concat.txt");
  const concatContent = chunkPaths
    .map((chunkPath) => `file '${path.basename(chunkPath).replaceAll("'", "'\\''")}'`)
    .join("\n");
  await fs.writeFile(concatListPath, `${concatContent}\n`, "utf-8");
  await transcodeToIntermediateMp4(concatListPath, outputPath, chunksDir, "concat");
};

const mergeByRawAppend = async (orderedChunks, chunksDir, ext) => {
  const assembledInputPath = path.join(chunksDir, `assembled.${ext}`);
  const chunkPaths = buildOrderedChunkPaths(chunksDir, orderedChunks, ext);

  for (let i = 0; i < chunkPaths.length; i += 1) {
    await pipeline(
      createReadStream(chunkPaths[i]),
      createWriteStream(assembledInputPath, { flags: i === 0 ? "w" : "a" })
    );
  }

  return assembledInputPath;
};

/**
 * 청크 병합 + 중간 mp4 생성
 * - webm: raw append 고정 (MediaRecorder timeslice 안정성)
 * - mp4: concat demuxer 우선, 실패 시 raw append 폴백
 */
const mergeChunks = async (chunksDir, outputPath, chunks, ext) => {
  const orderedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const firstIndex = orderedChunks[0]?.chunkIndex;
  if (firstIndex !== 0) {
    throw new InvalidParameterError({ firstIndex }, "청크 인덱스는 0부터 연속이어야 합니다.");
  }

  for (let i = 1; i < orderedChunks.length; i += 1) {
    const expected = orderedChunks[i - 1].chunkIndex + 1;
    if (orderedChunks[i].chunkIndex !== expected) {
      throw new InvalidParameterError(
        {
          prevChunkIndex: orderedChunks[i - 1].chunkIndex,
          currentChunkIndex: orderedChunks[i].chunkIndex,
        },
        "청크 인덱스가 연속되지 않아 원본 영상을 재조립할 수 없습니다."
      );
    }
  }

  if (ext === "webm") {
    const assembledInputPath = await mergeByRawAppend(orderedChunks, chunksDir, ext);
    await transcodeToIntermediateMp4(assembledInputPath, outputPath, chunksDir);
    console.log("[VideoTranscode] webm chunk merge succeeded with raw append");
    return;
  }

  const chunkPaths = buildOrderedChunkPaths(chunksDir, orderedChunks, ext);
  try {
    await mergeByConcatDemuxer(chunkPaths, outputPath, chunksDir);
    console.log("[VideoTranscode] mp4 chunk merge succeeded with concat demuxer");
    return;
  } catch (concatError) {
    const concatMessage =
      concatError?.message?.split("\n").slice(0, 6).join("\n") || String(concatError);
    console.warn(`[VideoTranscode] mp4 concat merge failed, fallback to raw append\n${concatMessage}`);
  }

  const assembledInputPath = await mergeByRawAppend(orderedChunks, chunksDir, ext);
  await transcodeToIntermediateMp4(assembledInputPath, outputPath, chunksDir);
  console.log("[VideoTranscode] mp4 chunk merge succeeded with raw append fallback");
};

/**
 * 중간 mp4를 실제 서비스 재생용 HLS(master.m3u8 + segment.ts)로 변환합니다.
 * 왜 필요하나:
 * - 720p 고정(scale+pad)으로 화면 크기를 일정하게 맞춰 디바이스별 재생 차이를 줄입니다.
 * - GOP(키프레임 간격)을 고정해 HLS 세그먼트 경계를 안정화합니다.
 * - independent_segments로 각 세그먼트 시작을 독립 재생 가능하게 만듭니다.
 */
const encodeToHLS = async (inputPath, hlsDir) => {
  await runCmd(FFMPEG, [
    "-i",
    inputPath,
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "60",
    "-keyint_min",
    "60",
    "-sc_threshold",
    "0",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-af",
    "aresample=async=1",
    "-f",
    "hls",
    "-hls_time",
    "10",
    "-hls_list_size",
    "0",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    path.join(hlsDir, "segment_%03d.ts"),
    path.join(hlsDir, "master.m3u8"),
  ]);
};

/**
 * 생성된 HLS 파일들을 GCS에 업로드
 */
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
  return cdnHost
    ? `${cdnHost}/${destPrefix}/master.m3u8`
    : `gs://${bucketName}/${destPrefix}/master.m3u8`;
};
