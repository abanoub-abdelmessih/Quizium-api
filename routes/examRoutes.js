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

// Middleware to optionally authenticate (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const jwt = (await import('jsonwebtoken')).default;
      const User = (await import('../models/User.js')).default;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail - user remains unauthenticated
  }
  next();
};

// Main route - requires authentication
router.get("/", authenticate, getExams);
router.get("/:id", getExam);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.post("/", createExam);
router.put("/:id", updateExam);
router.delete("/:id", deleteExam);
router.delete("/admin/delete-all", deleteAllExams);

export default router;
