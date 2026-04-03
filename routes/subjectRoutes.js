import express from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { uploadSubjectImage, uploadTopicImage } from "../middleware/upload.js";
import {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  deleteAllSubjects,
  deleteAllTopicsInSubject,
} from "../controllers/subjectController.js";
import {
  createTopic,
  getTopics,
  getTopic,
  updateTopic,
  deleteTopic,
} from "../controllers/topicController.js";

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

// Public routes (with optional auth for filtering)
router.get("/", optionalAuth, getSubjects);
router.get("/:id", getSubject);
router.get("/:id/topics", getTopics);
router.get("/:id/topics/:topicId", getTopic);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.post("/", uploadSubjectImage, createSubject);
router.patch("/:id", uploadSubjectImage, updateSubject);
router.delete("/:id", deleteSubject);
router.delete("/admin/delete-all", deleteAllSubjects);

router.post("/:id/topics", uploadTopicImage, createTopic);
router.patch("/:id/topics/:topicId", uploadTopicImage, updateTopic);
router.delete("/:id/topics/:topicId", deleteTopic);
router.delete("/:id/topics", deleteAllTopicsInSubject);

export default router;
