import dotenv from "dotenv";
import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import passport from "passport";
import { googleStrategy, jwtStrategy, kakaoStrategy, naverStrategy } from "./auth.config.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./swagger.config.js";
import cookieParser from "cookie-parser";
import { handleProcessJob } from "./controllers/conversionJob.controller.js";

// 라우터
import authRouter from "./routes/auth.route.js";
import sessionRouter from "./routes/session.route.js";
import projectRouter from "./routes/project.route.js";
import slideRouter from "./routes/slide.route.js";
import scriptRouter from "./routes/script.route.js";
import shareRouter from "./routes/shareLink.route.js";
import reactionRouter from "./routes/reaction.route.js";
import videoRouter from "./routes/video.route.js";
import commentRouter from "./routes/comment.route.js";
import fileRouter from "./routes/file.route.js";
import analyticsRouter from "./routes/analytics.route.js";

dotenv.config();
export const prisma = new PrismaClient();

const app = express();
app.use(cookieParser());

app.set("json replacer", (key, value) => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
});

const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
); // cors 방식 허용
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

// 리액션 라우터
app.use("/", reactionRouter);

// 영상 라우터
app.use("/", videoRouter);

// 댓글 라우터
app.use("/", commentRouter);

// 파일 라우터
app.use("/", fileRouter);

// Analytics 라우터
app.use("/analytics", analyticsRouter);

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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
