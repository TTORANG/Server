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

export const projectListResponseDTO = (projects, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  const presentations = projects.map((project) => {
    const primaryFile =
      project.uploadedFiles && project.uploadedFiles.length > 0 ? project.uploadedFiles[0] : null;

    let totalViews = 0;

    if (project.shareLinks && project.shareLinks.length > 0) {
      for (const link of project.shareLinks) {
        totalViews += link.viewCount || 0;
      }
    }

    return {
      projectId: project.id.toString(),
      title: project.title,
      thumbnailUrl: toPublicStorageUrl(
        project.thumbnailUrl || (primaryFile ? primaryFile.storageUrl : null)
      ),
      slideCount: project._count.materials,

      reactionCount: project._count.reactions || 0, // 집계된 리액션 수
      viewCount: totalViews, // 합산된 조회수
      feedbackCount: project._count.comments || 0, // 피드백(댓글) 수

      durationSeconds: project.durationSeconds || 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
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
