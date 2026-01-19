import { Router } from 'express';
import { 
    getProjects, 
    getProjectById, 
    getProjectAnalytics, 
    compareProjects, 
    getNewProjects, 
    getRankings, 
    createProject,
    // B5: Enhanced Project Management
    getProjectsAdvancedFilter,
    getProjectsMultiSort,
    bookmarkProject,
    getBookmarkedProjects,
    getProjectHealthStatus,
    getMonitoringDashboard
} from '../controllers/projectController.js';
import { createWallet, getWallets, getWallet, updateWallet, deleteWallet, getWalletsByType, getActiveWallets } from '../controllers/walletController.js';
import { 
    // A1: Startup Overview Analytics
    getStartupOverview, getRetentionChart, getTransactionSuccessRate, getFeeAnalysis, 
    getTamSamSom, getFeatureUsage, getCountryStats, getFlowAnalysis,
    
    // A2: Transaction Analytics  
    getTransactionVolume, getGasAnalysis, getFailedTransactions, getTopRevenueWallets, getGasTrends,
    
    // A3: User Behavior Analytics
    getUserRetention, getUserChurn, getUserFunnel, getUserCohorts, getUserLifetimeValue,
    
    // A4: Wallet Intelligence
    getWalletMetrics, getWalletComparison, getWalletActivity, getWalletBridges, getWalletInsights,
    
    // A5: Productivity Scoring
    getProductivityScore, getProductivityPillars, getProductivityTrends, 
    getProductivityTasks, createProductivityTask, updateTaskStatus,
    
    // Legacy functions (for backward compatibility)
    getTransactionalInsights, getWalletIntelligence, getInsightCentre,
    getCompetitorBenchmarks, getBridgeAnalytics, getActivityAnalytics
} from '../controllers/analyticsController.js';
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

// =============================================================================
// B5: ENHANCED PROJECT MANAGEMENT (6 endpoints)
// =============================================================================

router.get('/filter', getProjectsAdvancedFilter);
router.get('/sort', getProjectsMultiSort);
router.post('/:id/bookmark', authenticateToken, bookmarkProject);
router.get('/bookmarks', authenticateToken, getBookmarkedProjects);
router.get('/:id/health-status', getProjectHealthStatus);
router.get('/monitoring/dashboard', authenticateToken, getMonitoringDashboard);

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

// =============================================================================
// GROUP A: CORE ANALYTICS ROUTES (35 endpoints)
// =============================================================================

// A1: Startup Overview Analytics (8 endpoints)
router.get('/:projectId/analytics/overview', authenticateToken, getStartupOverview);
router.get('/:projectId/analytics/retention-chart', authenticateToken, getRetentionChart);
router.get('/:projectId/analytics/transaction-success-rate', authenticateToken, getTransactionSuccessRate);
router.get('/:projectId/analytics/fee-analysis', authenticateToken, getFeeAnalysis);
router.get('/:projectId/analytics/tam-sam-som', authenticateToken, getTamSamSom);
router.get('/:projectId/analytics/feature-usage', authenticateToken, getFeatureUsage);
router.get('/:projectId/analytics/country-stats', authenticateToken, getCountryStats);
router.get('/:projectId/analytics/flow-analysis', authenticateToken, getFlowAnalysis);

// A2: Transaction Analytics (7 endpoints)
router.get('/:projectId/analytics/transaction-volume', authenticateToken, getTransactionVolume);
router.get('/:projectId/analytics/gas-analysis', authenticateToken, getGasAnalysis);
router.get('/:projectId/analytics/failed-transactions', authenticateToken, getFailedTransactions);
router.get('/:projectId/analytics/top-revenue-wallets', authenticateToken, getTopRevenueWallets);
router.get('/:projectId/analytics/gas-trends', authenticateToken, getGasTrends);

// A3: User Behavior Analytics (8 endpoints)
router.get('/:projectId/users/retention', authenticateToken, getUserRetention);
router.get('/:projectId/users/churn', authenticateToken, getUserChurn);
router.get('/:projectId/users/funnel', authenticateToken, getUserFunnel);
router.get('/:projectId/users/cohorts', authenticateToken, getUserCohorts);
router.get('/:projectId/users/lifetime-value', authenticateToken, getUserLifetimeValue);
router.get('/:projectId/analytics/cohorts', authenticateToken, getUserCohorts); // Alias
router.get('/:projectId/analytics/conversion-funnel', authenticateToken, getUserFunnel); // Alias
router.get('/:projectId/analytics/feature-adoption', authenticateToken, getFeatureUsage); // Alias

// A4: Wallet Intelligence (6 endpoints)
router.get('/:projectId/wallets/metrics', authenticateToken, getWalletMetrics);
router.get('/:projectId/wallets/comparison', authenticateToken, getWalletComparison);
router.get('/:projectId/wallets/activity', authenticateToken, getWalletActivity);
router.get('/:projectId/wallets/bridges', authenticateToken, getWalletBridges);
router.get('/:projectId/wallets/insights', authenticateToken, getWalletInsights);

// A5: Productivity Scoring (6 endpoints)
router.get('/:projectId/productivity/score', authenticateToken, getProductivityScore);
router.get('/:projectId/productivity/pillars', authenticateToken, getProductivityPillars);
router.get('/:projectId/productivity/trends', authenticateToken, getProductivityTrends);
router.get('/:projectId/productivity/tasks', authenticateToken, getProductivityTasks);
router.post('/:projectId/productivity/tasks', authenticateToken, createProductivityTask);
router.put('/tasks/:taskId/status', authenticateToken, updateTaskStatus);

// =============================================================================
// LEGACY ROUTES (for backward compatibility)
// =============================================================================
router.get('/:projectId/analytics/transactional', authenticateToken, getTransactionalInsights);
router.get('/:projectId/analytics/productivity', authenticateToken, getProductivityScore);
router.get('/:projectId/analytics/insights', authenticateToken, getInsightCentre);
router.get('/:projectId/analytics/wallet-stats', authenticateToken, getWalletIntelligence);
router.get('/:projectId/analytics/competitors', authenticateToken, getCompetitorBenchmarks);
router.get('/:projectId/analytics/bridges', authenticateToken, getBridgeAnalytics);
router.get('/:projectId/analytics/activity', authenticateToken, getActivityAnalytics);

export default router;
