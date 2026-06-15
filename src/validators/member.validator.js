import { body } from "express-validator";

export const createMemberValidation = [
  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required"),

  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone is required"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email"),
];