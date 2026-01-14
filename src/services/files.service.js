import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { verifyUploadedObject } from "./gcs.service.js";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function fileExtFromContentType(contentType) {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    return "pptx";
  return null;
}

export async function completeFileUpload({ objectKey, projectId }) {
  // 기본 검증
  if (!objectKey || !Number.isInteger(projectId) || projectId <= 0) {
    throw new InvalidUploadError({ objectKey, projectId }, "INVALID_PROJECT_OR_OBJECT_KEY");
  }

  // objectKey 범위 검증
  const env = process.env.NODE_ENV || "dev";
  const allowedPrefix = `${env}/project/${projectId}/`;
  if (!objectKey.startsWith(allowedPrefix)) {
    throw new InvalidUploadError({ objectKey, allowedPrefix }, "INVALID_OBJECT_KEY_PREFIX");
  }

  // GCS 메타데이터 조회
  const meta = await verifyUploadedObject({ objectKey });

  // contentType 재검증
  if (!ALLOWED_CONTENT_TYPES.has(meta.contentType)) {
    throw new InvalidUploadError({ contentType: meta.contentType }, "UNSUPPORTED_CONTENT_TYPE");
  }

  // size 재검증
  if (!Number.isFinite(meta.size) || meta.size <= 0 || meta.size > MAX_SIZE_BYTES) {
    throw new InvalidUploadError({ size: meta.size, max: MAX_SIZE_BYTES }, "INVALID_FILE_SIZE");
  }

  const fileExt = fileExtFromContentType(meta.contentType);
  if (!fileExt) {
    throw new InvalidUploadError({ contentType: meta.contentType }, "UNSUPPORTED_FILE_EXTENSION");
  }

  // UploadedFile INSERT (업로드 확정)
  const uploadedFile = await prisma.uploadedFile.create({
    data: {
      projectId,
      originalFilename: objectKey.split("/").pop(),
      contentType: meta.contentType,
      fileExt,
      sizeBytes: meta.size,
      storageBucket: process.env.GCS_BUCKET_NAME,
      storageKey: objectKey,
      storageUrl: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectKey}`,
    },
  });

  // ConversionJob 생성 (파이프라인 트리거)
  const jobType = fileExt === "pptx" ? "pptx_to_images" : "pdf_to_images";

  const conversionJob = await prisma.conversionJob.create({
    data: {
      uploadedFileId: uploadedFile.id,
      jobType,
      status: "queued",
    },
  });

  return {
    uploadedFileId: uploadedFile.id,
    conversionJobId: conversionJob.id,
    status: conversionJob.status,
  };
}
