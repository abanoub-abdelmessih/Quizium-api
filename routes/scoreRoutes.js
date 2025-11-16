import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  submitExam,
  getExamResults,
  getUserScores
} from '../controllers/scoreController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/exam/:examId/submit', submitExam);
router.get('/exam/:examId/result', getExamResults);
router.get('/my-scores', getUserScores);

export default router;

