import * as authService from "../services/auth.service.js";
import { signinResponseDTO, userMyPageResponseDTO } from "../dtos/auth.dto.js";

export const handleSocialLoginCallback = (req, res) => {
  const { user, tokens } = req.user;

  res.status(200).json({
    resultType: "SUCCESS",
    error: null,
    success: signinResponseDTO(user, tokens),
  });
};

export const handleGetMyPage = (req, res) => {
  res.status(200).json({
    resultType: "SUCCESS",
    error: null,
    success: userMyPageResponseDTO(req.user),
  });
};
