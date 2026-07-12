import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createFee,
  deleteFee,
  getFeeById,
  getFees,
  updateFee,
} from "../controllers/feeController.js";

const router = Router();

router.use(protect);

router.route("/")
  .get(getFees)
  .post(createFee);

router.route("/:id")
  .get(getFeeById)
  .put(updateFee)
  .delete(deleteFee);

export default router;
