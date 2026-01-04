import { Storage } from "@google-cloud/storage";
import crypto from "crypto";

const storage = new Storage();

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME_NOT_SET");
  }
  return storage.bucket(bucketName);
}

const PPTX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
  PPTX_CONTENT_TYPE,
]);

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 수정 가능

function extFromContentType(contentType) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "application/pdf":
      return "pdf";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    default:
      return null;
  }
}

function buildObjectKey({ purpose, projectId, slideId, contentType }) {
  const env = process.env.NODE_ENV || "dev";
  const uuid = crypto.randomUUID();
  const ext = extFromContentType(contentType);
  if (!ext) throw new Error("UNSUPPORTED_CONTENT_TYPE");

  if (purpose === "project_thumbnail") {
    return `${env}/project/${projectId}/thumbnail/${uuid}.${ext}`;
  }
  if (purpose === "slide_thumbnail") {
    return `${env}/slide/${projectId}/${slideId}/thumbnail/${uuid}.${ext}`;
  }

  throw new Error("INVALID_PURPOSE");
}

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function createUploadUrl(body) {
  const { purpose, contentType, size, projectId, slideId } = body;

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw createHttpError(400, "UNSUPPORTED_CONTENT_TYPE");
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE_BYTES) {
    throw createHttpError(400, "INVALID_SIZE");
  }
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw createHttpError(400, "INVALID_PROJECT_ID");
  }
  if (purpose === "slide_thumbnail" && (!Number.isInteger(slideId) || slideId <= 0)) {
    throw createHttpError(400, "INVALID_SLIDE_ID");
  }

  const objectKey = buildObjectKey({ purpose, projectId, slideId, contentType });

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
