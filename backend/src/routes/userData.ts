import { Router } from 'express';
import { 
    getUserTransactions, 
    getUserEvents, 
    getProjectAnalytics, 
    syncProjectData,
    getDashboardSummary,
    getSyncStatus
} from '../controllers/userDataController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// User data endpoints
router.get('/transactions', getUserTransactions);
router.get('/events', getUserEvents);
router.get('/dashboard', getDashboardSummary);

// Project-specific endpoints
router.get('/projects/:projectId/analytics', getProjectAnalytics);
router.post('/projects/:projectId/sync', syncProjectData);
router.get('/sync-status', getSyncStatus);

export default router;
