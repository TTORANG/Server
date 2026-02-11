import express from "express";
import {
  handleRecordPageView,
  handleRecordSlideView,
  handleRecordVideoEvent,
  handleRecordExit,
} from "../controllers/analytics.controller.js";
import { isLogin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// pageview와 exit는 shareToken 지원
router.post("/pageview", isLogin, handleRecordPageView);
router.post("/exit", isLogin, handleRecordExit);

// slide-view와 video-event는 projectId가 아닌 slideId/videoId를 사용하므로 shareToken 불필요
router.post("/slide-view", isLogin, handleRecordSlideView);
router.post("/video-event", isLogin, handleRecordVideoEvent);

export default router;
