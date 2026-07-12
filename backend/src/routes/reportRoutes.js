import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getReports } from "../controllers/reportController.js";

const router = Router();
router.get("/", protect, getReports);

export default router;
