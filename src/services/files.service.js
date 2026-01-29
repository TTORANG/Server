import { ALLOWED_CONTENT_TYPES, MAX_SIZE_BYTES } from "../constants/files.js";
import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { extFromContentType } from "../utils/file-ext.util.js";
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
  const { project, uf, video } = await prisma.$transaction(async (tx) => {
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

    // mp4/webm이면 video 생성
    let video = null;
    if (ext === "mp4" || ext === "webm") {
      video = await tx.video.create({
        data: {
          projectId: project.id,
          title: title?.trim() ? title.trim() : originalname,
          // 파일 업로드는 이미 끝난 상태이므로 바로 processing으로 두고 인코딩 큐잉
          status: "processing",
          sourceStorageBucket: uploaded.storageBucket,
          sourceStorageKey: uploaded.storageKey,
          sourceUrl: uploaded.url,
          container: ext, // mp4 | webm
        },
        select: { id: true },
      });
    }

    return { project, uf, video };
  });

  if (ext === "pptx" || ext === "pdf") {
    await startConversionPipeline({
      uploadedFileId: uf.id,
      fileExt: ext,
    });
  } else if (ext === "mp4" || ext === "webm") {
    await startVideoEncodingPipeline({
      videoId: video.id,
      uploadedFileId: uf.id,
    });
  }

  return {
    projectId: project.id.toString(),
  };
}
