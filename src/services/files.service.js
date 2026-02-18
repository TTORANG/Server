import { ALLOWED_CONTENT_TYPES, MAX_SIZE_BYTES } from "../constants/files.js";
import { prisma } from "../db.config.js";
import { InvalidUploadError } from "../errors/files.error.js";
import { extFromContentType } from "../utils/fileExt.util.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { startConversionPipeline } from "./conversionJob.service.js";
import { createSignedUploadUrl, getObjectMetadata } from "./gcs.service.js";

const UPLOAD_PURPOSE = "presentation_file";
const DEFAULT_SIGNED_URL_EXPIRES_SEC = 900;

function getUploadTokenSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new InvalidUploadError(null, "JWT_SECRET이 설정되어 있지 않습니다.");
  }
  return secret;
}

function getSignedUrlExpiresSec() {
  const raw = Number.parseInt(process.env.GCS_UPLOAD_SIGNED_URL_EXPIRES_SEC ?? "", 10);
  if (Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  return DEFAULT_SIGNED_URL_EXPIRES_SEC;
}

function normalizeSize(size) {
  const parsed = typeof size === "number" ? size : Number(size);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_SIZE_BYTES) {
    throw new InvalidUploadError(
      { size, max: MAX_SIZE_BYTES },
      "파일 크기는 최대 1GB입니다."
    );
  }
  return parsed;
}

function normalizeContentType(contentType) {
  if (typeof contentType !== "string") return "";
  return contentType.split(";")[0].trim().toLowerCase();
}

function validatePresentationFile({ contentType, size }) {
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new InvalidUploadError({ contentType }, "지원하지 않는 파일 형식입니다.");
  }

  const normalizedSize = normalizeSize(size);
  const ext = extFromContentType(contentType);

  if (!ext || !["pptx", "pdf"].includes(ext)) {
    throw new InvalidUploadError({ contentType }, "지원하지 않는 파일 형식입니다.");
  }

  return { size: normalizedSize, ext };
}

function decodeUploadToken(uploadToken) {
  if (!uploadToken || typeof uploadToken !== "string") {
    throw new InvalidUploadError(null, "업로드 토큰이 필요합니다.");
  }

  try {
    const decoded = jwt.verify(uploadToken, getUploadTokenSecret());
    if (!decoded || typeof decoded !== "object") {
      throw new InvalidUploadError(null, "유효하지 않은 업로드 토큰입니다.");
    }
    return decoded;
  } catch (error) {
    if (error instanceof InvalidUploadError) throw error;
    throw new InvalidUploadError(null, "유효하지 않거나 만료된 업로드 토큰입니다.");
  }
}

export async function createPresentationUploadUrl({
  userId,
  purpose,
  contentType,
  size,
  originalFilename,
  title,
}) {
  if (purpose !== UPLOAD_PURPOSE) {
    throw new InvalidUploadError({ purpose }, "지원하지 않는 업로드 목적입니다.");
  }

  const { size: validatedSize, ext } = validatePresentationFile({ contentType, size });

  if (typeof originalFilename !== "string" || originalFilename.trim().length === 0) {
    throw new InvalidUploadError(
      { originalFilename },
      "원본 파일명이 필요합니다."
    );
  }

  const env = process.env.NODE_ENV || "dev";
  const uuid = crypto.randomUUID();
  const objectKey = `${env}/upload/temp/${uuid}.${ext}`;

  const signed = await createSignedUploadUrl({
    objectKey,
    contentType,
  });

  const uploadToken = jwt.sign(
    {
      purpose: UPLOAD_PURPOSE,
      userId: userId.toString(),
      objectKey,
      contentType,
      size: validatedSize,
      originalFilename: originalFilename.trim(),
      title: typeof title === "string" ? title : null,
    },
    getUploadTokenSecret(),
    { expiresIn: `${getSignedUrlExpiresSec()}s` }
  );

  return {
    objectKey: signed.objectKey,
    uploadUrl: signed.uploadUrl,
    expiresAt: signed.expiresAt,
    uploadToken,
  };
}

export async function completePresentationUpload({ userId, objectKey, uploadToken }) {
  if (!objectKey || typeof objectKey !== "string") {
    throw new InvalidUploadError({ objectKey }, "업로드된 objectKey가 필요합니다.");
  }

  const tokenPayload = decodeUploadToken(uploadToken);

  if (tokenPayload.purpose !== UPLOAD_PURPOSE) {
    throw new InvalidUploadError(null, "업로드 목적이 올바르지 않습니다.");
  }
  if (tokenPayload.userId !== userId.toString()) {
    throw new InvalidUploadError(null, "업로드 토큰 사용자 정보가 일치하지 않습니다.");
  }
  if (tokenPayload.objectKey !== objectKey) {
    throw new InvalidUploadError(null, "업로드 토큰 objectKey가 일치하지 않습니다.");
  }

  let metadata;
  try {
    metadata = await getObjectMetadata({ objectKey });
  } catch (error) {
    throw new InvalidUploadError(
      { objectKey },
      "업로드된 파일을 찾을 수 없습니다. 업로드를 다시 시도해주세요."
    );
  }

  const actualContentType = normalizeContentType(metadata.contentType);
  const expectedContentType = normalizeContentType(tokenPayload.contentType);
  if (actualContentType !== expectedContentType) {
    throw new InvalidUploadError(
      { expectedContentType, actualContentType },
      "업로드된 파일 형식이 요청과 일치하지 않습니다."
    );
  }

  const actualSize = normalizeSize(metadata.size);
  if (actualSize !== tokenPayload.size) {
    throw new InvalidUploadError(
      { expectedSize: tokenPayload.size, actualSize },
      "업로드된 파일 크기가 요청과 일치하지 않습니다."
    );
  }

  const { ext } = validatePresentationFile({
    contentType: tokenPayload.contentType,
    size: tokenPayload.size,
  });

  const originalFilename =
    typeof tokenPayload.originalFilename === "string" && tokenPayload.originalFilename.trim()
      ? tokenPayload.originalFilename.trim()
      : `presentation.${ext}`;
  const projectTitle =
    typeof tokenPayload.title === "string" && tokenPayload.title.trim()
      ? tokenPayload.title.trim()
      : originalFilename;

  const storageBucket = metadata.bucket || process.env.GCS_BUCKET_NAME;
  if (!storageBucket) {
    throw new InvalidUploadError(null, "GCS 버킷 이름이 설정되어 있지 않습니다.");
  }

  const storageUrl = `https://storage.googleapis.com/${storageBucket}/${objectKey}`;

  const { project, uploadedFile } = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        userId: BigInt(userId),
        title: projectTitle,
      },
    });

    const uploadedFile = await tx.uploadedFile.create({
      data: {
        projectId: project.id,
        originalFilename,
        contentType: tokenPayload.contentType,
        fileExt: ext,
        sizeBytes: BigInt(actualSize),
        sha256: null,
        storageBucket,
        storageKey: objectKey,
        storageUrl,
      },
    });

    return { project, uploadedFile };
  });

  await startConversionPipeline({
    uploadedFileId: uploadedFile.id,
    fileExt: ext,
    projectId: project.id,
  });

  return {
    projectId: project.id.toString(),
  };
}
