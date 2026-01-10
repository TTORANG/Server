import { logoutResponseDTO, signinResponseDTO, userMyPageResponseDTO } from "../dtos/auth.dto.js";
import { handleSocialLoginSuccess, logoutUser } from "../services/auth.service.js";

export const handleSocialLoginCallback = async (req, res, next) => {
  try {
    const { profile, provider } = req.user;

    // 서비스 호출 (여기서 유저 확인 + 세션 저장 + 토큰 발급이 한 번에 일어남)
    const { user, tokens } = await handleSocialLoginSuccess(profile, provider);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: signinResponseDTO(user, tokens),
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetMyPage = (req, res) => {
  res.status(200).json({
    resultType: "SUCCESS",
    error: null,
    success: userMyPageResponseDTO(req.user),
  });
};

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

// 계정 삭제
export const handleWithdrawal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // URL 파라미터의 ID와 현재 로그인 유저 ID 검증 (보안)
    if (req.params.id !== userId.toString()) {
      throw new BaseError("본인의 계정만 삭제할 수 있습니다.", 403, "A002");
    }
    const result = await processWithdrawal(userId);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (error) {
    error.reason = "계정 삭제에 실패했습니다. 고객 지원팀에 문의하세요.";
    next(error);
  }
};
