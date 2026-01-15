import { Storage } from "@google-cloud/storage";
import crypto from "crypto";
import { InvalidUploadError } from "../errors/files.error.js";
import { ALLOWED_CONTENT_TYPES, MAX_SIZE_BYTES } from "../constants/files.js";
import { extFromContentType } from "../utils/file-ext.util.js";

const storage = new Storage();

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new InvalidUploadError(null, "GCS_BUCKET_NAME_NOT_SET");
  }
  return storage.bucket(bucketName);
}

function buildObjectKey({ purpose, projectId, slideId, contentType }) {
  const env = process.env.NODE_ENV || "dev";
  const uuid = crypto.randomUUID();
  const ext = extFromContentType(contentType);
  if (!ext) {
    throw new InvalidUploadError({ contentType }, "UNSUPPORTED_CONTENT_TYPE");
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

  throw new InvalidUploadError({ purpose }, "INVALID_PURPOSE");
}

export async function createUploadUrl(body) {
  const { purpose, contentType, size, projectId, slideId } = body;

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new InvalidUploadError({ contentType }, "UNSUPPORTED_CONTENT_TYPE");
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE_BYTES) {
    throw new InvalidUploadError({ size }, "INVALID_FILE_SIZE");
  }
  if (purpose !== "presentation_file") {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new InvalidUploadError({ projectId }, "INVALID_PROJECT_ID");
    }
  }
  if (purpose === "slide_thumbnail" && (!Number.isInteger(slideId) || slideId <= 0)) {
    throw new InvalidUploadError({ slideId }, "INVALID_SLIDE_ID");
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
