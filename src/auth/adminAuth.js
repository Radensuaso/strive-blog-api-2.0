import createHttpError from "http-errors";

const adminOnlyMiddleware = (req, res, next) => {
  if (req.author.role === "Admin") {
    next();
  } else {
    next(createHttpError(403, "Admins only!"));
  }
};

export default adminOnlyMiddleware;
