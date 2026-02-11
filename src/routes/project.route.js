import express from "express";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleCreateProject,
  handleDeleteProject,
  handleGetProjectList,
  handleGetProjectName,
  handleUpdateProjectName,
} from "../controllers/project.controller.js";
import { handleGetSlideAnalytics, handleGetSummary } from "../controllers/analytics.controller.js";

const router = express.Router();

// 프로젝트 생성
router.post("/", isLogin, handleCreateProject);

// 프로젝트 목록 조회/검색
router.get("/", isLogin, handleGetProjectList);

// 프로젝트 이름 업데이트
router.patch("/:projectId", isLogin, handleUpdateProjectName);

// 프로젝트 삭제
router.delete("/:projectId", isLogin, handleDeleteProject);

// 프로젝트 이름 조회
router.get("/:projectId", isLogin, handleGetProjectName);

router.get("/:projectId/analytics/summary", isLogin, handleGetSummary);
router.get("/:projectId/analytics/slides", isLogin, handleGetSlideAnalytics);

export default router;
