import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import passport from "passport";
import { googleStrategy, jwtStrategy, kakaoStrategy, naverStrategy } from "./auth.config.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./swagger.config.js";

import { postUploadPresentationFile } from "./controllers/files.controller.js";

import { handleProcessJob } from "./controllers/conversion-job.controller.js";

import {
  finishRecording,
  handleGetVideoDetail,
  handleGetVideoList,
  handleGetVideoSlideTimeline,
  startRecording,
  uploadVideoChunk,
} from "./controllers/video.controller.js";

import {
  handleRecordPageView,
  handleRecordSlideView,
  handleRecordVideoEvent,
  handleRecordExit,
  handleGetSummary,
  handleGetSlideAnalytics,
  handleGetVideoTimeline,
  handleGetVideoExits,
} from "./controllers/analytics.controller.js";

import multer from "multer";
import { MAX_SIZE_BYTES } from "./constants/files.js";
import { handleGetPresentationStatus } from "./controllers/conversionStatus.controller.js";

import { createServer } from "http";

// Pub/Sub 이벤트 시스템
import eventBus from "./events/eventBus.js";
import { registerSubscribers } from "./events/subscribers/index.js";

// Socket.io
import { initializeSocket } from "./socket/index.js";
import {
  getSlideReactionSummaryController,
  getVideoReactionMarkers,
  getVideoReactionsByTimeController,
  handleToggleVideoReaction,
  toggleSlideReactionController,
} from "./controllers/reaction.controller.js";
import {
  deleteCommentController,
  getSlideCommentsController,
  getVideoCommentsByTimestampController,
  handleCreateVideoComment,
  patchComment,
  postSlideComment,
} from "./controllers/comment.controller.js";
import { getCommentReplies, postCommentReply } from "./controllers/reply.controller.js";

import authRouter from "./routes/auth.route.js";
import sessionRouter from "./routes/session.route.js";
import projectRouter from "./routes/project.route.js";
import slideRouter from "./routes/slide.route.js";
import scriptRouter from "./routes/script.route.js";
import shareRouter from "./routes/shareLink.route.js";

dotenv.config();

const app = express();
const httpServer = createServer(app); // HTTP 서버 생성 (Socket.io용)
const port = process.env.PORT || 8080;

app.use(cors()); // cors 방식 허용
app.use(express.static("public")); // 정적 파일 접근
app.use(express.json()); // request의 본문을 json으로 해석할 수 있도록 함 (JSON 형태의 요청 body를 파싱하기 위함)
app.use(express.urlencoded({ extended: false })); // 단순 객체 문자열 형태로 본문 데이터 해석
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);
passport.use("google", googleStrategy);
passport.use("kakao", kakaoStrategy);
passport.use("naver", naverStrategy);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const isLogin = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) return next(err);

    // 인증 실패 에러
    if (!user) {
      const authError = new AuthSessionRequiredError(info ? info.message : null);
      return next(authError);
    }

    // 인증 성공
    req.user = user;
    next();
  })(req, res, next);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
});

// swagger 문서
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// 로그인 라우터
app.use("/", authRouter);

// 익명 세션 라우터
app.use("/", sessionRouter);

// 프로젝트 라우터
app.use("/presentations", projectRouter);

// 슬라이드 라우터
app.use("/presentations", slideRouter);

// 대본 라우터
app.use("/presentations/slides", scriptRouter);

// 공유 링크 라우터
app.use("/", shareRouter);

// 프로젝트 하위 녹화 영상 목록 조회
app.get("/presentations/:projectId/videos", isLogin, handleGetVideoList);

// 프로젝트 파일 변환 상태 조회
app.get("/presentations/:projectId/status", isLogin, handleGetPresentationStatus);

// 파일 업로드 관련 라우팅
app.post("/files/upload", isLogin, upload.single("file"), postUploadPresentationFile);

// 영상 관련 라우팅
app.post("/videos/start", isLogin, startRecording); // 영상 업로드
app.post("/videos/:videoId/finish", isLogin, finishRecording); // 비디오 업로드 검증
app.get("/videos/:videoId", isLogin, handleGetVideoDetail); // 영상 상세 조회
app.post("/videos/:videoId/chunks/:chunkIndex", isLogin, upload.single("file"), uploadVideoChunk); // 영상 청크 업로드
app.get("/videos/:videoId/slides", isLogin, handleGetVideoSlideTimeline); // 영상-슬라이드 동기화 타임라인 조회

// 리액션 관련 라우팅
app.post("/slides/:slideId/reactions/toggle", isLogin, toggleSlideReactionController); // 리액션 추가 및 취소
app.get("/slides/:slideId/reactions/summary", isLogin, getSlideReactionSummaryController); // 리액션 집계 조회
app.post("/videos/:videoId/reactions", isLogin, handleToggleVideoReaction); // 영상 타임스탬프 리액션 생성
app.get("/videos/:videoId/reactions/timeline", getVideoReactionMarkers); // 영상 리액션 집계
app.get("/videos/:videoId/reactions", getVideoReactionsByTimeController); // 시간대별 리액션 조회

// 댓글 관련 라우팅
app.post("/slides/:slideId/comments", isLogin, postSlideComment); // 댓글 작성
app.patch("/comments/:commentId", isLogin, patchComment); // 댓글 수정
app.delete("/comments/:commentId", isLogin, deleteCommentController); // 댓글 및 답글 삭제
app.get("/slides/:slideId/comments", isLogin, getSlideCommentsController); // 댓글 목록 조회
app.post("/videos/:videoId/comments", isLogin, handleCreateVideoComment); // 영상 타임스탬프 댓글 생성
app.get("/videos/:videoId/comments", isLogin, getVideoCommentsByTimestampController); // 시간대별 댓글 조회

// 답글 관련 라우팅
app.post("/comments/:commentId/replies", isLogin, postCommentReply); // 답글 작성
app.get("/comments/:commentId/replies", isLogin, getCommentReplies); // 답글 목록 조회

// ==================== Analytics 엔드포인트 ====================

// 수집 API
app.post("/analytics/pageview", isLogin, handleRecordPageView);
app.post("/analytics/slide-view", isLogin, handleRecordSlideView);
app.post("/analytics/video-event", isLogin, handleRecordVideoEvent);
app.post("/analytics/exit", isLogin, handleRecordExit);

// 조회 API
app.get("/presentations/:projectId/analytics/summary", isLogin, handleGetSummary);
app.get("/presentations/:projectId/analytics/slides", isLogin, handleGetSlideAnalytics);
app.get("/videos/:videoId/analytics/timeline", isLogin, handleGetVideoTimeline);
app.get("/videos/:videoId/analytics/exits", isLogin, handleGetVideoExits);

// Worker 엔드포인트 (pdf,ppt,동영상 변환)
app.post("/worker/process-job", handleProcessJob);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || err.statusCode || 500).json({
    resultType: "FAILURE",
    error: {
      errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
      reason: err.reason || err.message || "Internal Server Error",
      data: err.data,
    },
    success: null,
  });
});

// 서버 시작
const startServer = async () => {
  try {
    // Redis Pub/Sub 연결
    await eventBus.connect();

    // 이벤트 구독자 등록
    await registerSubscribers();

    // Socket.io 초기화
    await initializeSocket(httpServer);

    // HTTP 서버 시작 (Express + Socket.io)
    httpServer.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    // Redis 연결 실패해도 서버는 시작 (graceful degradation)
    httpServer.listen(port, () => {
      console.log(`Server listening on port ${port} (without Redis)`);
    });
  }
};

startServer();
