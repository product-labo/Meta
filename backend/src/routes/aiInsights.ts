import { Router } from 'express';
import { 
    getUserAIInsights,
    getProjectAIInsights,
    getInsightsHistory,
    getQuickInsights
} from '../controllers/aiInsightsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// User AI insights endpoints
router.post('/analyze', getUserAIInsights);
router.post('/projects/:projectId/analyze', getProjectAIInsights);
router.get('/history', getInsightsHistory);
router.get('/quick', getQuickInsights);

export default router;
