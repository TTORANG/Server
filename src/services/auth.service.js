import jwt from "jsonwebtoken";
import {
  EmailNotFoundError,
  RefreshTokenExpiredError,
  RefreshTokenInvalidError,
  RefreshTokenInvalidatedError,
  UserNotFoundError,
  WithdrawUserError,
} from "../errors/auth.error.js";
import {
  deleteRefreshToken,
  deleteSession,
  findSessionByToken,
  withdrawUser,
  createSocialUser,
  findUserByEmail,
  findUserById,
  updateSessionToken,
  updateUserProfileImage,
} from "../repositories/auth.repository.js";
import { findUserSession, upsertUserSession } from "../repositories/session.repository.js";
import { v4 as uuidv4 } from "uuid";

const secret = process.env.JWT_SECRET;
export const generateTokens = (payload) => {
  const { id, email, sessionId, profileImageUrl = "" } = payload;

  const accessToken = jwt.sign(
    { id: id.toString(), email: email, sessionId: sessionId || null, profileImageUrl },
    secret,
    {
      expiresIn: "1h",
    }
  );
  const refreshToken = jwt.sign({ id: id.toString() }, secret, { expiresIn: "14d" });
  return { accessToken, refreshToken, profileImageUrl };
};

export const socialLoginVerification = async (profile, provider) => {
  let email;
  let name;
  let providerId = profile.id;
  let profileImageUrl;

  if (provider === "google") {
    email = profile.emails?.[0]?.value;
    name = profile.displayName;
    profileImageUrl = profile.photos?.[0]?.value || null;
  } else if (provider === "kakao") {
    email = profile._json?.kakao_account?.email;
    name = profile.displayName || profile._json?.properties?.nickname;
    profileImageUrl =
      profile._json?.kakao_account?.profile?.profile_image_url ||
      profile._json?.properties?.profile_image ||
      profile._json?.properties?.thumbnail_image ||
      null;
  } else if (provider === "naver") {
    const response = profile._json?.response || profile._json;
    email = response?.email || profile.emails?.[0]?.value;
    name = response?.name || profile.displayName;
    providerId = response?.id || profile.id;
    profileImageUrl = response?.profile_image || null;
  }

  if (!email) throw new EmailNotFoundError({ profileId: providerId });

  let user = await findUserByEmail(email);

  if (user && user.isDeleted) {
    throw new WithdrawUserError();
  }
  if (!user) {
    user = await createSocialUser(
      email,
      name || "사용자",
      provider,
      providerId.toString(),
      undefined,
      profileImageUrl
    );
  } else if (profileImageUrl && user.profileImageUrl !== profileImageUrl) {
    user = await updateUserProfileImage(user.id, profileImageUrl);
  }

  return user;
};

export const handleSocialLoginSuccess = async (profile, provider) => {
  const user = await socialLoginVerification(profile, provider);

  const existingSession = await findUserSession(user.id);
  const sessionId = existingSession?.id || uuidv4();

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    sessionId: sessionId,
    profileImageUrl: user.profileImageUrl || "",
  });

  await upsertUserSession(user.id, tokens.refreshToken, sessionId);

  return { user, tokens, sessionId };
};
export const logoutUser = async (userId) => {
  try {
    const updatedSession = await deleteRefreshToken(userId);
    return { id: userId };
  } catch (error) {
    if (error.code === "P2025") {
      return { id: userId };
    }
    throw error;
  }
};

export const processWithdrawal = async (userId) => {
  await withdrawUser(userId);
  return { userId: userId };
};

// 토큰의 유효성을 검증하고 새로운 토큰 쌍을 발급 (세션 무효화 검증)
export const reissueToken = async (oldRefreshToken) => {
  // 토큰 존재 여부 확인
  if (!oldRefreshToken) {
    throw new RefreshTokenInvalidError();
  }

  let decoded;
  try {
    // JWT 서명 및 만료 시간 검증
    decoded = jwt.verify(oldRefreshToken, secret);
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      throw new RefreshTokenExpiredError();
    }
    throw new RefreshTokenInvalidError();
  }

  // 토큰 페이로드 내 사용자 ID 추출 및 BigInt 변환
  let userId;
  try {
    userId = BigInt(decoded.id);
  } catch {
    throw new RefreshTokenInvalidError();
  }

  // DB 세션 대조 (세션 무효화 검증의 핵심)
  const session = await findSessionByToken(oldRefreshToken);
  if (!session || !session.refreshToken || session.isAnonymous) {
    throw new RefreshTokenInvalidatedError();
  }

  // 보안 검증: 토큰의 주인과 세션의 주인이 일치하는지 확인
  // 일치하지 않으면 탈취된 토큰으로 간주하고 세션을 강제 종료(삭제)합니다.
  if (session.userId !== userId) {
    await deleteSession(session.id);
    throw new RefreshTokenInvalidatedError();
  }

  // 사용자 상태 재확인 (탈퇴 여부 등)
  const user = await findUserById(userId);
  if (!user) throw new UserNotFoundError({ userId: userId.toString() });
  if (user.isDeleted) throw new WithdrawUserError({ userId: userId.toString() });

  // 새로운 Access/Refresh 토큰 쌍 생성 (RTR 적용)
  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    sessionId: session.id,
    profileImageUrl: user.profileImageUrl || "",
  });

  // DB의 리프레시 토큰을 새 것으로 교체하여 보안성 유지
  await updateSessionToken(session.id, tokens.refreshToken);

  return { user, tokens, sessionId: session.id };
};
