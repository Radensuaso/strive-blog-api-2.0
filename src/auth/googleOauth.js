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

      if (author) {
        const tokens = await returnJWTToken(author);
        passportNext(null, { tokens });
      } else {
        const newAuthor = {
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar:
            "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png",
          googleId: profile.id,
          role: "Author",
        };

        const createdAuthor = new AuthorModel(newAuthor);
        const savedAuthor = await createdAuthor.save();
        const tokens = await returnJWTToken(savedAuthor);
        passportNext(null, { tokens });
      }
    } catch (error) {
      passportNext(error);
    }
  }
);

passport.serializeUser(function (author, passportNext) {
  passportNext(null, author);
});

export default googleStrategy;
