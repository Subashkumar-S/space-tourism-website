import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { User, toSessionUser } from "../models/User";
import { applyAdminRole } from "../lib/adminRole";
import { env } from "./env";

export function configurePassport(): void {
  // ── Local: email + bcrypt password hash ─────────────────────────────────────
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ email: email.toLowerCase() });
          if (!user || !user.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) {
            return done(null, false, { message: "Invalid email or password" });
          }
          await applyAdminRole(user);
          return done(null, toSessionUser(user));
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  // ── Google: registered only when configured. Account linking by verified email:
  //    match googleId → else match email and attach googleId → else create. ──────
  if (env.googleEnabled) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          callbackURL: env.GOOGLE_CALLBACK_URL,
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: Profile,
          done: VerifyCallback
        ) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();

            let user = await User.findOne({ googleId });
            if (!user && email) {
              user = await User.findOne({ email });
              if (user) {
                user.googleId = googleId;
                await user.save();
              }
            }
            if (!user) {
              user = await User.create({
                name: profile.displayName || email || "Explorer",
                email: email || `${googleId}@google.local`,
                googleId,
                passwordHash: null,
              });
            }
            await applyAdminRole(user);
            return done(null, toSessionUser(user));
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

  // Sessions store only the Mongo _id; deserialize rehydrates the SessionUser.
  passport.serializeUser((user, done) => {
    done(null, (user as Express.User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id).lean();
      if (!user) return done(null, false);
      done(null, toSessionUser(user));
    } catch (err) {
      done(err as Error);
    }
  });
}
