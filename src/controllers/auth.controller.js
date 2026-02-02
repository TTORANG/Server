import { logoutResponseDTO, signinResponseDTO, withdrawalResponseDTO } from "../dtos/auth.dto.js";
import { UserNotSameError, WithdrawFailedError } from "../errors/auth.error.js";
import {
  handleSocialLoginSuccess,
  logoutUser,
  processWithdrawal,
} from "../services/auth.service.js";

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: 구글 소셜 로그인 콜백
 *     description: 구글 OAuth 인증 후 리다이렉트되는 엔드포인트로, 유저 정보를 확인하고 JWT 토큰을 발급합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SocialLoginSuccess'
 *       400:
 *         $ref: '#/components/responses/AuthFailure'
 */
/**
 * @swagger
 * /auth/kakao/callback:
 *   get:
 *     summary: 카카오 소셜 로그인 콜백
 *     description: 카카오 OAuth 인증 후 리다이렉트되는 엔드포인트로, 유저 정보를 확인하고 JWT 토큰을 발급합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SocialLoginSuccess'
 *       400:
 *         $ref: '#/components/responses/AuthFailure'
 */
/**
 * @swagger
 * /auth/naver/callback:
 *   get:
 *     summary: 네이버 소셜 로그인 콜백
 *     description: 네이버 OAuth 인증 후 리다이렉트되는 엔드포인트로, 유저 정보를 확인하고 JWT 토큰을 발급합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SocialLoginSuccess'
 *       400:
 *         $ref: '#/components/responses/AuthFailure'
 */
export const handleSocialLoginCallback = async (req, res, next) => {
  try {
    const { profile, provider } = req.user;

    // 서비스 호출 (여기서 유저 확인 + 세션 저장 + 토큰 발급이 한 번에 일어남)
    const { user, tokens, sessionId } = await handleSocialLoginSuccess(profile, provider);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: signinResponseDTO(user, tokens, sessionId),
    });
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
 *                   success: null
 *               WithdrawFailed:
 *                 summary: 내부 처리 중 계정 삭제 실패 (A003)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "A003"
 *                     reason: "계정 삭제에 실패했습니다. 고객 지원팀에 문의하세요."
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
