import { Storage } from "@google-cloud/storage";
import crypto from "crypto";
import { InvalidUploadError } from "../errors/files.error.js";
import { ALLOWED_CONTENT_TYPES, MAX_SIZE_BYTES } from "../constants/files.js";
import { extFromContentType } from "../utils/file-ext.util.js";

const storage = new Storage();

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new InvalidUploadError(null, "GCS 버킷 이름이 설정되어 있지 않습니다.");
  }
  return storage.bucket(bucketName);
}

function buildObjectKey({ purpose, projectId, slideId, contentType, videoId, chunkIndex }) {
  const env = process.env.NODE_ENV || "dev";
  const uuid = crypto.randomUUID();
  const ext = extFromContentType(contentType);
  if (!ext) {
    throw new InvalidUploadError({ contentType }, "지원하지 않는 파일 형식입니다.");
  }

  if (purpose === "project_thumbnail") {
    return `${env}/project/${projectId}/thumbnail/${uuid}.${ext}`;
  }
  if (purpose === "slide_thumbnail") {
    return `${env}/slide/${projectId}/${slideId}/thumbnail/${uuid}.${ext}`;
  }
  if (purpose === "presentation_file") {
    return `${env}/upload/temp/${uuid}.${ext}`;
  }
  if (purpose === "video_chunk") {
    return `${env}/project/${projectId}/video/${videoId}/chunks/${chunkIndex}/${uuid}.${ext}`;
  }

  throw new InvalidUploadError({ purpose }, "업로드 목적이 올바르지 않습니다.");
}

export async function createUploadUrl(body) {
  const { purpose, contentType, size, projectId, slideId, videoId, chunkIndex } = body;

  if (purpose === "video_chunk") {
    if (contentType !== "video/webm") {
      throw new InvalidUploadError(
        { contentType },
        "비디오 청크는 webm 형식만 업로드할 수 있습니다."
      );
    }
  } else {
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new InvalidUploadError({ contentType }, "지원하지 않는 파일 형식입니다.");
    }
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE_BYTES) {
    throw new InvalidUploadError(
      { size, max: MAX_SIZE_BYTES },
      "파일 크기가 허용 범위를 초과했습니다."
    );
  }
  if (purpose !== "presentation_file") {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new InvalidUploadError({ projectId }, "프로젝트 ID가 올바르지 않습니다.");
    }
  }
  if (purpose === "slide_thumbnail" && (!Number.isInteger(slideId) || slideId <= 0)) {
    throw new InvalidUploadError({ slideId }, "슬라이드 ID가 올바르지 않습니다.");
  }
  if (purpose === "video_chunk") {
    if (!Number.isInteger(videoId) || videoId <= 0) {
      throw new InvalidUploadError({ videoId }, "비디오 ID가 올바르지 않습니다.");
    }
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      throw new InvalidUploadError({ chunkIndex }, "비디오 청크 인덱스가 올바르지 않습니다.");
    }
  }

  const objectKey = buildObjectKey({
    purpose,
    projectId,
    slideId,
    contentType,
    videoId,
    chunkIndex,
  });

  const expiresSec = Number(process.env.SIGNED_URL_EXPIRES_SEC || 600);
  const expiresAt = new Date(Date.now() + expiresSec * 1000);

  const file = getBucket().file(objectKey);

  // PUT 업로드용 Signed URL
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType,
  });

  return { objectKey, uploadUrl, expiresAt: expiresAt.toISOString() };
}

export async function verifyUploadedObject({ objectKey }) {
  const file = getBucket().file(objectKey);
  const [meta] = await file.getMetadata();

  return {
    objectKey,
    size: Number(meta.size || 0),
    contentType: meta.contentType || "",
    updated: meta.updated || null,
    etag: meta.etag || null,
  };
}
