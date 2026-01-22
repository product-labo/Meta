import { Router } from 'express';
import { 
    requestExport, 
    getExportStatus, 
    downloadExport, 
    getExportHistory, 
    deleteExport, 
    getExportTemplates, 
    scheduleExport, 
    getExportFormats 
} from '../controllers/exportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All export operations require authentication
router.use(authenticateToken);

// =============================================================================
// B3: DATA EXPORT SYSTEM (8 endpoints)
// =============================================================================

router.post('/request', requestExport);
router.get('/:id/status', getExportStatus);
router.get('/:id/download', downloadExport);
router.get('/history', getExportHistory);
router.delete('/:id', deleteExport);
router.get('/templates', getExportTemplates);
router.post('/schedule', scheduleExport);
router.get('/formats', getExportFormats);

export default router;