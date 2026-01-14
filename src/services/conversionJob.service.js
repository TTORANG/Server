import {
  createConversionJob,
  updateJobToProcessing,
  updateJobToCompleted,
  updateJobToFailed,
  getJobById,
} from "../repositories/conversionJob.repository.js";
import { enqueueConversionTask } from "../queues/conversionJob.queue.js";
import { pptxToImages } from "./conversion/pptx-to-images.service.js";
import { pdfToImages } from "./conversion/pdf-to-images.service.js";
import { generateThumbnail } from "./conversion/thumbnail.service.js";
import { extractMetadata } from "./conversion/metadata.service.js";

/**
 * 작업 생성 및 큐에 추가
 */
const createAndEnqueueJob = async ({ uploadedFileId, jobType }) => {
  const job = await createConversionJob({ uploadedFileId, jobType });

  await enqueueConversionTask({
    conversionJobId: job.id.toString(),
    jobType,
  });

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
 * 작업 처리 메인 로직
 * - 상태 관리 (processing → completed/failed)
 * - 작업 실행
 * - 체이닝 처리
 */
export const processJob = async (conversionJobId, jobType) => {
  try {
    await updateJobToProcessing(conversionJobId);

    const result = await executeJob(conversionJobId, jobType);

    // 이미지 변환 완료 후 썸네일 작업 체이닝
    if ((jobType === "pptx_to_images" || jobType === "pdf_to_images") && result?.ok) {
      await chainThumbnailJob(conversionJobId);
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
 * 병렬 실행:
 * - pptx_to_images 또는 pdf_to_images (파일 확장자에 따라)
 * - extract_metadata
 *
 * 체이닝 (이미지 변환 완료 후):
 * - generate_thumbnail (processJob에서 체이닝)
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

  const [imageJob, metadataJob] = await Promise.all([
    createAndEnqueueJob({
      uploadedFileId,
      jobType: imageConversionJobType,
    }),
    createAndEnqueueJob({
      uploadedFileId,
      jobType: "extract_metadata",
    }),
  ]);

  console.log(`[Pipeline] Started for file ${uploadedFileId}:`, {
    imageJob: imageJob.id.toString(),
    metadataJob: metadataJob.id.toString(),
  });

  return {
    jobs: [
      { id: imageJob.id.toString(), jobType: imageConversionJobType },
      { id: metadataJob.id.toString(), jobType: "extract_metadata" },
    ],
  };
};
