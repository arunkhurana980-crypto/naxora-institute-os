import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addLiveClassComment,
  createLiveClass,
  createLiveSubscription,
  deleteLiveClass,
  deleteLiveClassComment,
  getLiveClassById,
  getLiveClassComments,
  getLiveClasses,
  getLivePlans,
  getLiveSubscriptions,
  liveClassStatus,
  updateLiveClass,
  updateLiveClassStatus,
  updateLiveSubscriptionStatus,
} from "../controllers/liveClassController.js";

const router = Router();

router.get("/status", liveClassStatus);
router.get("/subscriptions/plans", getLivePlans);

router.use(protect);
router.get("/subscriptions", getLiveSubscriptions);
router.post("/subscriptions", createLiveSubscription);
router.patch("/subscriptions/:id/status", updateLiveSubscriptionStatus);

router.get("/", getLiveClasses);
router.post("/", createLiveClass);
router.get("/:id", getLiveClassById);
router.put("/:id", updateLiveClass);
router.patch("/:id/status", updateLiveClassStatus);
router.delete("/:id", deleteLiveClass);
router.get("/:id/comments", getLiveClassComments);
router.post("/:id/comments", addLiveClassComment);
router.delete("/comments/:commentId", deleteLiveClassComment);

export default router;
