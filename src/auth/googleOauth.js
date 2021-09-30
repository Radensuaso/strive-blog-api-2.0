import GoogleStrategy from "passport-google-oauth20";
import passport from "passport";
import AuthorModel from "../services/authors/schema.js";
import { returnJWTToken } from "./tools.js";

const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_OAUTH_ID,
    clientSecret: process.env.GOOGLE_OAUTH_SECRET,
    callbackURL: `${process.env.BE_URL}/authors/googleRedirect`,
  },
  async (accessToken, refreshToken, profile, passportNext) => {
    console.log(profile);
    try {
      const author = await AuthorModel.findOne({ googleId: profile.id });
    } catch (error) {
      passportNext(error);
    }
  }
);

passport.serializeUser(function (author, passportNext) {
  passportNext(null, author);
});

export default googleStrategy;
