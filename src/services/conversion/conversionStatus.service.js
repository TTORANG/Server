import { prisma } from "../../db.config.js";
import { InvalidProjectParameterError, ProjectNotFoundError } from "../../errors/project.error.js";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);
const DEFAULT_PROGRESS_WEIGHTS = {
  IMAGE: 0.7,
  THUMBNAIL: 0.15,
  METADATA: 0.15,
};
const WEIGHT_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_WEIGHT_SAMPLE_COUNT = 5;
const MAX_WEIGHT_SAMPLES_PER_STAGE = 200;

let cachedProgressWeights = DEFAULT_PROGRESS_WEIGHTS;
let cachedProgressWeightsExpiresAt = 0;

const clampPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
};

const parsePositiveBigIntParam = (value, fieldName) => {
  if (typeof value === "bigint") {
    if (value > 0n) return value;
    throw new InvalidProjectParameterError({ [fieldName]: String(value) });
  }

  const raw = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new InvalidProjectParameterError({ [fieldName]: value });
  }

  return BigInt(raw);
};

const getLatestJobByTypes = (jobs, jobTypes) => {
  const typeSet = new Set(Array.isArray(jobTypes) ? jobTypes : [jobTypes]);
  return jobs.find((job) => typeSet.has(job.jobType)) ?? null;
};

const normalizeWeights = (weights) => {
  const image = Number(weights.IMAGE) || 0;
  const thumbnail = Number(weights.THUMBNAIL) || 0;
  const metadata = Number(weights.METADATA) || 0;
  const sum = image + thumbnail + metadata;

  if (sum <= 0) return DEFAULT_PROGRESS_WEIGHTS;

  return {
    IMAGE: image / sum,
    THUMBNAIL: thumbnail / sum,
    METADATA: metadata / sum,
  };
};

const getAverageDurationMs = (jobs) => {
  const durations = jobs
    .map((job) => {
      const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null;
      const finishedAt = job.finishedAt ? new Date(job.finishedAt).getTime() : null;
      if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) return null;
      const duration = finishedAt - startedAt;
      return duration > 0 ? duration : null;
    })
    .filter((duration) => duration !== null);

  if (durations.length < MIN_WEIGHT_SAMPLE_COUNT) return null;

  const total = durations.reduce((acc, value) => acc + value, 0);
  return total / durations.length;
};

const getCalibratedProgressWeights = async () => {
  const now = Date.now();
  if (now < cachedProgressWeightsExpiresAt) {
    return cachedProgressWeights;
  }

  const [imageJobs, thumbnailJobs, metadataJobs] = await Promise.all([
    prisma.conversionJob.findMany({
      where: {
        jobType: { in: ["pptx_to_images", "pdf_to_images"] },
        status: "completed",
        startedAt: { not: null },
        finishedAt: { not: null },
      },
      select: { startedAt: true, finishedAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_WEIGHT_SAMPLES_PER_STAGE,
    }),
    prisma.conversionJob.findMany({
      where: {
        jobType: "generate_thumbnail",
        status: "completed",
        startedAt: { not: null },
        finishedAt: { not: null },
      },
      select: { startedAt: true, finishedAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_WEIGHT_SAMPLES_PER_STAGE,
    }),
    prisma.conversionJob.findMany({
      where: {
        jobType: "extract_metadata",
        status: "completed",
        startedAt: { not: null },
        finishedAt: { not: null },
      },
      select: { startedAt: true, finishedAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_WEIGHT_SAMPLES_PER_STAGE,
    }),
  ]);

  const imageAvg = getAverageDurationMs(imageJobs);
  const thumbnailAvg = getAverageDurationMs(thumbnailJobs);
  const metadataAvg = getAverageDurationMs(metadataJobs);

  const weights = normalizeWeights({
    IMAGE: imageAvg ?? DEFAULT_PROGRESS_WEIGHTS.IMAGE,
    THUMBNAIL: thumbnailAvg ?? DEFAULT_PROGRESS_WEIGHTS.THUMBNAIL,
    METADATA: metadataAvg ?? DEFAULT_PROGRESS_WEIGHTS.METADATA,
  });

  cachedProgressWeights = weights;
  cachedProgressWeightsExpiresAt = now + WEIGHT_CACHE_TTL_MS;

  return weights;
};

const buildProgress = ({ imageJob, thumbnailJob, metadataJob, slideCount, weights }) => {
  const imageStatus = imageJob?.status ?? "queued";
  const thumbnailStatus = thumbnailJob?.status ?? "queued";
  const metadataStatus = metadataJob?.status ?? "queued";

  const imagePercent = imageStatus === "completed" ? 100 : clampPercent(imageJob?.progress);
  const thumbnailPercent = thumbnailStatus === "completed" ? 100 : clampPercent(thumbnailJob?.progress);
  const metadataPercent = metadataStatus === "completed" ? 100 : clampPercent(metadataJob?.progress);

  const percent = Math.round(
    imagePercent * weights.IMAGE +
      thumbnailPercent * weights.THUMBNAIL +
      metadataPercent * weights.METADATA
  );

  return {
    percent,
    slides: {
      total: slideCount,
      generated: imageStatus === "completed" ? slideCount : 0,
    },
    thumbnail: thumbnailStatus,
    metadata: metadataStatus,
  };
};

export async function getPresentationConversionStatus(projectId, userId) {
  const parsedProjectId = parsePositiveBigIntParam(projectId, "projectId");
  const parsedUserId = parsePositiveBigIntParam(userId, "userId");

  const project = await prisma.project.findFirst({
    where: { id: parsedProjectId, userId: parsedUserId, isDeleted: false },
  });

  if (!project) {
    throw new ProjectNotFoundError({ projectId });
  }

  const uploadedFile = await prisma.uploadedFile.findFirst({
    where: { projectId: parsedProjectId },
    orderBy: { id: "desc" },
  });

  if (!uploadedFile) {
    return {
      status: "queued",
      progress: {
        percent: 0,
        slides: { total: 0, generated: 0 },
        thumbnail: "queued",
        metadata: "queued",
      },
    };
  }

  const jobs = await prisma.conversionJob.findMany({
    where: { uploadedFileId: uploadedFile.id },
    orderBy: { createdAt: "desc" },
  });

  const imageJob = getLatestJobByTypes(jobs, ["pptx_to_images", "pdf_to_images"]);
  const thumbnailJob = getLatestJobByTypes(jobs, "generate_thumbnail");
  const metadataJob = getLatestJobByTypes(jobs, "extract_metadata");

  const slideCount = imageJob?.status === "completed"
    ? await prisma.slide.count({
        where: { projectId: parsedProjectId, isDeleted: false },
      })
    : 0;
  const progressWeights = await getCalibratedProgressWeights();

  const progress = buildProgress({
    imageJob,
    thumbnailJob,
    metadataJob,
    slideCount,
    weights: progressWeights,
  });

  if (!imageJob) return { status: "queued", progress };
  if (imageJob.status === "failed") return { status: "failed", progress };
  if (imageJob.status !== "completed") return { status: "processing", progress };

  const thumbnailStatus = thumbnailJob?.status ?? "queued";
  const metadataStatus = metadataJob?.status ?? "queued";

  const thumbnailTerminal = TERMINAL_STATUSES.has(thumbnailStatus);
  const metadataTerminal = TERMINAL_STATUSES.has(metadataStatus);

  if (!thumbnailTerminal || !metadataTerminal) {
    return { status: "processing", progress };
  }

  const hasPartialFail = thumbnailStatus === "failed" || metadataStatus === "failed";

  return {
    status: hasPartialFail ? "partial_done" : "completed",
    progress,
  };
}
