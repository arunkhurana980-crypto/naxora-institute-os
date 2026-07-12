import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAttendance,
  deleteAttendance,
  getAttendanceById,
  getAttendanceSessions,
  updateAttendance,
} from "../controllers/attendanceController.js";

const router = Router();

router.use(protect);
router.route("/").get(getAttendanceSessions).post(createAttendance);
router.route("/:id").get(getAttendanceById).put(updateAttendance).delete(deleteAttendance);

export default router;
