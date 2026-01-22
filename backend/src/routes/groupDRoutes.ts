import express from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { AdvancedAnalyticsController } from '../controllers/advancedAnalyticsController';
import { ApiManagementController } from '../controllers/apiManagementController';
import { CollaborationController } from '../controllers/collaborationController';

export function createGroupDRoutes(db: Pool): express.Router {
  const router = express.Router();
  
  // Initialize controllers
  const advancedAnalyticsController = new AdvancedAnalyticsController(db);
  const apiManagementController = new ApiManagementController(db);
  const collaborationController = new CollaborationController(db);

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  // ===== D1: ADVANCED ANALYTICS ROUTES (10 endpoints) =====
  
  // GET /api/analytics/cross-project
  router.get('/analytics/cross-project', (req, res) => 
    advancedAnalyticsController.getCrossProjectAnalytics(req, res)
  );

  // GET /api/analytics/market-analysis
  router.get('/analytics/market-analysis', (req, res) => 
    advancedAnalyticsController.getMarketAnalysis(req, res)
  );

  // GET /api/analytics/competitor-analysis
  router.get('/analytics/competitor-analysis', (req, res) => 
    advancedAnalyticsController.getCompetitorAnalysis(req, res)
  );

  // GET /api/analytics/trend-prediction
  router.get('/analytics/trend-prediction', (req, res) => 
    advancedAnalyticsController.getTrendPrediction(req, res)
  );

  // GET /api/analytics/anomaly-detection
  router.get('/analytics/anomaly-detection', (req, res) => 
    advancedAnalyticsController.getAnomalyDetection(req, res)
  );

  // GET /api/analytics/correlation-analysis
  router.get('/analytics/correlation-analysis', (req, res) => 
    advancedAnalyticsController.getCorrelationAnalysis(req, res)
  );

  // GET /api/analytics/segment-analysis
  router.get('/analytics/segment-analysis', (req, res) => 
    advancedAnalyticsController.getSegmentAnalysis(req, res)
  );

  // GET /api/analytics/attribution-analysis
  router.get('/analytics/attribution-analysis', (req, res) => 
    advancedAnalyticsController.getAttributionAnalysis(req, res)
  );

  // GET /api/analytics/lifetime-cohorts
  router.get('/analytics/lifetime-cohorts', (req, res) => 
    advancedAnalyticsController.getLifetimeCohorts(req, res)
  );

  // GET /api/analytics/revenue-forecasting
  router.get('/analytics/revenue-forecasting', (req, res) => 
    advancedAnalyticsController.getRevenueForecasting(req, res)
  );

  // ===== D2: API MANAGEMENT ROUTES (8 endpoints) =====
  
  // GET /api/keys
  router.get('/keys', (req, res) => 
    apiManagementController.getApiKeys(req, res)
  );

  // POST /api/keys
  router.post('/keys', (req, res) => 
    apiManagementController.createApiKey(req, res)
  );

  // DELETE /api/keys/:id
  router.delete('/keys/:id', (req, res) => 
    apiManagementController.deleteApiKey(req, res)
  );

  // PUT /api/keys/:id/status
  router.put('/keys/:id/status', (req, res) => 
    apiManagementController.updateApiKeyStatus(req, res)
  );

  // GET /api/keys/:id/usage
  router.get('/keys/:id/usage', (req, res) => 
    apiManagementController.getApiKeyUsage(req, res)
  );

  // GET /api/keys/limits
  router.get('/keys/limits', (req, res) => 
    apiManagementController.getApiKeyLimits(req, res)
  );

  // POST /api/keys/regenerate
  router.post('/keys/regenerate', (req, res) => 
    apiManagementController.regenerateApiKey(req, res)
  );

  // GET /api/keys/analytics
  router.get('/keys/analytics', (req, res) => 
    apiManagementController.getApiKeysAnalytics(req, res)
  );

  // ===== D3: COLLABORATION ROUTES (7 endpoints) =====
  
  // GET /api/projects/:id/team
  router.get('/projects/:id/team', (req, res) => 
    collaborationController.getProjectTeam(req, res)
  );

  // POST /api/projects/:id/team/invite
  router.post('/projects/:id/team/invite', (req, res) => 
    collaborationController.inviteTeamMember(req, res)
  );

  // DELETE /api/projects/:id/team/:userId
  router.delete('/projects/:id/team/:userId', (req, res) => 
    collaborationController.removeTeamMember(req, res)
  );

  // PUT /api/projects/:id/team/:userId/role
  router.put('/projects/:id/team/:userId/role', (req, res) => 
    collaborationController.updateTeamMemberRole(req, res)
  );

  // GET /api/projects/:id/permissions
  router.get('/projects/:id/permissions', (req, res) => 
    collaborationController.getProjectPermissions(req, res)
  );

  // POST /api/projects/:id/share
  router.post('/projects/:id/share', (req, res) => 
    collaborationController.shareProject(req, res)
  );

  // GET /api/shared-projects
  router.get('/shared-projects', (req, res) => 
    collaborationController.getSharedProjects(req, res)
  );

  return router;
}