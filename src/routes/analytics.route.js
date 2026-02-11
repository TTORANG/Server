import express from "express";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";
import { resolveShareToken } from "../middlewares/resolveShareToken.middleware.js";
import {
  handleRecordPageView,
  handleRecordSlideView,
  handleRecordVideoEvent,
  handleRecordExit,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// pageview와 exit는 shareToken 지원
router.post("/pageview", optionalAuth, resolveShareToken, handleRecordPageView);
router.post("/exit", optionalAuth, resolveShareToken, handleRecordExit);

// slide-view와 video-event는 projectId가 아닌 slideId/videoId를 사용하므로 shareToken 불필요
router.post("/slide-view", optionalAuth, handleRecordSlideView);
router.post("/video-event", optionalAuth, handleRecordVideoEvent);

export default router;
