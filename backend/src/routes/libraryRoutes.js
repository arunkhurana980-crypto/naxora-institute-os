import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createLibraryItem,
  deleteLibraryItem,
  getLibraryItemById,
  getLibraryItems,
  issueLibraryItem,
  updateIssueRecord,
  updateLibraryItem,
  updateLibraryItemStatus,
} from "../controllers/libraryController.js";

const router = Router();
router.use(protect);

router.route("/").get(getLibraryItems).post(createLibraryItem);
router.patch("/:id/status", updateLibraryItemStatus);
router.post("/:id/issue", issueLibraryItem);
router.patch("/:id/issue/:recordId", updateIssueRecord);
router.route("/:id").get(getLibraryItemById).put(updateLibraryItem).delete(deleteLibraryItem);

export default router;
