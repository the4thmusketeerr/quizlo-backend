import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import "dotenv/config";
import { prisma } from "../lib/prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:9000/auth/google/callback",
      passReqToCallback: true,
    },
    async (request, accessToken, refreshToken, profile, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            email: profile.emails[0].value,
          },
        });

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);
