import express from "express";
import { handleGetPresentationStatus } from "../controllers/conversionStatus.controller.js";
import { postUploadPresentationFile } from "../controllers/files.controller.js";
import { isLogin } from "../middlewares/auth.middleware.js";
import multer from "multer";
import { MAX_SIZE_BYTES } from "../constants/files.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
});

// 프로젝트 파일 변환 상태 조회
router.get("/presentations/:projectId/status", isLogin, handleGetPresentationStatus);

// 파일 업로드 관련 라우팅
router.post("/files/upload", isLogin, upload.single("file"), postUploadPresentationFile);

export default router;
