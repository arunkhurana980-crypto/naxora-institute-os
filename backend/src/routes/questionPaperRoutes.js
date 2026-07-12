import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createQuestionPaper,
  deleteQuestionPaper,
  duplicateQuestionPaper,
  getQuestionPaperById,
  getQuestionPapers,
  updateQuestionPaper,
  updateQuestionPaperStatus,
} from "../controllers/questionPaperController.js";

const router = Router();

router.use(protect);
router.route("/").get(getQuestionPapers).post(createQuestionPaper);
router.route("/:id").get(getQuestionPaperById).put(updateQuestionPaper).delete(deleteQuestionPaper);
router.patch("/:id/status", updateQuestionPaperStatus);
router.post("/:id/duplicate", duplicateQuestionPaper);

export default router;
