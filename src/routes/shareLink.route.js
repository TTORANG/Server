import express from "express";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleCreateShareLink,
  handleGetShareComments,
  handleGetShareContent,
  handleGetShareLinkList,
  handleGetVideoListForSharing,
} from "../controllers/shareLink.controller.js";

const router = express.Router();

// 공유 링크 생성
router.post("/presentations/:projectId/shares", isLogin, handleCreateShareLink);

// 공유 링크 조회 (인증 없이 접근 가능)
router.get("/shares/:shareToken", handleGetShareContent);
router.get("/shares/:shareToken/comments", handleGetShareComments);

// 공유 링크 목록 조회
router.get("/presentations/:projectId/shares", isLogin, handleGetShareLinkList);

// 공유 가능 영상 목록 조회
router.get("/presentations/:projectId/shares/videos", isLogin, handleGetVideoListForSharing);

export default router;
