import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'express';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(json());

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import authRoutes from './routes/auth.js';
import oauthRoutes from './routes/oauth.js';
import onboardingRoutes from './routes/onboarding.js';
import insightsRoutes from './routes/insights.js';
import systemRoutes from './routes/system.js';
import profileRoutes from './routes/profile.js';
import projectRoutes from './routes/projects.js';
import watchlistRoutes from './routes/watchlist.js';
import alertRoutes from './routes/alerts.js';
import walletRoutes from './routes/wallets.js';
import custodyRoutes from './routes/custody.js';
import exportRoutes from './routes/exports.js';

import subscriptionRoutes from './routes/subscription.js';
import contractBusinessRoutes from './routes/contractBusiness.js';

// Auth routes usually stay at root or /auth
// API routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes); // Auth routes now at /api/auth
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/watchlist', watchlistRoutes);
apiRouter.use('/notifications', alertRoutes); // B1: Notification System
apiRouter.use('/exports', exportRoutes); // B3: Data Export System
apiRouter.use('/onboarding', onboardingRoutes); // C2: Onboarding Flow
apiRouter.use('/insights', insightsRoutes); // C3: Advanced Insights
apiRouter.use('/system', systemRoutes); // C4: System Monitoring
apiRouter.use('/wallets', walletRoutes);
apiRouter.use('/contract-business', contractBusinessRoutes);
apiRouter.use('/', walletRoutes); // CAUTION: This behaves as catch-all if mounted at root of apiRouter for otherwise unmatched routes.
apiRouter.use('/subscription', subscriptionRoutes);

// OAuth routes at root level (for callbacks)
app.use('/auth', oauthRoutes); // C1: OAuth Integration

app.use('/custody', custodyRoutes);
app.use('/api', apiRouter);

export default app;
