import { ALLOWED_CONTENT_TYPES, MAX_SIZE_BYTES } from "../constants/files.js";
import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { extFromContentType } from "../utils/fileExt.util.js";
import crypto from "crypto";
import { uploadBufferToGCS } from "./gcs.service.js";
import { startConversionPipeline } from "./conversionJob.service.js";

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
  if (!ext || !["pptx", "pdf"].includes(ext)) {
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

  if (ext === "pptx" || ext === "pdf") {
    await startConversionPipeline({
      uploadedFileId: uf.id,
      fileExt: ext,
    });
  }

  return {
    projectId: project.id.toString(),
  };
}
