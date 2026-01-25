import jwt from "jsonwebtoken";
import { EmailNotFoundError, WithdrawUserError } from "../errors/auth.error.js";
import {
  deleteRefreshToken,
  withdrawUser,
  createSocialUser,
  findUserByEmail,
} from "../repositories/auth.repository.js";
import { upsertUserSession } from "../repositories/session.repository.js";
import { v4 as uuidv4 } from "uuid";

const secret = process.env.JWT_SECRET;
export const generateTokens = (payload) => {
  const { id, email, sessionId } = payload;

  const accessToken = jwt.sign(
    { id: id.toString(), email: email, sessionId: sessionId || null },
    secret,
    {
      expiresIn: "1h",
    }
  );
  const refreshToken = jwt.sign({ id: id.toString() }, secret, { expiresIn: "14d" });
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

  const sessionId = uuidv4();

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    sessionId: sessionId,
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
  const result = await withdrawUser(userId);
  return { id: userId };
};
