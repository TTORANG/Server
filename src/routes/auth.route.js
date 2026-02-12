import express from "express";
import passport from "passport";
import { isLogin } from "../middlewares/auth.middleware.js";
import {
  handleLogout,
  handleReissueToken,
  handleSocialLoginCallback,
  handleSocialLoginFailed,
  handleWithdrawal,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/login-failed", handleSocialLoginFailed);

// 구글 라우트
router.get("/auth/google/login", passport.authenticate("google", { session: false }));
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login-failed" }),
  handleSocialLoginCallback
);
// 카카오 라우트
router.get("/auth/kakao/login", passport.authenticate("kakao", { session: false }));
router.get(
  "/auth/kakao/callback",
  passport.authenticate("kakao", { session: false, failureRedirect: "/login-failed" }),
  handleSocialLoginCallback
);

// 네이버 라우트
router.get("/auth/naver/login", passport.authenticate("naver", { session: false }));
router.get(
  "/auth/naver/callback",
  passport.authenticate("naver", { session: false, failureRedirect: "/login-failed" }),
  handleSocialLoginCallback
);

// 로그아웃
router.post("/auth/logout", isLogin, handleLogout);

// 계정 삭제
router.delete("/users/:userId", isLogin, handleWithdrawal);

// 토큰 유효성 검증, 새로운 토큰 쌍 발급
router.post("/auth/reissue", handleReissueToken);

export default router;
