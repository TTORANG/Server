import { logoutResponseDTO, reissueTokenDTO, withdrawalResponseDTO } from "../dtos/auth.dto.js";
import { AuthSessionRequiredError, UserNotSameError } from "../errors/auth.error.js";
import {
  handleSocialLoginSuccess,
  logoutUser,
  processWithdrawal,
  reissueToken,
} from "../services/auth.service.js";

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: 구글 소셜 로그인 콜백
 *     description: |
 *       구글 인증 완료 후 호출되는 엔드포인트입니다.
 *       성공 시 보안 강화를 위해 인증 정보를 다음과 같이 분할 전달합니다.
 *         - **accessToken, sessionId**: URL 파라미터로 전달 (프론트엔드에서 수동 저장 필요)
 *         - **refreshToken**: HttpOnly 쿠키로 설정 (브라우저가 자동 저장/관리)
 *     tags: [Auth]
 *     responses:
 *       302:
 *         $ref: '#/components/responses/SocialLoginRedirect'
 *       400:
 *         $ref: '#/components/responses/AuthFailure'
 */
/**
 * @swagger
 * /auth/kakao/callback:
 *   get:
 *     summary: 카카오 소셜 로그인 콜백
 *     description: |
 *       카카오 인증 완료 후 호출되는 엔드포인트입니다.
 *       성공 시 보안 강화를 위해 인증 정보를 다음과 같이 분할 전달합니다.
 *         - **accessToken, sessionId**: URL 파라미터로 전달 (프론트엔드에서 수동 저장 필요)
 *         - **refreshToken**: HttpOnly 쿠키로 설정 (브라우저가 자동 저장/관리)
 *     tags: [Auth]
 *     responses:
 *       302:
 *         $ref: '#/components/responses/SocialLoginRedirect'
 *       400:
 *         $ref: '#/components/responses/AuthFailure'
 */
/**
 * @swagger
 * /auth/naver/callback:
 *   get:
 *     summary: 네이버 소셜 로그인 콜백
 *     description: |
 *       네이버 인증 완료 후 호출되는 엔드포인트입니다.
 *       성공 시 보안 강화를 위해 인증 정보를 다음과 같이 분할 전달합니다.
 *         - **accessToken, sessionId**: URL 파라미터로 전달 (프론트엔드에서 수동 저장 필요)
 *         - **refreshToken**: HttpOnly 쿠키로 설정 (브라우저가 자동 저장/관리)
 *     tags: [Auth]
 *     responses:
 *       302:
 *         $ref: '#/components/responses/SocialLoginRedirect'
 *       400:
 *         $ref: '#/components/responses/AuthFailure'
 */
