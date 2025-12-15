import { Router } from 'express';
import { 
    analyzeUserData,
    analyzeProject,
    getInsights,
    getQuickInsights
} from '../../controllers/cleanAIController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateUUID } from '../../middleware/validation.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// AI analysis endpoints
router.post('/analyze', analyzeUserData);
router.post('/projects/:projectId/analyze', validateUUID('projectId'), analyzeProject);
router.get('/insights', getInsights);
router.get('/quick-insights', getQuickInsights);

export default router;
