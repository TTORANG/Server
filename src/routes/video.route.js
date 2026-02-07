import express from "express";
import {
  finishRecording,
  handleGetVideoDetail,
  handleGetVideoList,
  handleGetMyVideoList,
  handleGetVideoSlideTimeline,
  startRecording,
  uploadVideoChunk,
} from "../controllers/video.controller.js";
import { isLogin } from "../middlewares/auth.middleware.js";
import multer from "multer";
import { MAX_SIZE_BYTES } from "../constants/files.js";
import {
  handleGetVideoExits,
  handleGetVideoTimeline,
  handleGetVideoRetention,
} from "../controllers/analytics.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
});

// 영상 업로드
router.post("/videos/start", isLogin, startRecording);
// 비디오 업로드 검증
router.post("/videos/:videoId/finish", isLogin, finishRecording);
// 영상 상세 조회
router.get("/videos/:videoId", isLogin, handleGetVideoDetail);
// 영상 청크 업로드
router.post(
  "/videos/:videoId/chunks/:chunkIndex",
  isLogin,
  upload.single("file"),
  uploadVideoChunk
);
// 영상-슬라이드 동기화 타임라인 조회
router.get("/videos/:videoId/slides", isLogin, handleGetVideoSlideTimeline);
// 프로젝트 하위 녹화 영상 목록 조회
router.get("/presentations/:projectId/videos", isLogin, handleGetVideoList);
// 내 녹화 영상 목록 조회
router.get("/me/videos", isLogin, handleGetMyVideoList);

router.get("/videos/:videoId/analytics/timeline", isLogin, handleGetVideoTimeline);
router.get("/videos/:videoId/analytics/exits", isLogin, handleGetVideoExits);
router.get("/videos/:videoId/analytics/retention", isLogin, handleGetVideoRetention);

export default router;
