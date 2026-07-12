import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTeacher,
  deleteTeacher,
  getTeacherById,
  getTeachers,
  updateTeacher,
} from "../controllers/teacherController.js";

const router = Router();

router.use(protect);
router.route("/").get(getTeachers).post(createTeacher);
router.route("/:id").get(getTeacherById).put(updateTeacher).delete(deleteTeacher);

export default router;