export const handleSocialLoginCallback = async (req, res, next) => {
  try {
    const { profile, provider } = req.user;

    // 서비스 호출 ( 세션 저장 + 토큰 발급이 한 번에 일어남)
    const { user, tokens, sessionId } = await handleSocialLoginSuccess(profile, provider);

    // refreshToken을 HttpOnly 쿠키에 설정
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true, // 자바스크립트 접근 방지 (XSS 방어)
      secure: process.env.NODE_ENV === "production", // HTTPS에서만 전송
      sameSite: "Lax", // CSRF 방어와 리다이렉트 호환성 사이의 균형
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 (밀리초 단위)
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = new URL("/auth/callback", frontendUrl);

    // accessToken과 sessionId만 URL에 포함
    redirectUrl.searchParams.set("accessToken", tokens.accessToken);
    redirectUrl.searchParams.set("sessionId", sessionId);

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 로그아웃
 *     description: 현재 로그인한 사용자의 리프레시 토큰을 무효화하고 로그아웃을 처리합니다.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "성공적으로 로그아웃되었습니다."
 *                 user:
 *                   id: "123"
 *       401:
 *         description: 인증 실패 또는 토큰 누락/만료
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "U001"
 *                 reason: "존재하지 않는 사용자입니다."
 *                 data: null
 *               success: null
 */
export const handleLogout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await logoutUser(userId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: logoutResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: 계정 삭제
 *     description: 현재 로그인한 사용자의 계정을 삭제합니다. 본인 계정만 삭제할 수 있습니다.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *         description: 삭제할 사용자 userId (현재 로그인한 사용자와 일치해야 합니다)
 *     responses:
 *       200:
 *         description: 계정 삭제 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "계정이 성공적으로 삭제되었습니다."
 *                 user:
 *                   id: "123"
 *                 withdrawnAt: "2026-01-15T10:00:00.000Z"
 *       403:
 *         description: 본인 계정이 아니거나 계정 삭제에 실패한 경우
 *         content:
 *           application/json:
 *             examples:
 *               NotSameUser:
 *                 summary: 다른 사용자의 계정을 삭제하려는 경우 (A002)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "A002"
 *                     reason: "본인의 계정만 삭제할 수 있습니다."
 *                     data: null
 *                   success: null
 *               WithdrawFailed:
 *                 summary: 내부 처리 중 계정 삭제 실패 (A003)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "A003"
 *                     reason: "계정 삭제에 실패했습니다. 고객 지원팀에 문의하세요."
 *                     data: null
 *                   success: null
 *       401:
 *         description: 인증 실패 또는 토큰 누락/만료
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "A004"
 *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
 *                 data: null
 *               success: null
 */
export const handleWithdrawal = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;
    // URL 파라미터의 userId와 현재 로그인 유저 ID 검증 (보안)
    if (userId !== currentUserId.toString()) {
      return next(new UserNotSameError());
    }
    const result = await processWithdrawal(currentUserId);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: withdrawalResponseDTO(result.userId),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /auth/reissue:
 *   post:
 *     summary: 리프레시 토큰 재발급
 *     description: |
 *       HttpOnly 쿠키로 전달된 Refresh Token을 검증하고 Access Token을 재발급합니다.
 *       RTR 적용: 기존 Refresh Token 무효화 후 새 토큰을 저장합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *           example: {}
 *     responses:
 *       200:
 *         description: 재발급 성공
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: HttpOnly Refresh Token 쿠키
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "리프레시 토큰이 재발급되었습니다."
 *                 user:
 *                   id: "123"
 *                   email: "user@example.com"
 *                   name: "사용자"
 *                   profileImageUrl: "https://cdn.example.com/profile.jpg"
 *                   sessionId: "2f1d7a64-2b47-4b3f-b2a9-2a4b2b5c3e4f"
 *                 tokens:
 *                   accessToken: "new-access-token"
 *       401:
 *         description: 리프레시 토큰 만료/위변조/누락
 *         content:
 *           application/json:
 *             examples:
 *               TokenExpired:
 *                 summary: 만료된 리프레시 토큰 (A005)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "A005"
 *                     reason: "리프레시 토큰이 만료되었습니다."
 *                     data: null
 *                   success: null
 *               TokenInvalid:
 *                 summary: 유효하지 않은 리프레시 토큰 (A006)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "A006"
 *                     reason: "리프레시 토큰이 유효하지 않습니다."
 *                     data: null
 *                   success: null
 *               SessionRequired:
 *                 summary: 토큰 누락 (A004)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "A004"
 *                     reason: "인증 세션 정보가 없거나 유효하지 않습니다."
 *                     data: null
 *                   success: null
 *       403:
 *         description: 세션 무효화 또는 DB 토큰 불일치
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "A007"
 *                 reason: "리프레시 토큰이 무효화되었습니다."
 *                 data: null
 *               success: null
 */
export const handleReissueToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) return next(new AuthSessionRequiredError());

    // 서비스 호출하여 검증 및 새 토큰 생성
    const { user, tokens, sessionId } = await reissueToken(refreshToken);

    // 새 리프레시 토큰을 다시 HttpOnly 쿠키에 저장 (보안 유지)
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: reissueTokenDTO(user, tokens, sessionId),
    });
  } catch (error) {
    next(error);
  }
};
