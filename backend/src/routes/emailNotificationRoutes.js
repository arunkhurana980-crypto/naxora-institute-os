import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createEmailNotification,
  deleteEmailNotification,
  getEmailNotificationById,
  getEmailNotificationConfig,
  listEmailNotifications,
  sendTestEmailNotification,
  updateEmailNotification,
  updateEmailNotificationStatus,
} from "../controllers/emailNotificationController.js";

const router = Router();
router.use(protect);

router.get("/config", getEmailNotificationConfig);
router.route("/").get(listEmailNotifications).post(createEmailNotification);
router.route("/:id").get(getEmailNotificationById).put(updateEmailNotification).delete(deleteEmailNotification);
router.patch("/:id/status", updateEmailNotificationStatus);
router.post("/:id/send-test", sendTestEmailNotification);

export default router;
