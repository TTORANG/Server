import {
  createProjectResponseDTO,
  projectListResponseDTO,
  projectResponseDTO,
} from "../dtos/project.dto.js";
import {
  processCreateProject,
  processDeleteProject,
  processGetProjectList,
  processUpdateProjectName,
} from "../services/project.service.js";

export const handleCreateProject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const project = await processCreateProject(userId, req.body);

    res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: createProjectResponseDTO(project),
    });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateProjectName = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;
    const project = await processUpdateProjectName(id, userId, title);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: projectResponseDTO(project),
    });
  } catch (error) {
    next(error);
  }
};
export const handleDeleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await processDeleteProject(id, userId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: { message: "프로젝트가 성공적으로 삭제되었습니다." },
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetProjectList = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await processGetProjectList(userId, req.query);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: projectListResponseDTO(result.projects, result.total, result.page, result.limit),
    });
  } catch (error) {
    next(error);
  }
};
