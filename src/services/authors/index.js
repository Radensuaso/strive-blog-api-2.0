import express from "express";
import AuthorModel from "./schema.js";
import q2m from "query-to-mongo";
import createHttpError from "http-errors";
/* import { authorsValidation } from "./validation.js";
import { validationResult } from "express-validator";
import multer from "multer";
import { pipeline } from "stream";
import json2csv from "json2csv"; */

const authorsRouter = express.Router(); // provide Routing

// =================== Post Author ====================
authorsRouter.post("/", async (req, res, next) => {
  try {
    const newAuthor = new AuthorModel(req.body);
    const savedAuthor = await newAuthor.save();
    res.status(201).send(savedAuthor);
  } catch (error) {
    next(error);
  }
});

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

// =================== Get single Author ====================
authorsRouter.get("/:authorId", async (req, res, next) => {
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
});

// =================== Update Author ====================
authorsRouter.put("/:authorId", async (req, res, next) => {
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
});

// =================== Delete Author ====================
authorsRouter.delete("/:authorId", async (req, res, next) => {
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
});
/* 
// =================== AUTHORS AVATAR ====================

authorsRouter.post(
  "/:authorId/uploadAvatar",
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
