const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const chainsRouter = require('./routes/chains');

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chains', chainsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Multi-Chain Indexer API'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Multi-Chain Indexer API running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET /api/chains - List all chains`);
    console.log(`   GET /api/chains/:id - Get chain details`);
    console.log(`   GET /api/chains/:id/activity - Get chain activity`);
    console.log(`   GET /health - Health check`);
});

module.exports = app;