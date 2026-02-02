import express from "express";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleCreateAnonymousProject,
  handleCreateAnonymousSession,
  handleMergeSession,
  handleUpdateAnonymousProject,
} from "../controllers/session.controller.js";

const router = express.Router();

// 익명 세션 생성 (로그인 불필요)
router.post("/session/anonymous", handleCreateAnonymousSession);

// 익명 프로젝트 생성 (JWT 필수 - 익명 세션 토큰으로 인증)
router.post("/presentations/anonymous", isLogin, handleCreateAnonymousProject);

// 익명 프로젝트 업데이트 (JWT 필수 - 익명 세션 토큰으로 인증))
router.patch("/presentations/anonymous/:projectId", isLogin, handleUpdateAnonymousProject);

// 로그인 후 익명 세션 병합 (JWT 필수 - 실제 사용자 토큰)
router.post("/session/merge", isLogin, handleMergeSession);

export default router;
