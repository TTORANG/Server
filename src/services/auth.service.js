import jwt from "jsonwebtoken";
import * as authRepository from "../repositories/auth.repository.js";
import { EmailNotFoundError } from "../errors/auth.error.js";

const secret = process.env.JWT_SECRET;

export const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: "14d" });
  return { accessToken, refreshToken };
};

export const socialLoginVerification = async (profile, provider) => {
  const email = profile.emails?.[0]?.value;
  if (!email) throw new EmailNotFoundError({ profileId: profile.id });

  let user = await authRepository.findUserByEmail(email);

  // 유저가 없으면 회원가입
  if (!user) {
    const userId = await authRepository.createSocialUser(
      email,
      profile.displayName,
      provider,
      profile.id
    );
    user = { id: userId, email, name: profile.displayName };
  }

  return user;
};
