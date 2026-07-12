import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createCertificate,
  deleteCertificate,
  getCertificateById,
  getCertificates,
  updateCertificate,
  updateCertificateStatus,
} from "../controllers/certificateController.js";

const router = Router();

router.use(protect);

router.route("/").get(getCertificates).post(createCertificate);
router.patch("/:id/status", updateCertificateStatus);
router.route("/:id").get(getCertificateById).put(updateCertificate).delete(deleteCertificate);

export default router;
