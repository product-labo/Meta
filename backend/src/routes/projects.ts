import { Router } from 'express';
import { getProjects, getProjectById, getProjectAnalytics, compareProjects, getNewProjects, getRankings, createProject } from '../controllers/projectController.js';
import { createWallet, getWallets, getWallet, updateWallet, deleteWallet, getWalletsByType, getActiveWallets } from '../controllers/walletController.js';
import { getStartupOverview, getTransactionalInsights, getProductivityScore, getInsightCentre, getWalletIntelligence, getCompetitorBenchmarks, getBridgeAnalytics, getActivityAnalytics } from '../controllers/analyticsController.js';
import taskRoutes from './tasks.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, createProject);
router.get('/', getProjects);
router.get('/new', getNewProjects);
router.get('/rankings', getRankings);
router.get('/compare', compareProjects);
router.get('/:id', getProjectById);
router.get('/:id/analytics', getProjectAnalytics);

// Wallet Routes nested under projects
// All wallet operations require authentication
router.post('/:projectId/wallets', authenticateToken, createWallet);
router.get('/:projectId/wallets', authenticateToken, getWallets);
router.get('/:projectId/wallets/type', authenticateToken, getWalletsByType);
router.get('/:projectId/wallets/active', authenticateToken, getActiveWallets);
router.get('/:projectId/wallets/:walletId', authenticateToken, getWallet);
router.put('/:projectId/wallets/:walletId', authenticateToken, updateWallet);
router.delete('/:projectId/wallets/:walletId', authenticateToken, deleteWallet);

// Task Routes
router.use('/:projectId/tasks', taskRoutes);

// Analytics Routes
router.get('/:projectId/analytics/overview', authenticateToken, getStartupOverview);
router.get('/:projectId/analytics/transactional', authenticateToken, getTransactionalInsights);
router.get('/:projectId/analytics/productivity', authenticateToken, getProductivityScore);
router.get('/:projectId/analytics/insights', authenticateToken, getInsightCentre);

// Wallet Intelligence Routes
router.get('/:projectId/analytics/wallet-stats', authenticateToken, getWalletIntelligence);
router.get('/:projectId/analytics/competitors', authenticateToken, getCompetitorBenchmarks);
router.get('/:projectId/analytics/bridges', authenticateToken, getBridgeAnalytics);
router.get('/:projectId/analytics/activity', authenticateToken, getActivityAnalytics);

export default router;
