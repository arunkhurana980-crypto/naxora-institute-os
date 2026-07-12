import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createQuestionBankItem,
  deleteQuestionBankItem,
  getQuestionBankItemById,
  getQuestionBankItems,
  markQuestionUsed,
  updateQuestionBankItem,
  updateQuestionBankItemStatus,
} from "../controllers/questionBankController.js";

const router = Router();

router.use(protect);

router.route("/").get(getQuestionBankItems).post(createQuestionBankItem);
router.route("/:id").get(getQuestionBankItemById).put(updateQuestionBankItem).delete(deleteQuestionBankItem);
router.patch("/:id/status", updateQuestionBankItemStatus);
router.patch("/:id/used", markQuestionUsed);

export default router;
