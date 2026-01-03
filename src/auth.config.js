import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import * as authService from "./services/auth.service.js";
import * as authRepository from "./repositories/auth.repository.js";
import { UserNotFoundError } from "./errors/auth.error.js";

export const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.PASSPORT_GOOGLE_CLIENT_ID,
    clientSecret: process.env.PASSPORT_GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    scope: ["email", "profile"],
  },
  async (accessToken, refreshToken, profile, cb) => {
    try {
      const user = await authService.socialLoginVerification(profile, "google");
      const tokens = authService.generateTokens(user);
      return cb(null, { user, tokens }); // user 정보와 토큰을 같이 전달
    } catch (err) {
      return cb(err);
    }
  }
);

export const jwtStrategy = new JwtStrategy(
  { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET },
  async (payload, done) => {
    try {
      const user = await authRepository.findUserById(payload.id);
      return user ? done(null, user) : done(new UserNotFoundError({ id: payload.id }), false);
    } catch (err) {
      return done(err, false);
    }
  }
);
