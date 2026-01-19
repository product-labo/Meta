import { Router } from 'express';
import { 
    getSystemHealth,
    getSystemMetrics,
    getSystemLogs,
    getSystemPerformance,
    getSystemAlerts
} from '../controllers/systemMonitoringController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// System monitoring requires authentication (admin level in production)
router.use(authenticateToken);

// =============================================================================
// C4: SYSTEM MONITORING ROUTES (5 endpoints)
// =============================================================================

router.get('/health', getSystemHealth);
router.get('/metrics', getSystemMetrics);
router.get('/logs', getSystemLogs);
router.get('/performance', getSystemPerformance);
router.get('/alerts', getSystemAlerts);

export default router;