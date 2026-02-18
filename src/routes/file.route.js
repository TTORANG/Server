import express from "express";
import { handleGetPresentationStatus } from "../controllers/conversionStatus.controller.js";
import { postCompleteUpload, postCreateUploadUrl } from "../controllers/files.controller.js";
import { isLogin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 프로젝트 파일 변환 상태 조회
router.get("/presentations/:projectId/status", isLogin, handleGetPresentationStatus);

// 파일 업로드 관련 라우팅
router.post("/files/upload-url", isLogin, postCreateUploadUrl);
router.post("/files/upload-complete", isLogin, postCompleteUpload);

export default router;
