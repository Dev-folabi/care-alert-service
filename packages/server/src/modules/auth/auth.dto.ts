import { body } from "express-validator";

export const validateRegister = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name must be at most 100 characters"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["clinician", "patient"])
    .withMessage("Role must be 'clinician' or 'patient'"),

  body("patientId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("patientId cannot be empty if provided"),
];

export const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];
