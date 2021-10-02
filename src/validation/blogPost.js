import { body } from "express-validator";

export const blogPostValidation = [
  body("category")
    .exists()
    .isString()
    .withMessage("Category must be a string!"),
  body("title").exists().isString().withMessage("Title must be a string!"),
  body("content").exists().isString().withMessage("Content must be a string!"),
  body("readTime.value")
    .exists()
    .isNumeric()
    .withMessage("Value read time must be a number!"),
  body("readTime.unit")
    .exists()
    .isString()
    .withMessage("Unit read time must be a string!"),
];

export const blogPostCommentValidation = [
  body("comment")
    .exists()
    .withMessage("You have to write something in the comment"),
];
