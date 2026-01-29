import { Storage } from "@google-cloud/storage";
import { InvalidUploadError } from "../errors/files.error.js";

const storage = new Storage();

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new InvalidUploadError(null, "GCS 버킷 이름이 설정되어 있지 않습니다.");
  }
  return storage.bucket(bucketName);
}

export async function uploadBufferToGCS({ objectKey, buffer, contentType }) {
  const file = getBucket().file(objectKey);

  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: { contentType },
  });

  return {
    storageBucket: process.env.GCS_BUCKET_NAME,
    storageKey: objectKey,
    url: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectKey}`,
  };
}
