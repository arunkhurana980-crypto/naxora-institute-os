import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createListing,
  createPublicLead,
  deleteListing,
  getMyLeads,
  getMyListings,
  getPublicListings,
  updateLeadStatus,
  updateListing,
} from "../controllers/discoveryController.js";

const router = Router();

// Public student discovery routes: students can search without login.
router.get("/search", getPublicListings);
router.post("/leads", createPublicLead);

// Institute owner protected routes.
router.use(protect);
router.get("/my-listings", getMyListings);
router.post("/my-listings", createListing);
router.put("/my-listings/:id", updateListing);
router.delete("/my-listings/:id", deleteListing);
router.get("/my-leads", getMyLeads);
router.patch("/my-leads/:id/status", updateLeadStatus);

export default router;
