import { Router } from 'express';
import { 
    setUserRole,
    setCompanyDetails,
    connectWallet,
    getOnboardingStatus,
    completeOnboarding,
    getOnboardingRequirements
} from '../controllers/onboardingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All onboarding operations require authentication
router.use(authenticateToken);

// =============================================================================
// C2: ONBOARDING FLOW ROUTES (6 endpoints)
// =============================================================================

router.post('/role', setUserRole);
router.post('/company', setCompanyDetails);
router.post('/wallet', connectWallet);
router.get('/status', getOnboardingStatus);
router.put('/complete', completeOnboarding);
router.get('/requirements', getOnboardingRequirements);

export default router;