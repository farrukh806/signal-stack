import { Router } from "express";
import {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleMe,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { registerSchema, loginSchema } from "@repo/validations";

const router = Router();

router.post("/register", validate(registerSchema), handleRegister);
router.post("/login", validate(loginSchema), handleLogin);
router.post("/refresh", handleRefresh);
router.post("/logout", handleLogout);
router.get("/me", authMiddleware, handleMe);

export default router;
