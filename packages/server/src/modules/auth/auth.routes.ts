import { Router } from "express";
import { validateRegister, validateLogin } from "./auth.dto";
import { registerHandler, loginHandler, meHandler } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/auth";

const router = Router();

router.post("/register", validateRegister, validate, registerHandler);
router.post("/login", validateLogin, validate, loginHandler);
router.get("/me", authGuard, meHandler);

export default router;
