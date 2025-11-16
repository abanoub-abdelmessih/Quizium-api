import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { uploadPDF } from '../middleware/upload.js';
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

router.post('/', uploadPDF, createSubject);
router.put('/:id', uploadPDF, updateSubject);
router.delete('/:id', deleteSubject);

export default router;

