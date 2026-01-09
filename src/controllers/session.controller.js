import {
  anonymousSessionResponseDTO,
  mergeResultResponseDTO,
  projectResponseDTO,
} from "../dtos/session.dto.js";
import {
  editAnonymousProject,
  issueAnonymousSession,
  mergeAnonymousData,
  startAnonymousProject,
} from "../services/session.service.js";

// 익명 세션 생성
export const handleCreateAnonymousSession = async (req, res, next) => {
  try {
    const { sessionId, tokens } = await issueAnonymousSession();

    res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: anonymousSessionResponseDTO(sessionId, tokens),
    });
  } catch (error) {
    next(error);
  }
};

// 익명 프로젝트 생성
export const handleCreateAnonymousProject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    const project = await startAnonymousProject(userId, title);

    res.status(201).json({
      resultType: "SUCCESS",
      success: projectResponseDTO(project),
    });
  } catch (error) {
    next(error);
  }
};

// 익명 프로젝트 업데이트
export const handleUpdateAnonymousProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;
    const project = await editAnonymousProject(id, userId, title);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: projectResponseDTO(project),
    });
  } catch (error) {
    next(error);
  }
};

// 익명 세션 병합
export const handleMergeSession = async (req, res, next) => {
  try {
    const { anonymousSessionId } = req.body;
    const userId = req.user.id;
    const mergedProjects = await mergeAnonymousData(anonymousSessionId, userId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: mergeResultResponseDTO(mergedProjects),
    });
  } catch (error) {
    next(error);
  }
};
