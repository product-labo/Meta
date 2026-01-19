import { Router } from 'express';
import { 
    initiateGoogleOAuth,
    handleGoogleCallback,
    initiateGitHubOAuth,
    handleGitHubCallback,
    socialLogin,
    getAuthProviders,
    linkProvider,
    unlinkProvider
} from '../controllers/oauthController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// C1: OAUTH INTEGRATION ROUTES (8 endpoints)
// =============================================================================

// OAuth initiation endpoints (no auth required)
router.get('/oauth/google', initiateGoogleOAuth);
router.get('/oauth/google/callback', handleGoogleCallback);
router.get('/oauth/github', initiateGitHubOAuth);
router.get('/oauth/github/callback', handleGitHubCallback);

// Social login endpoint (no auth required)
router.post('/social-login', socialLogin);

// Provider management endpoints (auth required)
router.get('/providers', getAuthProviders);
router.post('/link-provider', authenticateToken, linkProvider);
router.delete('/unlink-provider/:provider', authenticateToken, unlinkProvider);

export default router;