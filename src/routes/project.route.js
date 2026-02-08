import express from "express";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleCreateProject,
  handleDeleteProject,
  handleGetProjectList,
  handleUpdateProjectName,
} from "../controllers/project.controller.js";
import {
  handleGetSlideAnalytics,
  handleGetSlideRetention,
  handleGetSummary,
  handleGetRecentComments,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// 프로젝트 생성
router.post("/", isLogin, handleCreateProject);

// 프로젝트 목록 조회/검색
router.get("/", isLogin, handleGetProjectList);

// 프로젝트 이름 업데이트
router.patch("/:projectId", isLogin, handleUpdateProjectName);

// 프로젝트 삭제
router.delete("/:projectId", isLogin, handleDeleteProject);

router.get("/:projectId/analytics/summary", isLogin, handleGetSummary);
router.get("/:projectId/analytics/slides", isLogin, handleGetSlideAnalytics);
router.get("/:projectId/analytics/slide-retention", isLogin, handleGetSlideRetention);
router.get("/:projectId/analytics/recent-comments", isLogin, handleGetRecentComments);

export default router;
