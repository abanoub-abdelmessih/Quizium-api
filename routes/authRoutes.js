import express from 'express';
import { register, login, forgotPassword, resetPassword, setNewPassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/set-new-password', setNewPassword);

export default router;

