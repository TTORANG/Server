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
  const presentations = projects.map((project) => {
    const primaryFile =
      project.uploadedFiles && project.uploadedFiles.length > 0 ? project.uploadedFiles[0] : null;

    return {
      projectId: project.id.toString(),
      title: project.title,
      thumbnailUrl: project.thumbnailUrl || (primaryFile ? primaryFile.storageUrl : null),
      slideCount: project._count.materials,
      feedbackCount: 0,
      duration: project.duration || 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  });

  return {
    presentations,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
  };
};
