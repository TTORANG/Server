import { Storage } from "@google-cloud/storage";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import { prisma } from "../db.config.js";

const storage = new Storage();
const DEFAULT_NON_RESUMABLE_MAX_BYTES = 8 * 1024 * 1024;

export const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
};

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw Object.assign(new Error("GCS_BUCKET_NAME_NOT_SET"), { code: "CONFIG" });
  return storage.bucket(bucketName);
}

export function tmpPath(filename) {
  return path.join(os.tmpdir(), "server", filename);
}

export function uuid() {
  return crypto.randomUUID();
}

export function envPrefix() {
  return process.env.NODE_ENV || "dev";
}

export async function getJobWithUploadedFile(jobOrId) {
  const jobId = typeof jobOrId === "object" && jobOrId !== null ? jobOrId.id : jobOrId;

  if (!jobId) throw new Error("MISSING_JOB_ID");

  const job = await prisma.conversionJob.findUnique({
    where: { id: BigInt(jobId) },
    include: { uploadedFile: true },
  });

  if (!job) throw new Error("JOB_NOT_FOUND");
  if (!job.uploadedFile) throw new Error("UPLOADED_FILE_NOT_FOUND");

  return job;
}

export async function downloadFromGCS({ bucketName, objectKey, destPath }) {
  const bucket = bucketName ? storage.bucket(bucketName) : getBucket();
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await bucket.file(objectKey).download({ destination: destPath });
  return destPath;
}

export async function uploadToGCS({
  bucketName,
  srcPath,
  objectKey,
  contentType,
  resumable,
}) {
  const bucket = bucketName ? storage.bucket(bucketName) : getBucket();

  let resolvedResumable = resumable;
  if (resolvedResumable === undefined) {
    const threshold = parsePositiveInt(
      process.env.GCS_NON_RESUMABLE_MAX_BYTES,
      DEFAULT_NON_RESUMABLE_MAX_BYTES
    );

    try {
      const stat = await fs.stat(srcPath);
      resolvedResumable = stat.size >= threshold;
    } catch {
      resolvedResumable = true;
    }
  }

  await bucket.upload(srcPath, {
    destination: objectKey,
    resumable: resolvedResumable,
    metadata: {
      contentType,
      cacheControl: "public, max-age=31536000",
    },
  });

  // public URL 전략은 프로젝트 정책에 따라 다름. 현재는 gs://만 반환
  return {
    storageBucket: bucket.name,
    storageKey: objectKey,
    url: `gs://${bucket.name}/${objectKey}`,
  };
}

export function runCmd(cmd, args, { cwd, logMeta } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const p = spawn(cmd, args, {
      cwd,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", (error) => {
      if (logMeta) {
        const durationMs = Date.now() - startedAt;
        console.error(
          JSON.stringify({
            event: "run_cmd",
            status: "spawn_error",
            cmd,
            args,
            durationMs,
            ...logMeta,
            error: error.message,
          })
        );
      }
      reject(error);
    });

    p.on("close", (code) => {
      if (logMeta) {
        const durationMs = Date.now() - startedAt;
        const payload = {
          event: "run_cmd",
          status: code === 0 ? "ok" : "failed",
          cmd,
          durationMs,
          ...logMeta,
        };

        if (code === 0) {
          console.log(JSON.stringify(payload));
        } else {
          console.error(
            JSON.stringify({
              ...payload,
              code,
              stderrPreview: stderr.slice(0, 500),
            })
          );
        }
      }

      if (code === 0) {
        return resolve({ ok: true, stdout, stderr });
      }
      reject(new Error(`CMD_FAILED: ${cmd} failed: ${stderr}`));
    });
  });
}

export async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => path.join(dir, e.name));
}

export async function maybeImageMeta(filePath) {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(filePath).metadata();
    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
      sizeBytes: meta.size ?? null,
    };
  } catch {
    const st = await fs.stat(filePath);
    return { width: null, height: null, sizeBytes: st.size };
  }
}

export async function upsertSlide({ projectId, slideNum, sourceIndex, title }) {
  return prisma.slide.upsert({
    where: {
      projectId_slideNum: {
        projectId: BigInt(projectId),
        slideNum: BigInt(slideNum),
      },
    },
    update: {
      sourceIndex,
      title: title ?? undefined,
      isDeleted: false,
    },
    create: {
      projectId: BigInt(projectId),
      slideNum: BigInt(slideNum),
      sourceIndex,
      title: title ?? null,
      isDeleted: false,
    },
  });
}

export async function upsertProjectMaterial({
  projectId,
  uploadedFileId,
  fileType,
  pageCount,
  thumbnailSlideNum,
}) {
  return prisma.projectMaterial.upsert({
    where: { uploadedFileId: BigInt(uploadedFileId) },
    update: {
      projectId: BigInt(projectId),
      fileType,
      pageCount,
      ...(thumbnailSlideNum !== undefined && {
        thumbnailSlideNum,
      }),
    },
    create: {
      projectId: BigInt(projectId),
      uploadedFileId: BigInt(uploadedFileId),
      fileType,
      pageCount,
      thumbnailSlideNum: thumbnailSlideNum ?? null,
    },
  });
}

export async function createSlideAsset({
  slideId,
  conversionJobId,
  assetType,
  format,
  width,
  height,
  sizeBytes,
  storageBucket,
  storageKey,
  url,
}) {
  return prisma.slideAsset.create({
    data: {
      slideId: BigInt(slideId),
      conversionJobId: conversionJobId ? BigInt(conversionJobId) : null,
      assetType,
      format,
      width,
      height,
      sizeBytes: sizeBytes != null ? BigInt(sizeBytes) : null,
      storageBucket,
      storageKey,
      url,
    },
  });
}

export async function updateProjectThumbnail(projectId, thumbnailUrl) {
  return prisma.project.update({
    where: { id: BigInt(projectId) },
    data: { thumbnailUrl },
  });
}
