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
