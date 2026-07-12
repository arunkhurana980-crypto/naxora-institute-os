import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getSecurityStatus, runFrontendDebug } from "../controllers/securityController.js";

const router = Router();

router.get("/status", protect, getSecurityStatus);
router.get("/debug", runFrontendDebug);

export default router;
