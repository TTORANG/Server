import {
  InvalidPageError,
  ProjectNotFoundError,
  SearchQueryTooShortError,
} from "../errors/project.error.js";
import {
  createProject,
  deleteProject,
  getProjectList,
  getProjectTitle,
  updateProjectTitle,
} from "../repositories/project.repository.js";
import { startConversionPipeline } from "./conversionJob.service.js";
// 프로젝트 생성
export const processCreateProject = async (userId, projectData) => {
  const { title, uploadedFileId } = projectData;

  // DB 작업 완료 (트랜잭션 끝)
  const { project, file } = await createProject(userId, title, uploadedFileId);

  // 비동기 변환 파이프라인 시작
  await startConversionPipeline({
    uploadedFileId: BigInt(uploadedFileId),
    fileExt: file.fileExt,
    projectId: project.id,
  });

  return project;
};

// 프로젝트 이름 업데이트
export const processUpdateProjectName = async (projectId, userId, title) => {
  try {
    return await updateProjectTitle(projectId, userId, title);
  } catch (error) {
    if (error.code === "P2025") throw new ProjectNotFoundError();
    throw error;
  }
};

// 프로젝트 이름 조회
export const processGetProjectName = async (projectId) => {
  const project = await getProjectTitle(projectId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  return project;
};

// 프로젝트 삭제
export const processDeleteProject = async (projectId, userId) => {
  try {
    return await deleteProject(projectId, userId);
  } catch (error) {
    if (error.code === "P2025") throw new ProjectNotFoundError();
    throw error;
  }
};

// 프로젝트 목록
export const processGetProjectList = async (userId, query) => {
  const { page = 1, limit = 20, search = null, maxDuration = null, sort = "latest" } = query;

  // 1. page 보정: 숫자가 아니거나 1보다 작으면 1로 고정
  const safePage = Math.max(1, parseInt(page) || 1);

  // 2. limit 보정: 숫자가 아니면 20, 최소 1에서 최대 100 사이로 제한
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 20, 100));

  if (search && search.length < 2) {
    throw new SearchQueryTooShortError();
  }
  const { total, projects } = await getProjectList(userId, {
    page: safePage,
    limit: safeLimit,
    search,
    maxDuration,
    sort,
  });

  return {
    total: total || 0,
    projects: projects || [],
    page: safePage,
    limit: safeLimit,
  };
};
