import { Router } from "express";
import {
  createDemoRequest,
  getDemoRequests,
  getPlans,
  landingStatus,
} from "../controllers/landingController.js";

const router = Router();

router.get("/status", landingStatus);
router.get("/plans", getPlans);
router.get("/demo-requests", getDemoRequests);
router.post("/demo-request", createDemoRequest);

export default router;
