import express from "express";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleGetScript,
  handleGetScriptVersion,
  handleRestoreVersion,
  handleUploadScript,
} from "../controllers/script.controller.js";

const router = express.Router();

// 대본 저장
router.patch("/:slideId/script", isLogin, handleUploadScript);

// 대본 조회
router.get("/:slideId/script", isLogin, handleGetScript);

// 대본 버전 목록 조회
router.get("/:slideId/versions", isLogin, handleGetScriptVersion);

// 대본 버전 복원
router.post("/:slideId/restore", isLogin, handleRestoreVersion);

export default router;
