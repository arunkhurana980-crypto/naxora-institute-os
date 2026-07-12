import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  checkBatchAccess,
  createEnrollment,
  createOnlineBatch,
  deleteOnlineBatch,
  getEnrollments,
  getOnlineBatchById,
  getOnlineBatches,
  getPublicOnlineBatches,
  onlineBatchStatus,
  updateEnrollmentStatus,
  updateOnlineBatch,
  updateOnlineBatchStatus,
} from "../controllers/onlineBatchController.js";

const router = Router();

router.get("/status", onlineBatchStatus);
router.get("/public", getPublicOnlineBatches);

router.use(protect);
router.route("/").get(getOnlineBatches).post(createOnlineBatch);
router.route("/:id").get(getOnlineBatchById).put(updateOnlineBatch).delete(deleteOnlineBatch);
router.patch("/:id/status", updateOnlineBatchStatus);
router.get("/:id/enrollments", getEnrollments);
router.post("/:id/enroll", createEnrollment);
router.patch("/:id/enrollments/:enrollmentId/status", updateEnrollmentStatus);
router.post("/:id/check-access", checkBatchAccess);

export default router;
