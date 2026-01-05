import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import passport from "passport";
import { googleStrategy, jwtStrategy } from "./auth.config.js";
import { handleGetMyPage, handleGoogleCallback } from "./controllers/auth.controller.js";
import { postComplete, postUploadUrl } from "./controllers/files.controller.js";
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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const isLogin = passport.authenticate("jwt", { session: false });

app.get("/auth/google/login", passport.authenticate("google", { session: false }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login-failed" }),
  handleGoogleCallback
);
app.get("/user/mypage", isLogin, handleGetMyPage);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// 파일 업로드 API 라우팅(임시)
app.post("/api/files/upload-url", postUploadUrl);
app.post("/api/files/complete", postComplete);
