import createHttpError from "http-errors";
import atob from "atob";
import AuthorModel from "../services/authors/schema.js";

const basicAuthMiddleware = async (req, res, next) => {
  console.log(req.headers);
  if (req.headers.authorization) {
    const decodedCredentials = atob(req.headers.authorization.split(" ")[1]);
    const [email, plainPassword] = decodedCredentials.split(":");

    const author = await AuthorModel.checkCredentials(email, plainPassword);

    if (author) {
      req.author = author;
      next();
    } else {
      next(createHttpError(401, "Email and/or password are not correct!"));
    }
  } else {
    next(createHttpError(401, "Please provide email and password."));
  }
};

export default basicAuthMiddleware;
