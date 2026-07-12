import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAiMockTest,
  deleteAiMockTest,
  generateAiMockTest,
  getAiMockTestById,
  getAiMockTests,
  registerAiMockAttempt,
  toggleAiMockTestPin,
  updateAiMockTest,
  updateAiMockTestStatus,
} from "../controllers/aiMockTestController.js";

const router = Router();
router.use(protect);

router.route("/").get(getAiMockTests).post(createAiMockTest);
router.post("/generate", generateAiMockTest);
router.route("/:id").get(getAiMockTestById).put(updateAiMockTest).delete(deleteAiMockTest);
router.patch("/:id/status", updateAiMockTestStatus);
router.patch("/:id/pin", toggleAiMockTestPin);
router.patch("/:id/attempt", registerAiMockAttempt);

export default router;
