import { toPublicStorageUrl } from "../utils/storageUrl.util.js";

export const createProjectResponseDTO = (project) => {
  return {
    message: "프로젝트가 생성되었습니다. 변환이 시작됩니다.",
    projectId: project.id.toString(),
    title: project.title,
    createdAt: project.createdAt,
  };
};

export const projectResponseDTO = (project) => {
  return {
    projectId: project.id.toString(),
    title: project.title,
    updatedAt: project.updatedAt,
  };
};

export const projectNameResponseDTO = (project) => {
  return {
    projectId: project.id.toString(),
    title: project.title,
    createdAt: project.createdAt,
  };
};

export const projectListResponseDTO = (projects, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  const presentations = projects.map((project) => {
    const latestJob =
      project.conversionJobs && project.conversionJobs.length > 0
        ? project.conversionJobs[0]
        : null;

    const getJobStatus = (job) => {
      if (!job || job.status === "completed") return "done";
      if (job.status === "failed") return "failed";
      return "processing"; // queued, processing 포함
    };
    const status = getJobStatus(latestJob);
    // 공통 필드
    const baseResponse = {
      projectId: project.id.toString(),
      title: project.title,
      status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    if (status === "processing") {
      return {
        ...baseResponse,
        process_progress: latestJob.progress || 0,
      };
    }
    if (status === "failed") {
      return {
        ...baseResponse,
        errorMessage: latestJob.errorMessage || "변환 중 오류가 발생했습니다.",
      };
    }
    const primaryFile =
      project.uploadedFiles && project.uploadedFiles.length > 0 ? project.uploadedFiles[0] : null;

    const totalViews =
      project.shareLinks?.reduce((acc, link) => acc + (link.viewCount || 0), 0) || 0;

    return {
      ...baseResponse,
      thumbnailUrl: toPublicStorageUrl(
        project.thumbnailUrl || (primaryFile ? primaryFile.storageUrl : null)
      ),
      slideCount: project._count.materials,

      reactionCount: project._count.reactions || 0, // 집계된 리액션 수
      viewCount: totalViews, // 합산된 조회수
      feedbackCount: project._count.comments || 0, // 피드백(댓글) 수

      durationSeconds: project.durationSeconds || 0,
    };
  });

  return {
    presentations,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
  };
};
