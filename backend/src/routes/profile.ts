import { Router } from 'express';
import { 
    getProfile, 
    updateProfile, 
    uploadAvatar, 
    changePassword, 
    getSettings, 
    updateSettings, 
    getProfileActivity, 
    updatePreferences,
    completeOnboarding 
} from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// =============================================================================
// B4: PROFILE MANAGEMENT (8 endpoints)
// =============================================================================

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/avatar', uploadAvatar);
router.put('/change-password', changePassword);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/activity', getProfileActivity);
router.put('/preferences', updatePreferences);

// Legacy endpoint
router.post('/onboarding', completeOnboarding);

export default router;
