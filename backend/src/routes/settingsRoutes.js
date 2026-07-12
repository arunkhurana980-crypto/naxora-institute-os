import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getSettings, resetSettings, updateBranding, updateSettings } from "../controllers/settingsController.js";

const router = Router();

router.use(protect);
router.route("/").get(getSettings).put(updateSettings);
router.patch("/branding", updateBranding);
router.post("/reset", resetSettings);

export default router;
