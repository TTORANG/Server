import express from "express";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleGetSlideDetail,
  handleGetSlides,
  handlePatchSlideTitle,
} from "../controllers/slide.controller.js";

const router = express.Router();

// 슬라이드 목록 조회
router.get("/:projectId/slides", isLogin, handleGetSlides);

// 슬라이드 제목 수정
router.patch("/slides/:slideId", isLogin, handlePatchSlideTitle);

// 슬라이드 네비게이션 기능
router.get("/slides/:slideId", isLogin, handleGetSlideDetail);

export default router;
