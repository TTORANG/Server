import { prisma } from "../../db.config.js";
import { ProjectNotFoundError } from "../../errors/project.error.js";

export async function getPresentationConversionStatus(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: BigInt(projectId), isDeleted: false },
  });

  if (!project) {
    throw new ProjectNotFoundError({ projectId });
  }

  const uploadedFile = await prisma.uploadedFile.findFirst({
    where: { projectId: BigInt(projectId) },
    orderBy: { id: "desc" },
  });

  if (!uploadedFile) {
    return { status: "queued" };
  }

  const jobs = await prisma.conversionJob.findMany({
    where: { uploadedFileId: uploadedFile.id },
  });

  const imageJob = jobs.find((j) => ["pptx_to_images", "pdf_to_images"].includes(j.jobType));

  if (!imageJob) return { status: "queued" };
  if (imageJob.status === "failed") return { status: "failed" };
  if (imageJob.status !== "completed") return { status: "processing" };

  const slideCount = await prisma.slide.count({
    where: { projectId: BigInt(projectId), isDeleted: false },
  });

  const thumbnailJob = jobs.find((j) => j.jobType === "generate_thumbnail");
  const metadataJob = jobs.find((j) => j.jobType === "extract_metadata");

  const hasPartialFail = [thumbnailJob, metadataJob].some((j) => j?.status === "failed");

  return {
    status: hasPartialFail ? "partial_done" : "completed",
    progress: {
      slides: {
        total: slideCount,
        generated: slideCount,
      },
      thumbnail: thumbnailJob?.status ?? "queued",
      metadata: metadataJob?.status ?? "queued",
    },
  };
}
