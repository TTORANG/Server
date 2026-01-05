import jwt from "jsonwebtoken";
import * as authRepository from "../repositories/auth.repository.js";
import { EmailNotFoundError } from "../errors/auth.error.js";

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
    const response = profile._json?.response;
    email = response?.email || profile._json?.email;
    name = response?.name || profile._json?.name;
    providerId = response?.id || profile.id;
  }

  console.log(`${provider} 프로필 정보:`, { email, name, providerId });

  if (!email) throw new EmailNotFoundError({ profileId: providerId });

  let user = await authRepository.findUserByEmail(email);

  if (!user) {
    const userId = await authRepository.createSocialUser(
      email,
      name || "사용자",
      provider,
      providerId.toString()
    );
    user = { id: userId, email, name: name || "사용자" };
  }

  return user;
};
