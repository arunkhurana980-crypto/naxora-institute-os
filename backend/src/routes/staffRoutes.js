import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createStaff,
  deleteStaff,
  getStaffById,
  getStaffMembers,
  updateStaff,
  updateStaffStatus,
} from "../controllers/staffController.js";

const router = Router();

router.use(protect);
router.route("/").get(getStaffMembers).post(createStaff);
router.route("/:id").get(getStaffById).put(updateStaff).delete(deleteStaff);
router.patch("/:id/status", updateStaffStatus);

export default router;
