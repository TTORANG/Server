import { ALLOWED_CONTENT_TYPES, MAX_SIZE_BYTES } from "../constants/files.js";
import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { extFromContentType } from "../utils/file-ext.util.js";
import { verifyUploadedObject } from "./gcs.service.js";

export async function completeFileUpload({ objectKey }) {
  // objectKey 범위 검증
  const env = process.env.NODE_ENV || "dev";
  if (!objectKey) {
    throw new InvalidUploadError({ objectKey }, "INVALID_OBJECT_KEY");
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

  const fileExt = extFromContentType(meta.contentType);
  if (!fileExt) {
    throw new InvalidUploadError({ contentType: meta.contentType }, "UNSUPPORTED_FILE_EXTENSION");
  }

  // UploadedFile INSERT (업로드 확정)
  const uploadedFile = await prisma.uploadedFile.create({
    data: {
      projectId: null,
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
  const jobType =
    fileExt === "pptx" ? "pptx_to_images" : fileExt === "pdf" ? "pdf_to_images" : null;

  const conversionJob = await prisma.conversionJob.create({
    data: {
      uploadedFileId: uploadedFile.id,
      jobType,
      status: "queued",
    },
  });

  return {
    uploadedFileId: uploadedFile.id.toString(),
    conversionJobId: conversionJob.id.toString(),
    status: conversionJob.status,
  };
}
