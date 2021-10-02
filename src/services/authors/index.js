import express from "express";
import AuthorModel from "../../schemas/author.js";
import q2m from "query-to-mongo";
import createHttpError from "http-errors";
import adminOnlyMiddleware from "../../auth/adminAuth.js";
import tokenAuthMiddleware from "../../auth/tokenAuth.js";
import { returnJWTToken } from "../../auth/tools.js";
import passport from "passport";
/* import { authorsValidation } from "./validation.js";
import { validationResult } from "express-validator";
import multer from "multer";
import { pipeline } from "stream";
import json2csv from "json2csv"; */

const authorsRouter = express.Router(); // provide Routing

// =================== Get all Authors ====================

authorsRouter.get("/", async (req, res, next) => {
  try {
    const query = q2m(req.query);
    const { total, authors } = await AuthorModel.findAuthors(query);

    res.send({ links: query.links("/authors", total), total, authors });
  } catch (error) {
    next(error);
  }
});

// =================== Register Author ====================
authorsRouter.post("/register", async (req, res, next) => {
  try {
    const newAuthor = new AuthorModel(req.body);
    const savedAuthor = await newAuthor.save();
    res.status(201).send(savedAuthor);
  } catch (error) {
    next(error);
  }
});

// =================== Login me ====================
authorsRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const author = await AuthorModel.checkCredentials(email, password);
    if (author) {
      const accessToken = await returnJWTToken(author);
      res.send(accessToken);
    } else {
      next(createHttpError(401, "Email and/or password are wrong."));
    }
  } catch (error) {
    next(error);
  }
});

// ================== Google Login =================
authorsRouter.get(
  "/googleLogin",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// ================= Google redirect ===============
authorsRouter.get(
  "/googleRedirect",
  passport.authenticate("google"),
  async (req, res, next) => {
    try {
      console.log("REQ.USER", req.user);
      res.redirect(`${process.env.FE_PROD_URL}?accessToken=${req.user.token}`);
    } catch (error) {
      next(error);
    }
  }
);

// =================== Get me ====================
authorsRouter.get("/me", tokenAuthMiddleware, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (error) {
    next(error);
  }
});

// =================== Update me ====================
authorsRouter.put("/me", tokenAuthMiddleware, async (req, res, next) => {
  try {
    const updatedMe = await AuthorModel.findByIdAndUpdate(
      req.user._id,
      { ...req.body, role: req.user.role },
      { new: true }
    );
    res.send(updatedMe);
  } catch (error) {
    next(error);
  }
});

// =================== Delete me ====================
authorsRouter.delete("/me", tokenAuthMiddleware, async (req, res, next) => {
  try {
    const deletedMe = await AuthorModel.findByIdAndDelete(req.user._id);
    res.send("You've deleted your account!");
  } catch (error) {
    next(error);
  }
});

// =================== Get single Author ====================
authorsRouter.get(
  "/:authorId",
  tokenAuthMiddleware,
  adminOnlyMiddleware,
  async (req, res, next) => {
    try {
      const { authorId } = req.params;
      const author = await AuthorModel.findById(authorId);
      if (author) {
        res.send(author);
      } else {
        next(createHttpError(404, `Author with id: ${authorId} not found`));
      }
    } catch (error) {
      next(error);
    }
  }
);

// =================== Update Author ====================
authorsRouter.put(
  "/:authorId",
  tokenAuthMiddleware,
  adminOnlyMiddleware,
  async (req, res, next) => {
    try {
      const { authorId } = req.params;
      const updatedAuthor = await AuthorModel.findByIdAndUpdate(
        authorId,
        req.body,
        {
          new: true,
        }
      );
      if (updatedAuthor) {
        res.send(updatedAuthor);
      } else {
        next(createHttpError(404, `Author with id: ${authorId} not found`));
      }
    } catch (error) {
      next(error);
    }
  }
);

// =================== Delete Author ====================
authorsRouter.delete(
  "/:authorId",
  tokenAuthMiddleware,
  adminOnlyMiddleware,
  async (req, res, next) => {
    try {
      const { authorId } = req.params;
      const deletedAuthor = await AuthorModel.findByIdAndDelete(authorId);
      if (deletedAuthor) {
        res.send(deletedAuthor);
      } else {
        next(createHttpError(404, `Author with id: ${authorId} not found`));
      }
    } catch (error) {
      next(error);
    }
  }
);

/* 
// =================== AUTHORS AVATAR ====================

authorsRouter.post(
  "/me/uploadAvatar",
  multer({ storage: saveAvatarCloudinary }).single("avatar"),
  async (req, res, next) => {
    try {
      const paramsId = req.params._id;
      const authors = await readAuthors();
      const author = authors.find((a) => a._id === paramsId);
      if (author) {
        const avatarUrl = req.file.path;
        const updatedAuthor = { ...author, avatar: avatarUrl };
        const remainingAuthors = authors.filter((a) => a._id !== paramsId);
        remainingAuthors.push(updatedAuthor);
        await writeAuthors(remainingAuthors);
        res.send(updatedAuthor);
      } else {
        next(
          createHttpError(404, `Author with the id: ${paramsId} was not found.`)
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// ================= Download CSV File ==================
authorsRouter.get("/download/CSV", async (req, res, next) => {
  try {
    res.setHeader("Content-Disposition", `attachment; filename=Authors.csv`);
    const source = getAuthorsReadableStream();
    const transform = new json2csv.Transform({
      fields: ["_id", "name", "surname", "email", "birthDate", "avatar"],
    });
    const destination = res;
    pipeline(source, transform, destination, (err) => {
      if (err) next(err);
    });
  } catch (error) {
    next(error);
  }
}); */

export default authorsRouter;
