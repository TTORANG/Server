import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import passport from "passport";
import { googleStrategy, jwtStrategy, kakaoStrategy, naverStrategy } from "./auth.config.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./swagger.config.js";
import {
  handleGetMyPage,
  handleSocialLoginCallback,
  handleLogout,
  handleWithdrawal,
} from "./controllers/auth.controller.js";
import { postComplete, postUploadUrl } from "./controllers/files.controller.js";
import {
  handleCreateAnonymousProject,
  handleCreateAnonymousSession,
  handleMergeSession,
  handleUpdateAnonymousProject,
} from "./controllers/session.controller.js";

import { handleProcessJob } from "./controllers/conversionJob.controller.js";
import {
  handleCreateProject,
  handleDeleteProject,
  handleGetProjectList,
  handleUpdateProjectName,
} from "./controllers/project.controller.js";
import {
  handleGetSlideDetail,
  handleGetSlides,
  handlePatchSlideTitle,
} from "./controllers/slide.controller.js";
import {
  completeVideoChunk,
  completeVideoUpload,
  createVideo,
  createVideoChunkUploadUrl,
} from "./controllers/video.controller.js";

dotenv.config();

const app = express();
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

const isLogin = passport.authenticate("jwt", { session: false });

// swagger 문서
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// 구글 라우트
app.get("/auth/google/login", passport.authenticate("google", { session: false }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login-failed" }),
  handleSocialLoginCallback
);
// 카카오 라우트
app.get("/auth/kakao/login", passport.authenticate("kakao", { session: false }));
app.get(
  "/auth/kakao/callback",
  passport.authenticate("kakao", { session: false, failureRedirect: "/login-failed" }),
  handleSocialLoginCallback
);

// 네이버 라우트
app.get("/auth/naver/login", passport.authenticate("naver", { session: false }));
app.get(
  "/auth/naver/callback",
  passport.authenticate("naver", { session: false, failureRedirect: "/login-failed" }),
  handleSocialLoginCallback
);

// 로그아웃
app.post("/auth/logout", isLogin, handleLogout);

// 계정 삭제
app.delete("/users/:id", isLogin, handleWithdrawal);

// 익명 세션 생성 (로그인 불필요)
app.post("/session/anonymous", handleCreateAnonymousSession);

// 익명 프로젝트 생성 (JWT 필수 - 익명 세션 토큰으로 인증)
app.post("/presentations/anonymous", isLogin, handleCreateAnonymousProject);

// 익명 프로젝트 업데이트 (JWT 필수 - 익명 세션 토큰으로 인증))
app.patch("/presentations/anonymous/:id", isLogin, handleUpdateAnonymousProject);

// 로그인 후 익명 세션 병합 (JWT 필수 - 실제 사용자 토큰)
app.post("/session/merge", isLogin, handleMergeSession);

// 마이페이지 라우트(로그인 테스트)
app.get("/user/mypage", isLogin, handleGetMyPage);

// 프로젝트 생성
app.post("/presentations", isLogin, handleCreateProject);

// 프로젝트 이름 업데이트
app.patch("/presentations/:id", isLogin, handleUpdateProjectName);

// 프로젝트 삭제
app.delete("/presentations/:id", isLogin, handleDeleteProject);

// 프로젝트 목록 조회/검색
app.get("/presentations", isLogin, handleGetProjectList);

// 슬라이드 목록 조회
app.get("/presentations/:projectId/slides", isLogin, handleGetSlides);

// 슬라이드 제목 수정
app.patch("/presentations/slides/:slideId", isLogin, handlePatchSlideTitle);

// 슬라이드 네비게이션 기능
app.get("/presentations/slides/:slideId", isLogin, handleGetSlideDetail);

// 파일 업로드 API 라우팅(임시)
app.post("/api/files/upload-url", postUploadUrl);
app.post("/api/files/complete", postComplete);

// 영상 업로드 API
app.post("/videos", isLogin, createVideo);
// 비디오 청크 업로드 url 발급
app.post("/videos/:videoId/chunks/upload-url", isLogin, createVideoChunkUploadUrl);
// 비디오 청크 업로드 검증
app.post("/videos/:videoId/chunks/complete", isLogin, completeVideoChunk);
// 비디오 업로드 검증
app.post("/videos/:videoId/complete", isLogin, completeVideoUpload);

// Worker 엔드포인트 (Cloud Tasks에서 호출)
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
