import express from "express";
import AuthorModel from "../../schemas/author.js";
import q2m from "query-to-mongo";
import createHttpError from "http-errors";
import adminOnlyMiddleware from "../../auth/adminAuth.js";
import tokenAuthMiddleware from "../../auth/tokenAuth.js";
import { generateJWTTokens } from "../../auth/tokenTools.js";
import passport from "passport";
import multer from "multer";
import { saveAvatarCloudinary } from "../../lib/cloudinaryTools.js";
import { authorsValidation } from "../../validation/author.js";
import { validationResult } from "express-validator";
import { pipeline } from "stream";
import json2csv from "json2csv";

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
authorsRouter.post("/register", authorsValidation, async (req, res, next) => {
  try {
    const errorList = validationResult(req);
    if (errorList.isEmpty()) {
      if (req.body.password) {
        const newAuthor = new AuthorModel(req.body);
        const savedAuthor = await newAuthor.save();
        res.status(201).send(savedAuthor);
      } else {
        next(createHttpError(400, "Password is Required!"));
      }
    } else {
      next(createHttpError(400, errorList));
    }
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
      const accessToken = await generateJWTTokens(author);
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

// ================= Download CSV File ==================
authorsRouter.get("/me/CSV", tokenAuthMiddleware, async (req, res, next) => {
  try {
    const authorId = req.user._id;
    const author = await AuthorModel.findById(authorId);
    const jsonAuthor = JSON.parse(JSON.stringify(author));

    const CSVFields = ["_id", "name", "email", "role", "birthDate", "avatar"];
    const json2CSVParser = new json2csv.Parser({ CSVFields });
    const CSVauthor = json2CSVParser.parse(jsonAuthor);

    res.setHeader(
      "Content-disposition",
      `attachment; filename=${author.name}.csv`
    );

    res.set("Content-Type", "text/csv");
    res.status(200).end(CSVauthor);
  } catch (error) {
    next(error);
  }
});

// =================== upload avatar ====================
authorsRouter.post(
  "/me/uploadAvatar",
  tokenAuthMiddleware,
  multer({ storage: saveAvatarCloudinary }).single("avatar"),
  async (req, res, next) => {
    try {
      const authorId = req.user._id;
      const avatarUrl = req.file.path;

      const updatedAuthor = await AuthorModel.findByIdAndUpdate(
        authorId,
        {
          avatar: avatarUrl,
        },
        { new: true }
      );
      res.send(updatedAuthor);
    } catch (error) {
      next(error);
    }
  }
);

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

export default authorsRouter;
