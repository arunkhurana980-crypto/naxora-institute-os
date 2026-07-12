import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createProgress,
  deleteProgress,
  getProgressById,
  getProgressReports,
  updateProgress,
  updateProgressStatus,
} from "../controllers/progressController.js";

const router = Router();

router.use(protect);
router.route("/").get(getProgressReports).post(createProgress);
router.route("/:id").get(getProgressById).put(updateProgress).delete(deleteProgress);
router.patch("/:id/status", updateProgressStatus);

export default router;
