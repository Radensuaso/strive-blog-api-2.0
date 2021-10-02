import createHttpError from "http-errors";
import { verifyJWT } from "./tokenTools.js";
import AuthorModel from "../schemas/author.js";

const tokenAuthMiddleware = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      const decodedToken = await verifyJWT(token);
      const author = await AuthorModel.findById(decodedToken._id);
      if (author) {
        req.user = author;
        next();
      } else {
        next(createHttpError(404, "Author not found!"));
      }
    } else {
      next(createHttpError(401, "Please provide email and password."));
    }
  } catch (error) {
    next(error);
  }
};

export default tokenAuthMiddleware;
