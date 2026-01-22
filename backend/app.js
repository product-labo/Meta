import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './src/routes/auth.ts';
import projectRoutes from './src/routes/projects.ts';
import walletRoutes from './src/routes/wallets.ts';
import analyticsRoutes from './src/routes/analytics.js';
import liskAnalyticsRoutes from './src/routes/liskAnalytics.js';
import adminRoutes from './src/routes/admin.js';
import walletTrackingRoutes from './src/routes/walletTracking.js';
import universalIndexerRoutes from './src/routes/universalIndexer.js';
import userDataRoutes from './src/routes/userData.js';
import aiInsightsRoutes from './src/routes/aiInsights.js';
import v1Routes from './src/routes/v1/index.js';
import contractBusinessRoutes from './src/routes/contractBusiness.js';
import { errorHandlerMiddleware } from './src/middleware/errorHandler.js';
import { 
  generalRateLimit, 
  authRateLimit, 
  walletRateLimit, 
  readRateLimit, 
  intensiveRateLimit,
  indexingRateLimit,
  websocketRateLimit,
  rateLimitHeaders,
  bypassRateLimit
} from './src/middleware/rateLimiting.js';
import { startWalletTracking } from './src/services/walletTrackingService.js';
import { secureDataSyncService } from './src/services/secureDataSyncService.js';
import liskService from './src/services/liskService.js';
import pool from './src/db/db.js';
import indexerWebSocketService from './src/services/indexerWebSocket.js';
import { indexingService } from './src/services/indexingService.js';

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting and security middleware
app.use(rateLimitHeaders);
app.use(bypassRateLimit);
app.use(generalRateLimit);

app.use(bodyParser.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'ok',
      message: 'Server is running',
      services: {
        database: 'connected',
        lisk_network: 'unknown'
      }
    };

    // Check Lisk network connectivity
    try {
      if (liskService.isInitialized) {
        const networkStatus = await liskService.getNetworkStatus();
        healthStatus.services.lisk_network = 'connected';
        healthStatus.services.lisk_height = networkStatus.height;
        healthStatus.services.lisk_network_id = networkStatus.networkIdentifier;
      } else {
        healthStatus.services.lisk_network = 'not_initialized';
      }
    } catch (error) {
      healthStatus.services.lisk_network = 'disconnected';
      healthStatus.services.lisk_error = error.message;
    }

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Make pool available to routes
app.locals.pool = pool;

// Routes with specific rate limiting
app.use('/auth', authRateLimit, authRoutes);
app.use('/api/projects', walletRateLimit, projectRoutes);
app.use('/api/wallets', walletRateLimit, walletRoutes);
app.use('/api', readRateLimit, analyticsRoutes);
app.use('/api/lisk', readRateLimit, liskAnalyticsRoutes); // New Lisk analytics routes
app.use('/api/admin', intensiveRateLimit, adminRoutes);
app.use('/api/wallet-tracking', walletRateLimit, walletTrackingRoutes);
app.use('/api/indexer', indexingRateLimit, universalIndexerRoutes); // Universal Smart Contract Indexer routes
app.use('/api/user-data', readRateLimit, userDataRoutes); // User-specific indexed data CRUD
app.use('/api/ai-insights', intensiveRateLimit, aiInsightsRoutes); // AI insights for user data

// V1 API - Clean, robust, secure
app.use('/api/v1', readRateLimit, v1Routes);

// Business Intelligence API (Multi-Chain Indexer)
app.use('/api/contract-business', readRateLimit, contractBusinessRoutes);

// Error handling middleware (must be last)
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize Lisk service
  try {
    await liskService.initialize();
    console.log('✅ Lisk service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Lisk service:', error.message);
    console.log('⚠️ Server will continue without Lisk connectivity');
  }

  // Initialize WebSocket server for Universal Indexer
  try {
    indexerWebSocketService.initialize(server);
    console.log('✅ Universal Indexer WebSocket service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket service:', error.message);
  }

  // Initialize indexing service
  try {
    console.log('✅ Indexing service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize indexing service:', error.message);
  }

  // Start wallet tracking service
  // Sync every 5 minutes (300000ms) - adjust as needed
  const syncInterval = parseInt(process.env.WALLET_SYNC_INTERVAL_MS || '300000');
  console.log(`Starting wallet tracking service (sync interval: ${syncInterval}ms)`);

  startWalletTracking(syncInterval)
    .then(() => console.log('Wallet tracking service started'))
    .catch(err => console.error('Failed to start wallet tracking service:', err.message));

  // Start secure daily data sync service
  secureDataSyncService.startDailySync();
  console.log('✅ Secure daily data sync service started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  indexerWebSocketService.shutdown();
  server.close(() => {
    console.log('HTTP server closed');
    pool.end();
  });
});

// Export server for WebSocket integration
export { server };
