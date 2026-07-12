import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createFinanceRecord,
  deleteFinanceRecord,
  getFinanceRecordById,
  getFinanceRecords,
  updateFinanceRecord,
  updateFinanceStatus,
} from "../controllers/financeController.js";

const router = Router();
router.use(protect);

router.route("/").get(getFinanceRecords).post(createFinanceRecord);
router.patch("/:id/status", updateFinanceStatus);
router.route("/:id").get(getFinanceRecordById).put(updateFinanceRecord).delete(deleteFinanceRecord);

export default router;
