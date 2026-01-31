#!/usr/bin/env node

/**
 * Simple Test Server for Faucet API
 * Minimal server to test faucet functionality without other services
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import faucetRoutes from './src/api/routes/faucet.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'faucet-test-server'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MetaGauge Faucet Test Server',
    version: '1.0.0',
    description: 'Test server for faucet API endpoints',
    endpoints: {
      health: '/health',
      faucet: '/api/faucet'
    }
  });
});

// Faucet routes
app.use('/api/faucet', faucetRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚰 Faucet Test Server running on port ${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`🚰 Faucet API: http://localhost:${PORT}/api/faucet`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/faucet/health - Faucet service health`);
  console.log(`   GET  /api/faucet/status/:address - Check claim status`);
  console.log(`   POST /api/faucet/claim - Claim tokens`);
  console.log(`   GET  /api/faucet/stats - Faucet statistics`);
});

export default app;