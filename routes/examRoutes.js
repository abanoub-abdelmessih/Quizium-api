import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.js';
import {
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  getAllExams
} from '../controllers/examController.js';

const router = express.Router();

// Public routes
router.get('/all', getAllExams);
router.get('/', getExams);
router.get('/:id', getExam);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

export default router;

