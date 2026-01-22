import { Router, type Router as ExpressRouter } from 'express';
import { signup, verifyOTP, login, socialLogin } from '../controllers/authController.js';

const router: ExpressRouter = Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/social-login', socialLogin);

export default router;
