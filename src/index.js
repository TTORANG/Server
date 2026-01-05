import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import passport from "passport";
import { googleStrategy, jwtStrategy, kakaoStrategy, naverStrategy } from "./auth.config.js";
import {
  handleGetMyPage,
  handleGoogleCallback,
  handleKakaoCallback,
  handleNaverCallback,
} from "./controllers/auth.controller.js";
dotenv.config();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

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

// 구글 라우트
app.get("/auth/google/login", passport.authenticate("google", { session: false }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login-failed" }),
  handleGoogleCallback
);
// 카카오 라우트
app.get("/auth/kakao/login", passport.authenticate("kakao", { session: false }));
app.get(
  "/auth/kakao/callback",
  passport.authenticate("kakao", { session: false, failureRedirect: "/login-failed" }),
  handleKakaoCallback
);

// 네이버 라우트
app.get("/auth/naver/login", passport.authenticate("naver", { session: false }));
app.get(
  "/auth/naver/callback",
  passport.authenticate("naver", { session: false, failureRedirect: "/login-failed" }),
  handleNaverCallback
);

app.get("/user/mypage", isLogin, handleGetMyPage);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
