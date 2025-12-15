import { Router } from 'express';
import { 
    getTransactions,
    getEvents,
    getProjectAnalytics,
    syncProject,
    getDashboard,
    getSyncStatus
} from '../../controllers/cleanUserDataController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateUUID, validatePagination } from '../../middleware/validation.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// User data endpoints
router.get('/transactions', validatePagination, getTransactions);
router.get('/events', validatePagination, getEvents);
router.get('/dashboard', getDashboard);
router.get('/sync-status', getSyncStatus);

// Project-specific endpoints
router.get('/projects/:projectId/analytics', validateUUID('projectId'), getProjectAnalytics);
router.post('/projects/:projectId/sync', validateUUID('projectId'), syncProject);

export default router;
