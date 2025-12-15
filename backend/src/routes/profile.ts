import { Router } from 'express';
import { getProfile, completeOnboarding } from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getProfile);
router.post('/onboarding', completeOnboarding);

export default router;
