import {
  createConversionJob,
  updateJobToProcessing,
  updateJobToCompleted,
  updateJobToFailed,
  getJobById,
} from "../repositories/conversionJob.repository.js";
import { enqueueConversionTask } from "../queues/conversion-job.queue.js";
import { pptxToImages } from "./conversion/pptxToImages.service.js";
import { pdfToImages } from "./conversion/pdfToImages.service.js";
import { generateThumbnail } from "./conversion/thumbnail.service.js";
import { extractMetadata } from "./conversion/metadata.service.js";
import { videoTranscode } from "./conversion/videoTranscode.service.js";
import { prisma } from "../db.config.js";

/**
 * 작업 생성 및 큐에 추가
 */
const createAndEnqueueJob = async ({ uploadedFileId, videoId, jobType }) => {
  const job = await createConversionJob({ uploadedFileId, videoId, jobType });

  if (!process.env.GCP_PROJECT_ID || !process.env.CLOUD_RUN_SERVICE_URL) {
    // 로컬 테스트용
    processJob(job.id.toString(), jobType).catch((error) => {
      console.error(`[Local-Job-Runner] Job ${job.id} failed:`, error);
    });
  } else {
    await enqueueConversionTask({
      conversionJobId: job.id.toString(),
      jobType,
    });
  }

  return job;
};

/**
 * 작업 실행 (jobType에 따라 적절한 처리 함수 호출)
 */
const executeJob = async (conversionJobId, jobType) => {
  switch (jobType) {
    case "pptx_to_images":
      return await pptxToImages(conversionJobId);
    case "pdf_to_images":
      return await pdfToImages(conversionJobId);
    case "generate_thumbnail":
      return await generateThumbnail(conversionJobId);
    case "extract_metadata":
      return await extractMetadata(conversionJobId);
    case "video_transcode":
      return await videoTranscode(conversionJobId);
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
};

/**
 * 이미지 변환 완료 후 썸네일 생성 작업 체이닝
 */
const chainThumbnailJob = async (parentJobId) => {
  try {
    const parentJob = await getJobById(parentJobId);

    if (!parentJob?.uploadedFileId) {
      console.warn(`Cannot chain thumbnail job: parent job ${parentJobId} not found`);
      return;
    }

    const thumbnailJob = await createAndEnqueueJob({
      uploadedFileId: parentJob.uploadedFileId,
      jobType: "generate_thumbnail",
    });

    console.log(`Chained thumbnail job ${thumbnailJob.id} from parent ${parentJobId}`);
  } catch (error) {
    console.error(`Failed to chain thumbnail job from ${parentJobId}:`, error);
  }
};

/**
 * 이미지 변환 완료 후 메타데이터 추출 작업 체이닝
 */
const chainMetadataJob = async (parentJobId) => {
  try {
    const parentJob = await getJobById(parentJobId);

    if (!parentJob?.uploadedFileId) {
      console.warn(`Cannot chain metadata job: parent job ${parentJobId} not found`);
      return;
    }

    const metadataJob = await createAndEnqueueJob({
      uploadedFileId: parentJob.uploadedFileId,
      jobType: "extract_metadata",
    });

    console.log(`Chained metadata job ${metadataJob.id} from parent ${parentJobId}`);
  } catch (error) {
    console.error(`Failed to chain metadata job from ${parentJobId}:`, error);
  }
};

/**
 * 작업 처리 메인 로직
 * - 상태 관리 (processing → completed/failed)
 * - 작업 실행
 * - 체이닝 처리
 */
export const processJob = async (conversionJobId, jobType) => {
  const existingJob = await getJobById(conversionJobId);
  if (existingJob.status === "completed") {
    return { success: true };
  }

  try {
    await updateJobToProcessing(conversionJobId);

    const result = await executeJob(conversionJobId, jobType);

    // 이미지 변환 완료 후 썸네일 + 메타데이터 작업 체이닝
    if ((jobType === "pptx_to_images" || jobType === "pdf_to_images") && result?.ok) {
      await Promise.all([chainThumbnailJob(conversionJobId), chainMetadataJob(conversionJobId)]);
    }

    await updateJobToCompleted(conversionJobId);

    return { success: true };
  } catch (error) {
    console.error(`Job ${conversionJobId} failed:`, error);

    try {
      await updateJobToFailed(conversionJobId, error.message);
    } catch (dbError) {
      console.error(`Failed to update job ${conversionJobId} status:`, dbError);
    }

    return { success: false, error: error.message };
  }
};

/**
 * 파일 업로드 완료 후 파이프라인 시작
 *
 * 실행 순서:
 * 1. pptx_to_images 또는 pdf_to_images (파일 확장자에 따라)
 * 2. 이미지 변환 완료 후 체이닝:
 *    - generate_thumbnail
 *    - extract_metadata
 */
export const startConversionPipeline = async ({ uploadedFileId, fileExt }) => {
  const ext = fileExt.toLowerCase();

  let imageConversionJobType;
  if (ext === "pptx") {
    imageConversionJobType = "pptx_to_images";
  } else if (ext === "pdf") {
    imageConversionJobType = "pdf_to_images";
  } else {
    console.warn(`[Pipeline] Unsupported file type: ${fileExt}. Skipping pipeline.`);
    return { jobs: [] };
  }

  // 이미지 변환 작업만 먼저 시작 (메타데이터는 이미지 변환 완료 후 체이닝됨)
  const imageJob = await createAndEnqueueJob({
    uploadedFileId,
    jobType: imageConversionJobType,
  });

  console.log(`[Pipeline] Started for file ${uploadedFileId}:`, {
    imageJob: imageJob.id.toString(),
  });

  return {
    jobs: [{ id: imageJob.id.toString(), jobType: imageConversionJobType }],
  };
};

/**
 * 영상 녹화 완료 후 인코딩 파이프라인 시작
 *
 * - video_transcode: 청크 병합 → HLS 변환 → GCS 업로드
 */
export const startVideoEncodingPipeline = async ({ videoId, uploadedFileId }) => {
  const job = await createAndEnqueueJob({
    videoId,
    uploadedFileId,
    jobType: "video_transcode",
  });

  console.log(`[Pipeline] Video encoding started for video ${videoId}:`, {
    jobId: job.id.toString(),
  });

  return {
    job: { id: job.id.toString(), jobType: "video_transcode" },
  };
};
