import { ProjectNotFoundError } from "../errors/project.error.js";
import {
  createProject,
  deleteProject,
  updatePrjectTitle,
} from "../repositories/project.repository.js";
import { createAndEnqueueConversionJob } from "./cloudTasks.service.js";
// 프로젝트 생성
export const processCreateProject = async (userId, projectData) => {
  const { title, uploadedFileId } = projectData;

  // DB 작업 완료 (트랜잭션 끝)
  const { project, file } = await createProject(userId, title, uploadedFileId);

  // 확장자에 따른 작업 타입 결정
  const jobType = file.fileExt === "pdf" ? "pdf_to_images" : "pptx_to_images";

  // // 비동기 큐 등록
  // await createAndEnqueueConversionJob({
  //   uploadedFileId: BigInt(uploadedFileId),
  //   jobType: jobType,
  // });

  return project;
};

// 프로젝트 이름 업데이트
export const processUpdateProjectName = async (projectId, userId, title) => {
  try {
    return await updatePrjectTitle(projectId, userId, title);
  } catch (error) {
    if (error.code === "P2025") throw new ProjectNotFoundError();
    throw error;
  }
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
