import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createPayment,
  createPaymentOrder,
  deletePayment,
  getPaymentById,
  getPaymentPlans,
  getPayments,
  getReceipt,
  updatePayment,
  updatePaymentStatus,
  verifyPayment,
  webhookReceiver,
} from "../controllers/paymentController.js";

const router = Router();

// Webhook placeholder. Real production me raw body + signature validation add karna.
router.post("/webhook", webhookReceiver);

router.use(protect);

router.get("/config", getPaymentPlans);
router.route("/").get(getPayments).post(createPayment);
router.post("/:id/order", createPaymentOrder);
router.post("/:id/verify", verifyPayment);
router.get("/:id/receipt", getReceipt);
router.patch("/:id/status", updatePaymentStatus);
router.route("/:id").get(getPaymentById).put(updatePayment).delete(deletePayment);

export default router;
