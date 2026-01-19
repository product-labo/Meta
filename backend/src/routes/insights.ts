import { Router } from 'express';
import { 
    getRetentionPatterns,
    getOnboardingAnalysis,
    getFeatureSynergy,
    getRecommendations,
    getBenchmarks,
    getPredictions
} from '../controllers/advancedInsightsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All insights operations require authentication
router.use(authenticateToken);

// =============================================================================
// C3: ADVANCED INSIGHTS ROUTES (6 endpoints)
// =============================================================================

// Project-specific insights (3 endpoints)
router.get('/projects/:projectId/retention-patterns', getRetentionPatterns);
router.get('/projects/:projectId/onboarding-analysis', getOnboardingAnalysis);
router.get('/projects/:projectId/feature-synergy', getFeatureSynergy);

// Global insights (3 endpoints)
router.get('/recommendations', getRecommendations);
router.get('/benchmarks', getBenchmarks);
router.get('/predictions', getPredictions);

export default router;