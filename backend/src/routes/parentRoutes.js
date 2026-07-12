import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createParent,
  deleteParent,
  getParentById,
  getParents,
  updateParent,
  updateParentStatus,
} from "../controllers/parentController.js";

const router = Router();

router.use(protect);
router.route("/").get(getParents).post(createParent);
router.route("/:id").get(getParentById).put(updateParent).delete(deleteParent);
router.patch("/:id/status", updateParentStatus);

export default router;
