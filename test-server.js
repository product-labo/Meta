#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './src/api/routes/auth.js';
import contractRoutes from './src/api/routes/contracts.js';
import analysisRoutes from './src/api/routes/analysis.js';
import userRoutes from './src/api/routes/users.js';

// Import middleware
import { authenticateToken } from './src/api/middleware/auth.js';
import { errorHandler } from './src/api/middleware/errorHandler.js';
import { initializeDatabase } from './src/api/database/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 5001; // Fixed port to avoid rate limit cache

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// NO RATE LIMITING FOR TESTING

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    storage: 'file-based'
  });
});

// Initialize database
await initializeDatabase();

// Routes - NO RATE LIMITING
app.use('/api/auth', authRoutes);
app.use('/api/contracts', authenticateToken, contractRoutes);
app.use('/api/analysis', authenticateToken, analysisRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Serve OpenAPI documentation
app.use('/api-docs', express.static(join(__dirname, 'src/api/docs')));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TEST Multi-Chain Analytics API Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`💾 Using file-based storage in ./data directory`);
  console.log(`⚠️  RATE LIMITING DISABLED FOR TESTING`);
});