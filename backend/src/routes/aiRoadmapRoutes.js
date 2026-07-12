import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createRoadmap,
  deleteRoadmap,
  generateRoadmap,
  getRoadmapById,
  listRoadmaps,
  toggleRoadmapPin,
  updateRoadmap,
  updateRoadmapProgress,
  updateRoadmapStatus,
} from "../controllers/aiRoadmapController.js";

const router = Router();
router.use(protect);

router.route("/").get(listRoadmaps).post(createRoadmap);
router.post("/generate", generateRoadmap);
router.route("/:id").get(getRoadmapById).put(updateRoadmap).delete(deleteRoadmap);
router.patch("/:id/status", updateRoadmapStatus);
router.patch("/:id/pin", toggleRoadmapPin);
router.patch("/:id/progress", updateRoadmapProgress);

export default router;
