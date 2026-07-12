import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createBatch,
  deleteBatch,
  getBatchById,
  getBatches,
  updateBatch,
} from "../controllers/batchController.js";

const router = Router();

router.use(protect);
router.route("/").get(getBatches).post(createBatch);
router.route("/:id").get(getBatchById).put(updateBatch).delete(deleteBatch);

export default router;
