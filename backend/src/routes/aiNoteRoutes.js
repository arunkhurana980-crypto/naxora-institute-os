import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAiNote,
  deleteAiNote,
  generateAiNote,
  getAiNoteById,
  getAiNotes,
  toggleAiNotePin,
  updateAiNote,
  updateAiNoteStatus,
} from "../controllers/aiNoteController.js";

const router = Router();

router.use(protect);

router.route("/").get(getAiNotes).post(createAiNote);
router.post("/generate", generateAiNote);
router.route("/:id").get(getAiNoteById).put(updateAiNote).delete(deleteAiNote);
router.patch("/:id/status", updateAiNoteStatus);
router.patch("/:id/pin", toggleAiNotePin);

export default router;
