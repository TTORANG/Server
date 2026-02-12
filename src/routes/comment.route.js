import express from "express";
import {
  deleteCommentController,
  getAllVideoCommentsController,
  getSlideCommentsController,
  getVideoCommentsByTimestampController,
  handleCreateVideoComment,
  patchComment,
  postSlideComment,
} from "../controllers/comment.controller.js";
import { getCommentReplies, postCommentReply } from "../controllers/reply.controller.js";
import { isLogin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 댓글 관련 라우팅
router.post("/slides/:slideId/comments", isLogin, postSlideComment); // 댓글 작성
router.patch("/comments/:commentId", isLogin, patchComment); // 댓글 수정
router.delete("/comments/:commentId", isLogin, deleteCommentController); // 댓글 및 답글 삭제
router.get("/slides/:slideId/comments", isLogin, getSlideCommentsController); // 댓글 목록 조회
router.post("/videos/:videoId/comments", isLogin, handleCreateVideoComment); // 영상 타임스탬프 댓글 생성
router.get("/videos/:videoId/comments", isLogin, getVideoCommentsByTimestampController); // 시간대별 댓글 조회
router.get("/videos/:videoId/comments/all", isLogin, getAllVideoCommentsController); // 영상 전체 댓글 조회

// 답글 관련 라우팅
router.post("/comments/:commentId/replies", isLogin, postCommentReply); // 답글 작성
router.get("/comments/:commentId/replies", isLogin, getCommentReplies); // 답글 목록 조회

export default router;
