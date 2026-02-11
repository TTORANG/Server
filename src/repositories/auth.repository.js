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
    where: { id: BigInt(id) },
  });
};

// 신규 소셜 유저 생성
export const createSocialUser = async (
  email,
  name,
  provider,
  providerId,
  role,
  profileImageUrl
) => {
  return await prisma.user.create({
    data: {
      email,
      name,
      nickName: name,
      profileImageUrl,
      oauthProvider: provider,
      oauthId: providerId,
      role: role,
    },
  });
};

export const updateUserProfileImage = async (userId, profileImageUrl) => {
  return await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { profileImageUrl },
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
    const updatedUser = await tx.user.update({
      where: { id: BigInt(userId) },
      data: { isDeleted: true },
    });

    await tx.session.deleteMany({
      where: { userId: BigInt(userId) },
    });
    return updatedUser;
  });
};

// 리프레시 토큰으로 세션 조회
export const findSessionByToken = async (token) => {
  return await prisma.session.findFirst({
    where: {
      refreshToken: token,
      isAnonymous: false,
    },
  });
};

// 세션의 리프레시 토큰 갱신 (RTR)
export const updateSessionToken = async (sessionId, newToken) => {
  return await prisma.session.update({
    where: { id: sessionId },
    data: {
      refreshToken: newToken,
      lastSeenAt: new Date(),
    },
  });
};

// 세션 삭제/무효화
export const deleteSession = async (sessionId) => {
  return await prisma.session.deleteMany({
    where: { id: sessionId },
  });
};
