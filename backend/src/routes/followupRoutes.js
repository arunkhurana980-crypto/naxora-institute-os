import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addFollowupLog,
  getFollowupBoard,
  snoozeFollowup,
  updateFollowupLead,
} from "../controllers/followupController.js";

const router = Router();

router.use(protect);

router.get("/", getFollowupBoard);
router.post("/:id/log", addFollowupLog);
router.patch("/:id/snooze", snoozeFollowup);
router.patch("/:id", updateFollowupLead);

export default router;
