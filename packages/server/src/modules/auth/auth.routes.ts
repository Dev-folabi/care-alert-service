import { Router } from "express";
import { validateRegister, validateLogin } from "./auth.dto.js";
import { registerHandler, loginHandler, meHandler } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/auth.js";

const router = Router();

router.post("/register", validateRegister, validate, registerHandler);
router.post("/login", validateLogin, validate, loginHandler);
router.get("/me", authGuard, meHandler);

export default router;
