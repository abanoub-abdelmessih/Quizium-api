import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.js';
import {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion
} from '../controllers/questionController.js';

const router = express.Router();

// Routes for getting questions (authenticated users can access, but correct answers hidden for non-admins)
router.get('/exam/:examId', authenticate, getQuestions);
router.get('/:id', authenticate, getQuestion);

// Admin routes (CRUD operations)
router.use(authenticate);
router.use(isAdmin);

router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;

