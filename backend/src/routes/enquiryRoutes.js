import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addFollowUp,
  createEnquiry,
  deleteEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  updateEnquiryStatus,
} from "../controllers/enquiryController.js";

const router = Router();

router.use(protect);

router.route("/").get(getEnquiries).post(createEnquiry);
router.route("/:id").get(getEnquiryById).put(updateEnquiry).delete(deleteEnquiry);
router.patch("/:id/status", updateEnquiryStatus);
router.post("/:id/follow-up", addFollowUp);

export default router;
