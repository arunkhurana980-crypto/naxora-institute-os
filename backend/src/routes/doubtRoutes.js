import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  askDoubt,
  deleteDoubt,
  getDoubtById,
  getDoubts,
  replyDoubt,
  updateDoubt,
} from "../controllers/doubtController.js";

const router = Router();

router.use(protect);

router.route("/").get(getDoubts);
router.post("/ask", askDoubt);
router.patch("/:id/reply", replyDoubt);
router.route("/:id").get(getDoubtById).put(updateDoubt).delete(deleteDoubt);

export default router;
