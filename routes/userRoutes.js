import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadProfileImage as uploadMiddleware } from '../middleware/upload.js';
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  changePassword,
  deleteAccount
} from '../controllers/userController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/image', uploadMiddleware, uploadProfileImage);
router.put('/change-password', changePassword);
router.delete('/account', deleteAccount);

export default router;

