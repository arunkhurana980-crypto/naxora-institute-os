import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTest,
  deleteTest,
  getTestById,
  getTests,
  updateTest,
  updateTestStatus,
} from "../controllers/testController.js";

const router = Router();

router.use(protect);

router.route("/").get(getTests).post(createTest);
router.patch("/:id/status", updateTestStatus);
router.route("/:id").get(getTestById).put(updateTest).delete(deleteTest);

export default router;
