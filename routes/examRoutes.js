import express from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import {
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  deleteAllExams,
} from "../controllers/examController.js";

const router = express.Router();

// Main route - requires authentication
router.get("/", authenticate, getExams);
router.get("/:id", getExam);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.post("/", createExam);
router.put("/:id", updateExam);
router.delete("/admin/delete-all", deleteAllExams);
router.delete("/:id", deleteExam);

export default router;
