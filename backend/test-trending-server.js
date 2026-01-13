#!/usr/bin/env node

/**
 * Test Server for Trending and Ranking System
 * 
 * Simple Express server to test the trending functionality
 */

import express from 'express';
import cors from 'cors';
import trendingRoutes from './src/routes/trending.js';

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/trending', trendingRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'trending-api',
        timestamp: new Date().toISOString() 
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Trending API Server running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET /api/trending/projects - Get trending projects`);
    console.log(`   GET /api/trending/failing - Get failing projects`);
    console.log(`   GET /api/trending/analysis/:address - Get trend analysis`);
    console.log(`   GET /api/trending/categories/:category - Get category rankings`);
    console.log(`   GET /api/trending/chains/:chainId - Get chain rankings`);
    console.log(`   GET /api/trending/summary - Get trending summary`);
    console.log(`   GET /health - Health check`);
});

export default app;