import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getAdminAnalytics, getAdminAnalyticsStatus } from "../controllers/adminAnalyticsController.js";

const router = Router();

router.get("/status", getAdminAnalyticsStatus);
router.get("/", protect, getAdminAnalytics);

export default router;
