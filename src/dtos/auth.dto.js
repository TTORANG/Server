export const signinResponseDTO = (user, tokens) => {
  return {
    message: "소셜 로그인 성공!",
    user: { id: user.id, email: user.email, name: user.name },
    tokens: tokens,
  };
};

export const userMyPageResponseDTO = (user) => {
  return {
    message: `인증 성공! ${user.name}님의 마이페이지입니다.`,
    user: { id: user.id, email: user.email, name: user.name },
  };
};
