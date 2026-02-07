import { prisma } from "../../db.config.js";
import { InvalidProjectParameterError, ProjectNotFoundError } from "../../errors/project.error.js";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

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

const buildProgress = ({ imageJob, thumbnailJob, metadataJob, slideCount }) => {
  const imageStatus = imageJob?.status ?? "queued";
  const thumbnailStatus = thumbnailJob?.status ?? "queued";
  const metadataStatus = metadataJob?.status ?? "queued";

  const imagePercent = imageStatus === "completed" ? 100 : clampPercent(imageJob?.progress);
  const thumbnailPercent = thumbnailStatus === "completed" ? 100 : clampPercent(thumbnailJob?.progress);
  const metadataPercent = metadataStatus === "completed" ? 100 : clampPercent(metadataJob?.progress);

  const percent = Math.round(imagePercent * 0.7 + thumbnailPercent * 0.15 + metadataPercent * 0.15);

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

  const progress = buildProgress({
    imageJob,
    thumbnailJob,
    metadataJob,
    slideCount,
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
