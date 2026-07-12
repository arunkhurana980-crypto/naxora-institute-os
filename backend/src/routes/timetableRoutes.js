import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTimetableSlot,
  deleteTimetableSlot,
  getTimetableSlotById,
  getTimetableSlots,
  updateTimetableSlot,
  updateTimetableSlotStatus,
} from "../controllers/timetableController.js";

const router = Router();

router.use(protect);

router.route("/").get(getTimetableSlots).post(createTimetableSlot);
router.route("/:id").get(getTimetableSlotById).put(updateTimetableSlot).delete(deleteTimetableSlot);
router.patch("/:id/status", updateTimetableSlotStatus);

export default router;
