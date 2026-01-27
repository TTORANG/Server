import { ALLOWED_CONTENT_TYPES, MAX_SIZE_BYTES } from "../constants/files.js";
import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { extFromContentType } from "../utils/file-ext.util.js";
// import { verifyUploadedObject } from "./gcs.service.js";
import crypto from "crypto";
import { uploadBufferToGCS } from "./gcs.service.js";
import { startConversionPipeline, startVideoEncodingPipeline } from "./conversion-job.service.js";

export async function uploadPresentationAndCreateProject({ userId, title, file }) {
  if (!file) {
    throw new InvalidUploadError(null, "업로드할 파일이 필요합니다.");
  }
  const { originalname, mimetype, size, buffer } = file;

  // 검증
  if (!ALLOWED_CONTENT_TYPES.has(mimetype)) {
    throw new InvalidUploadError({ contentType: mimetype }, "지원하지 않는 파일 형식입니다.");
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE_BYTES) {
    throw new InvalidUploadError({ size, max: MAX_SIZE_BYTES }, "파일 크기는 최대 50MB입니다.");
  }

  // 확장자 결정
  const ext = extFromContentType(mimetype);
  if (!ext || !["pptx", "pdf", "mp4", "webm"].includes(ext)) {
    throw new InvalidUploadError({ contentType: mimetype }, "지원하지 않는 파일 형식입니다.");
  }

  // objectKey
  const env = process.env.NODE_ENV || "dev";
  const uuid = crypto.randomUUID();
  const objectKey = `${env}/upload/temp/${uuid}.${ext}`;

  // GCS 업로드
  const uploaded = await uploadBufferToGCS({
    objectKey,
    buffer,
    contentType: mimetype,
  });

  // sha256
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  // 5) DB 생성
  const { project, uf } = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        userId: BigInt(userId),
        title: title?.trim() ? title.trim() : originalname,
      },
    });

    const uf = await tx.uploadedFile.create({
      data: {
        projectId: project.id,
        originalFilename: originalname,
        contentType: mimetype,
        fileExt: ext,
        sizeBytes: BigInt(size),
        sha256,
        storageBucket: uploaded.storageBucket,
        storageKey: uploaded.storageKey,
        storageUrl: uploaded.url,
      },
    });

    return { project, uf };
  });

  // 변환 파이프라인 시작
  let pipeline = null;

  if (ext === "pptx" || ext === "pdf") {
    pipeline = await startConversionPipeline({
      uploadedFileId: uf.id,
      fileExt: ext,
    });
  }
  if (ext === "mp4" || ext === "webm") {
    pipeline = await startVideoEncodingPipeline({
      projectId: project.id,
      uploadedFileId: uf.id,
    });
  }

  return {
    projectId: project.id.toString(),
  };
}

// export async function completeFileUpload({ objectKey }) {
//   // objectKey 범위 검증
//   const env = process.env.NODE_ENV || "dev";
//   if (!objectKey) {
//     throw new InvalidUploadError({ objectKey }, "INVALID_OBJECT_KEY");
//   }

//   // GCS 메타데이터 조회
//   const meta = await verifyUploadedObject({ objectKey });

//   // contentType 재검증
//   if (!ALLOWED_CONTENT_TYPES.has(meta.contentType)) {
//     throw new InvalidUploadError({ contentType: meta.contentType }, "UNSUPPORTED_CONTENT_TYPE");
//   }

//   // size 재검증
//   if (!Number.isFinite(meta.size) || meta.size <= 0 || meta.size > MAX_SIZE_BYTES) {
//     throw new InvalidUploadError({ size: meta.size, max: MAX_SIZE_BYTES }, "INVALID_FILE_SIZE");
//   }

//   const fileExt = extFromContentType(meta.contentType);
//   if (!fileExt) {
//     throw new InvalidUploadError({ contentType: meta.contentType }, "UNSUPPORTED_FILE_EXTENSION");
//   }

//   // UploadedFile INSERT (업로드 확정)
//   const uploadedFile = await prisma.uploadedFile.create({
//     data: {
//       projectId: null,
//       originalFilename: objectKey.split("/").pop(),
//       contentType: meta.contentType,
//       fileExt,
//       sizeBytes: meta.size,
//       storageBucket: process.env.GCS_BUCKET_NAME,
//       storageKey: objectKey,
//       storageUrl: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectKey}`,
//     },
//   });

//   // ConversionJob 생성 (파이프라인 트리거)
//   const jobType =
//     fileExt === "pptx" ? "pptx_to_images" : fileExt === "pdf" ? "pdf_to_images" : null;

//   const conversionJob = await prisma.conversionJob.create({
//     data: {
//       uploadedFileId: uploadedFile.id,
//       jobType,
//       status: "queued",
//     },
//   });

//   return {
//     uploadedFileId: uploadedFile.id.toString(),
//     conversionJobId: conversionJob.id.toString(),
//     status: conversionJob.status,
//   };
// }
