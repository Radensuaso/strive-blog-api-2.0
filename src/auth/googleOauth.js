import GoogleStrategy from "passport-google-oauth20";
import passport from "passport";
import AuthorModel from "../schemas/author.js";
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

      if (author) {
        const token = await returnJWTToken(author);
        passportNext(null, { token });
      } else {
        const newAuthor = {
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          googleId: profile.id,
          role: "Author",
        };

        const createdAuthor = new AuthorModel(newAuthor);
        const savedAuthor = await createdAuthor.save();
        const token = await returnJWTToken(savedAuthor);
        passportNext(null, { token });
      }
    } catch (error) {
      passportNext(error);
    }
  }
);

passport.serializeUser(function (user, passportNext) {
  passportNext(null, user);
});

export default googleStrategy;
