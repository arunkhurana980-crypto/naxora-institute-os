import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  markAnnouncementRead,
  updateAnnouncement,
  updateAnnouncementStatus,
} from "../controllers/announcementController.js";

const router = Router();

router.use(protect);

router.route("/").get(getAnnouncements).post(createAnnouncement);
router.patch("/:id/status", updateAnnouncementStatus);
router.patch("/:id/read", markAnnouncementRead);
router.route("/:id").get(getAnnouncementById).put(updateAnnouncement).delete(deleteAnnouncement);

export default router;
