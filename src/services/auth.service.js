import jwt from "jsonwebtoken";
import { EmailNotFoundError, WithdrawUserError } from "../errors/auth.error.js";
import {
  deleteRefreshToken,
  withdrawUser,
  createSocialUser,
  findUserByEmail,
} from "../repositories/auth.repository.js";
import { upsertUserSession } from "../repositories/session.repository.js";

const secret = process.env.JWT_SECRET;
export const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id.toString(), email: user.email }, secret, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign({ id: user.id.toString() }, secret, { expiresIn: "14d" });
  return { accessToken, refreshToken };
};

export const socialLoginVerification = async (profile, provider) => {
  let email;
  let name;
  let providerId = profile.id;

  if (provider === "google") {
    email = profile.emails?.[0]?.value;
    name = profile.displayName;
  } else if (provider === "kakao") {
    email = profile._json?.kakao_account?.email;
    name = profile.displayName || profile._json?.properties?.nickname;
  } else if (provider === "naver") {
    const response = profile._json?.response || profile._json;
    email = response?.email || profile.emails?.[0]?.value;
    name = response?.name || profile.displayName;
    providerId = response?.id || profile.id;
  }

  if (!email) throw new EmailNotFoundError({ profileId: providerId });

  let user = await findUserByEmail(email);

  if (user && user.isDeleted) {
    throw new WithdrawUserError();
  }
  if (!user) {
    user = await createSocialUser(email, name || "사용자", provider, providerId.toString());
  }

  return user;
};

export const handleSocialLoginSuccess = async (profile, provider) => {
  const user = await socialLoginVerification(profile, provider);
  const tokens = generateTokens(user);

  await upsertUserSession(user.id, tokens.refreshToken);

  return { user, tokens };
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
  return { id: userId };
};
