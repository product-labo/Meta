#!/usr/bin/env node

/**
 * Multi-Chain Smart Contract Analytics API Server
 * RESTful API with file-based storage and dynamic configuration
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import contractRoutes from './routes/contracts.js';
import analysisRoutes from './routes/analysis.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chat.js';
import onboardingRoutes from './routes/onboarding.js';
import subscriptionRoutes from './routes/subscription.js';
import faucetRoutes from './routes/faucet.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

// Import database
import { initializeDatabase } from './database/index.js';
// import { initializeChatStorage } from './database/chatStorage.js'; // Temporarily disabled

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize file-based storage
await initializeDatabase();
// await initializeChatStorage(); // Temporarily disabled

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// const analysisLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 100, // limit each IP to 100 analysis requests per hour (increased for testing)
//   message: {
//     error: 'Analysis rate limit exceeded. Please try again later.'
//   }
// });

// app.use(limiter); // Temporarily disabled for testing

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    storage: 'file-based'
  });
});

// API Documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Multi-Chain Smart Contract Analytics API',
    version: '1.0.0',
    description: 'Comprehensive blockchain analytics platform with multi-chain support',
    documentation: '/api-docs',
    storage: 'file-based',
    endpoints: {
      auth: '/api/auth',
      contracts: '/api/contracts',
      analysis: '/api/analysis',
      users: '/api/users',
      chat: '/api/chat',
      onboarding: '/api/onboarding',
      subscription: '/api/subscription',
      faucet: '/api/faucet'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);

// Public chat routes (no authentication required)
app.get('/api/chat/suggested-questions', async (req, res) => {
  try {
    console.log('Public suggested questions endpoint hit:', req.query);
    
    const { contractAddress, contractChain } = req.query;

    if (!contractAddress || !contractChain) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'contractAddress and contractChain are required'
      });
    }

    // Import ChatAIService
    const { default: ChatAIService } = await import('../services/ChatAIService.js');

    // Get contract context (using anonymous user)
    const contractContext = await ChatAIService.getContractContext(
      'anonymous', 
      contractAddress, 
      contractChain
    );

    // Generate suggested questions
    const questions = await ChatAIService.generateSuggestedQuestions(contractContext);

    res.json({
      questions: questions,
      contractAddress,
      contractChain,
      total: questions.length,
      aiEnabled: ChatAIService.isEnabled()
    });

  } catch (error) {
    console.error('Suggested questions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggested questions',
      message: error.message
    });
  }
});

app.use('/api/contracts', authenticateToken, contractRoutes);
app.use('/api/analysis', authenticateToken, analysisRoutes); // analysisLimiter temporarily disabled for testing
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/onboarding', authenticateToken, onboardingRoutes);
app.use('/api/subscription', subscriptionRoutes); // Some routes require auth, some don't
app.use('/api/faucet', faucetRoutes); // Public faucet endpoints

// Serve OpenAPI documentation
app.use('/api-docs', express.static(join(__dirname, 'docs')));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Multi-Chain Analytics API Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`💾 Using file-based storage in ./data directory`);
});

export default app;