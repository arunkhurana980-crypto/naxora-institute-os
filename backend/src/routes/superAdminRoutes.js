import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addSuperAdminNote,
  deleteSuperAdminAction,
  getSuperAdminOverview,
  updateInstitutePlan,
  updateInstituteStatus,
} from "../controllers/superAdminController.js";

const router = Router();

router.use(protect);

router.get("/", getSuperAdminOverview);
router.post("/notes", addSuperAdminNote);
router.patch("/institutes/:id/status", updateInstituteStatus);
router.patch("/institutes/:id/plan", updateInstitutePlan);
router.delete("/actions/:id", deleteSuperAdminAction);

export default router;
