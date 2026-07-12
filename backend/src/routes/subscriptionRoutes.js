import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createSubscription,
  deleteSubscription,
  getPlanCatalog,
  getSubscriptionById,
  getSubscriptions,
  updateSubscription,
  updateSubscriptionAddon,
  updateSubscriptionStatus,
} from "../controllers/subscriptionController.js";

const router = Router();

router.use(protect);

router.get("/plans", getPlanCatalog);
router.route("/").get(getSubscriptions).post(createSubscription);
router.route("/:id").get(getSubscriptionById).put(updateSubscription).delete(deleteSubscription);
router.patch("/:id/status", updateSubscriptionStatus);
router.patch("/:id/addon", updateSubscriptionAddon);

export default router;
