import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createNotification,
  deleteNotification,
  getNotificationById,
  getNotificationConfig,
  listNotifications,
  sendTestNotification,
  updateNotification,
  updateNotificationStatus,
} from "../controllers/notificationController.js";

const router = Router();
router.use(protect);

router.get("/config", getNotificationConfig);
router.route("/").get(listNotifications).post(createNotification);
router.route("/:id").get(getNotificationById).put(updateNotification).delete(deleteNotification);
router.patch("/:id/status", updateNotificationStatus);
router.post("/:id/send-test", sendTestNotification);

export default router;
