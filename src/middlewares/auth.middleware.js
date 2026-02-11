import passport from "passport";
import { AuthSessionRequiredError } from "../errors/auth.error.js";
import { prisma } from "../db.config.js";

export const isLogin = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    try {
      if (err || !user) {
        return next(new AuthSessionRequiredError(info ? info.message : null));
      }

      if (!user.sessionId) {
        return next(new AuthSessionRequiredError("세션 정보가 없습니다. 다시 로그인해주세요."));
      }

      const session = await prisma.session.findFirst({
        where: {
          id: user.sessionId,
          userId: BigInt(user.id),
        },
      });

      if (!session) {
        // DB에 세션이 없으면 무효화 처리
        return next(new AuthSessionRequiredError("유효하지 않은 세션입니다. 다시 로그인해주세요."));
      }

      if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
        return next(new AuthSessionRequiredError("세션이 만료되었습니다. 다시 로그인해주세요."));
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  })(req, res, next);
};
