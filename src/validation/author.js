import { body } from "express-validator";

export const authorsValidation = [
  body("name").exists().isString().withMessage("Name must be a String!"),
  body("email").exists().isEmail().withMessage("Email Must be a valid email!"),
  body("role").exists().isString().withMessage("Role must be a String!"),
  body("password")
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be minimum 8 Chars."),
  body("birthDate")
    .optional()
    .isString()
    .withMessage("Birth Date must be a String"),
  body("avatar")
    .optional()
    .isString()
    .withMessage("Avatar Date must be a String"),
  body("googleId")
    .optional()
    .isString()
    .withMessage("Google id must be a string."),
];
