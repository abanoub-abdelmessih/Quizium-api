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
} from "../controllers/subjectController.js";
import {
  createTopic,
  getTopics,
  getTopic,
  updateTopic,
  deleteTopic,
} from "../controllers/topicController.js";

const router = express.Router();

// Public routes
router.get("/", getSubjects);
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

export default router;
