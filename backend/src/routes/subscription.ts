import { Router } from 'express';
import { subscribe, getSubscriptionStatus, cancelSubscription, upgradeSubscription } from '../controllers/subscriptionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/subscribe', subscribe);
router.get('/status', getSubscriptionStatus);
router.post('/cancel', cancelSubscription);
router.put('/upgrade', upgradeSubscription);

export default router;
