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

  if (provider === "google") {
    email = profile.emails?.[0]?.value;
    name = profile.displayName;
  } else if (provider === "kakao") {
    email = profile._json?.kakao_account?.email;
    name = profile.displayName || profile._json?.properties?.nickname;
  } else if (provider === "naver") {
    email = profile._json?.email;
    name = profile._json?.name;
  }

  if (!email) throw new EmailNotFoundError({ profileId: profile.id });

  let user = await authRepository.findUserByEmail(email);

  if (!user) {
    const userId = await authRepository.createSocialUser(
      email,
      name,
      provider,
      profile.id.toString()
    );
    user = { id: userId, email, name };
  }

  return user;
};
