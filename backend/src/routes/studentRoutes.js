import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudents,
  updateStudent,
} from "../controllers/studentController.js";

const router = Router();

router.use(protect);
router.route("/").get(getStudents).post(createStudent);
router.route("/:id").get(getStudentById).put(updateStudent).delete(deleteStudent);

export default router;
