export const anonymousSessionResponseDTO = (sessionId, tokens) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    message: "익명 세션이 성공적으로 발급되었습니다.",
    sessionId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: "7d",
    expiresAt,
  };
};

export const mergeResultResponseDTO = (mergedCount) => {
  return {
    message: "데이터 병합이 완료되었습니다.",
    mergedProjectsCount: mergedCount,
  };
};

export const projectResponseDTO = (project) => {
  return {
    projectId: project.id.toString(),
    title: project.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt || project.createdAt,
    message: "프로젝트 처리가 완료되었습니다.",
  };
};
