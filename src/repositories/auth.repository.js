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
  return await prisma.user.create({
    data: {
      email,
      name,
      nickName: name,
      oauthProvider: provider,
      oauthId: providerId,
      role: role,
    },
  });
};

export const deleteRefreshToken = async (userId) => {
  return await prisma.session.update({
    where: {
      uq_session_user_anonymous: {
        userId: userId,
        isAnonymous: false,
      },
    },
    data: {
      refreshToken: null,
      lastSeenAt: new Date(),
    },
  });
};

export const withdrawUser = async (userId) => {
  return await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: BigInt(userId) },
      data: { isDeleted: true },
    });

    await tx.session.deleteMany({
      where: { userId: BigInt(userId) },
    });
  });
};
