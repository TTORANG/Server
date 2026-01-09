export const signinResponseDTO = (user, tokens) => {
  return {
    message: "소셜 로그인 성공!",
    user: { id: user.id != null ? user.id.toString() : null, email: user.email, name: user.name },
    tokens: tokens,
  };
};

export const userMyPageResponseDTO = (user) => {
  return {
    message: `인증 성공! ${user.name}님의 마이페이지입니다.`,
    user: { id: user.id != null ? user.id.toString() : null, email: user.email, name: user.name },
  };
};

export const logoutResponseDTO = (user) => {
  return {
    message: "성공적으로 로그아웃되었습니다.",
    user: { id: user?.id ? user.id.toString() : null },
  };
};
