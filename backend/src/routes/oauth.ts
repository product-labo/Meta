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

// Provider management endpoints (auth required)
router.get('/auth/providers', getAuthProviders);
router.post('/auth/social-login', socialLogin);
router.post('/auth/link-provider', authenticateToken, linkProvider);
router.delete('/auth/unlink-provider/:provider', authenticateToken, unlinkProvider);

export default router;