import { prisma } from "../db.config.js";

// 이메일로 유저 찾기
export const findUserByEmail = async (email) => {
  return await prisma.user.findFirst({
    where: { email: email },
  });
};

// ID로 유저 찾기 (JWT 검증용)
export const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id: id },
  });
};

// 신규 소셜 유저 생성
export const createSocialUser = async (email, name, provider, providerId, role) => {
  const user = await prisma.user.create({
    data: {
      email,
      name,
      oauthProvider: provider,
      oauthId: providerId,
      role: role,
    },
  });
  return user.id;
};
