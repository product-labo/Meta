import { Router, type Router as ExpressRouter } from 'express';
import { getProjects, getProjectById, getProjectAnalytics, compareProjects, getNewProjects, getRankings, createProject, getUserProjects, updateProject, deleteProject } from '../controllers/projectController.js';
import { createWallet, getWallets, getWallet, updateWallet, deleteWallet, getWalletsByType, getActiveWallets, refreshWallet, getIndexingStatus, getProjectAggregateStats, refreshAllWallets } from '../controllers/walletController.js';
import { getStartupOverview, getTransactionalInsights, getProductivityScore, getInsightCentre, getWalletIntelligence, getCompetitorBenchmarks, getBridgeAnalytics, getActivityAnalytics } from '../controllers/analyticsController.js';
import taskRoutes from './tasks.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateWalletAddress, validateProjectOwnership } from '../middleware/validation.js';
import { indexingRateLimit, intensiveRateLimit } from '../middleware/rateLimiting.js';

const router: ExpressRouter = Router();

router.post('/', authenticateToken, createProject);
router.get('/', getProjects);
router.get('/user', authenticateToken, getUserProjects);
router.get('/new', getNewProjects);
router.get('/rankings', getRankings);
router.get('/compare', compareProjects);
router.get('/:id', getProjectById);
router.put('/:id', authenticateToken, updateProject);
router.delete('/:id', authenticateToken, deleteProject);
router.get('/:id/analytics', getProjectAnalytics);

// Wallet Routes nested under projects
// All wallet operations require authentication and specific rate limiting
router.post('/:projectId/wallets', authenticateToken, indexingRateLimit, validateProjectOwnership, validateWalletAddress, createWallet);
router.get('/:projectId/wallets', authenticateToken, validateProjectOwnership, getWallets);
router.get('/:projectId/wallets/stats', authenticateToken, getProjectAggregateStats);
router.post('/:projectId/wallets/refresh-all', authenticateToken, indexingRateLimit, refreshAllWallets);
router.get('/:projectId/wallets/type', authenticateToken, getWalletsByType);
router.get('/:projectId/wallets/active', authenticateToken, getActiveWallets);
router.get('/:projectId/wallets/:walletId', authenticateToken, getWallet);
router.get('/:projectId/wallets/:walletId/indexing-status', authenticateToken, getIndexingStatus);
router.post('/:projectId/wallets/:walletId/refresh', authenticateToken, indexingRateLimit, refreshWallet);
router.put('/:projectId/wallets/:walletId', authenticateToken, updateWallet);
router.delete('/:projectId/wallets/:walletId', authenticateToken, deleteWallet);

// Task Routes
router.use('/:projectId/tasks', taskRoutes);

// Analytics Routes with intensive rate limiting for complex queries
router.get('/:projectId/analytics/overview', authenticateToken, intensiveRateLimit, getStartupOverview);
router.get('/:projectId/analytics/transactional', authenticateToken, intensiveRateLimit, getTransactionalInsights);
router.get('/:projectId/analytics/productivity', authenticateToken, intensiveRateLimit, getProductivityScore);
router.get('/:projectId/analytics/insights', authenticateToken, intensiveRateLimit, getInsightCentre);

// Wallet Intelligence Routes with intensive rate limiting
router.get('/:projectId/analytics/wallet-stats', authenticateToken, intensiveRateLimit, getWalletIntelligence);
router.get('/:projectId/analytics/competitors', authenticateToken, intensiveRateLimit, getCompetitorBenchmarks);
router.get('/:projectId/analytics/bridges', authenticateToken, intensiveRateLimit, getBridgeAnalytics);
router.get('/:projectId/analytics/activity', authenticateToken, intensiveRateLimit, getActivityAnalytics);

export default router;
