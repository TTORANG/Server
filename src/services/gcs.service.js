import { Storage } from "@google-cloud/storage";
import { InvalidUploadError } from "../errors/files.error.js";

const storage = new Storage();
const DEFAULT_SIGNED_URL_EXPIRES_SEC = 900;

function getBucketName() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new InvalidUploadError(null, "GCS 버킷 이름이 설정되어 있지 않습니다.");
  }
  return bucketName;
}

function getBucket() {
  return storage.bucket(getBucketName());
}

function getSignedUrlExpiresSec() {
  const raw = Number.parseInt(process.env.GCS_UPLOAD_SIGNED_URL_EXPIRES_SEC ?? "", 10);
  if (Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  return DEFAULT_SIGNED_URL_EXPIRES_SEC;
}

export async function createSignedUploadUrl({ objectKey, contentType }) {
  if (!objectKey || typeof objectKey !== "string") {
    throw new InvalidUploadError({ objectKey }, "유효한 objectKey가 필요합니다.");
  }
  if (!contentType || typeof contentType !== "string") {
    throw new InvalidUploadError({ contentType }, "유효한 contentType이 필요합니다.");
  }

  const bucket = getBucket();
  const file = bucket.file(objectKey);
  const expiresAt = new Date(Date.now() + getSignedUrlExpiresSec() * 1000);

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType,
  });

  return {
    objectKey,
    uploadUrl,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getObjectMetadata({ objectKey }) {
  if (!objectKey || typeof objectKey !== "string") {
    throw new InvalidUploadError({ objectKey }, "유효한 objectKey가 필요합니다.");
  }

  const [metadata] = await getBucket().file(objectKey).getMetadata();
  return metadata;
}

export async function uploadBufferToGCS({ objectKey, buffer, contentType }) {
  const file = getBucket().file(objectKey);

  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: { contentType },
  });

  return {
    storageBucket: getBucketName(),
    storageKey: objectKey,
    url: `https://storage.googleapis.com/${getBucketName()}/${objectKey}`,
  };
}
