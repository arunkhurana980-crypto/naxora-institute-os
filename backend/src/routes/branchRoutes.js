import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createBranch,
  deleteBranch,
  getBranchById,
  getBranches,
  updateBranch,
  updateBranchStatus,
} from "../controllers/branchController.js";

const router = Router();

router.use(protect);

router.route("/").get(getBranches).post(createBranch);
router.route("/:id").get(getBranchById).put(updateBranch).delete(deleteBranch);
router.patch("/:id/status", updateBranchStatus);

export default router;
