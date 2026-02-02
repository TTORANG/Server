import passport from "passport";
import { AuthSessionRequiredError } from "../errors/auth.error.js";

export const isLogin = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      const authError = new AuthSessionRequiredError(info ? info.message : null);
      return next(authError);
    }

    req.user = user;
    next();
  })(req, res, next);
};
