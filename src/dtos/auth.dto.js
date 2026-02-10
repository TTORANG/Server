export const signinResponseDTO = (user, tokens, sessionId) => {
  return {
    message: "소셜 로그인 성공!",
    user: {
      id: user.id != null ? user.id.toString() : null,
      email: user.email,
      name: user.name,
      sessionId,
    },
    tokens: tokens,
  };
};

export const logoutResponseDTO = (user) => {
  return {
    message: "성공적으로 로그아웃되었습니다.",
    user: { id: user?.id ? user.id.toString() : null },
  };
};

export const withdrawalResponseDTO = (userId) => {
  return {
    message: "계정이 성공적으로 삭제되었습니다.",
    user: {
      id: userId.toString(),
    },
    withdrawnAt: new Date().toISOString(),
  };
};

export const reissueTokenDTO = (user, tokens, sessionId) => {
  return {
    message: "리프레시 토큰이 재발급되었습니다.",
    user: {
      id: user.id != null ? user.id.toString() : null,
      email: user.email,
      name: user.name,
      sessionId,
    },
    tokens: {
      accessToken: tokens.accessToken,
    },
  };
};
