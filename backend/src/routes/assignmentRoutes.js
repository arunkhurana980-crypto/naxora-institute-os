import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAssignment,
  deleteAssignment,
  getAssignmentById,
  getAssignments,
  updateAssignment,
  updateAssignmentStatus,
} from "../controllers/assignmentController.js";

const router = Router();

router.use(protect);

router.route("/").get(getAssignments).post(createAssignment);
router.patch("/:id/status", updateAssignmentStatus);
router.route("/:id").get(getAssignmentById).put(updateAssignment).delete(deleteAssignment);

export default router;
