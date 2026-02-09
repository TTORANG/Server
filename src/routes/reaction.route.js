import express from "express";
import {
  getProjectSlidesReactionSummaryController,
  getVideoReactionBuckets,
  getSlideReactionSummaryController,
  getVideoReactionMarkers,
  getVideoReactionsByTimeController,
  handleToggleVideoReaction,
  toggleSlideReactionController,
} from "../controllers/reaction.controller.js";
import { isLogin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 리액션 추가 및 취소
router.post("/slides/:slideId/reactions/toggle", isLogin, toggleSlideReactionController);
// 리액션 집계 조회
router.get("/slides/:slideId/reactions/summary", isLogin, getSlideReactionSummaryController);
// 영상 타임스탬프 리액션 생성
router.post("/videos/:videoId/reactions", isLogin, handleToggleVideoReaction);
// 영상 리액션 집계
router.get("/videos/:videoId/reactions/timeline", isLogin, getVideoReactionMarkers);
// 영상 리액션 버킷별 상세 집계
router.get("/videos/:videoId/reactions/timeline/buckets", isLogin, getVideoReactionBuckets);
// 시간대별 리액션 조회
router.get("/videos/:videoId/reactions", isLogin, getVideoReactionsByTimeController);

router.get(
  "/presentations/:projectId/slides/reactions/summary",
  isLogin,
  getProjectSlidesReactionSummaryController
);

export default router;
