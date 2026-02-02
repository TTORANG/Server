import express from "express";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleRecordPageView,
  handleRecordSlideView,
  handleRecordVideoEvent,
  handleRecordExit,
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.post("/pageview", isLogin, handleRecordPageView);
router.post("/slide-view", isLogin, handleRecordSlideView);
router.post("/video-event", isLogin, handleRecordVideoEvent);
router.post("/exit", isLogin, handleRecordExit);

export default router;
