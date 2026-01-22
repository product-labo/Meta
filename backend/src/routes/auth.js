import { Router } from 'express';
import { signup, verifyOTP, login, socialLogin } from '../controllers/authController.js';

const router = Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/social-login', socialLogin);

export default router;