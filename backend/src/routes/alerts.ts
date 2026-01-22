import { Router } from 'express';
import { 
    getAlerts, 
    createAlert, 
    updateAlertStatus, 
    getUnreadCount, 
    getNotificationHistory, 
    markAsRead, 
    deleteAlert, 
    getNotificationSettings 
} from '../controllers/alertController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// =============================================================================
// B1: NOTIFICATION SYSTEM (8 endpoints)
// =============================================================================

router.get('/alerts', getAlerts);
router.post('/alerts', createAlert);
router.put('/:id/status', updateAlertStatus);
router.get('/unread-count', getUnreadCount);
router.get('/history', getNotificationHistory);
router.post('/mark-read', markAsRead);
router.delete('/:id', deleteAlert);
router.get('/settings', getNotificationSettings);

export default router;
