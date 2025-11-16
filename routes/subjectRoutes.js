import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { uploadSubjectFiles } from '../middleware/upload.js';
import {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject
} from '../controllers/subjectController.js';

const router = express.Router();

// Public routes
router.get('/', getSubjects);
router.get('/:id', getSubject);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.post('/', uploadSubjectFiles, createSubject);
router.put('/:id', uploadSubjectFiles, updateSubject);
router.delete('/:id', deleteSubject);

export default router;

