import { Router } from "express";
import { signup, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateEmail, validatePassword, validateRequired } from "../middleware/securityMiddleware.js";

const router = Router();
router.post("/signup", validateRequired(["name", "email", "password"]), validateEmail, validatePassword, signup);
router.post("/login", validateRequired(["email", "password"]), validateEmail, login);
router.get("/me", protect, getMe);
export default router;
