/**
 * Simple test server for Task 6 endpoints
 */

const express = require('express');
const cors = require('cors');
const businessIntelligenceService = require('./src/services/business-intelligence-service.js').default;

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'task6-test-server' });
});

// Enhanced Business Directory (Task 6.1)
app.get('/api/contract-business', async (req, res) => {
    try {
        if (!businessIntelligenceService.isInitialized) {
            await businessIntelligenceService.initialize();
        }

        const filters = {
            limit: Math.min(parseInt(req.query.limit) || 20, 100),
            offset: parseInt(req.query.offset) || 0,
            sortBy: req.query.sortBy || 'customers',
            sortOrder: req.query.sortOrder || 'DESC',
            chainId: req.query.chainId,
            category: req.query.category,
            minGrowthScore: req.query.minGrowthScore ? parseInt(req.query.minGrowthScore) : undefined,
            maxRiskScore: req.query.maxRiskScore ? parseInt(req.query.maxRiskScore) : undefined,
            search: req.query.search
        };

        const result = await businessIntelligenceService.getEnhancedBusinessDirectory(filters);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error in business directory:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Individual Contract Details (Task 6.1 & 6.2)
app.get('/api/contract-business/:contractAddress', async (req, res) => {
    try {
        if (!businessIntelligenceService.isInitialized) {
            await businessIntelligenceService.initialize();
        }

        const { contractAddress } = req.params;
        
        if (!contractAddress || contractAddress.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contract address format'
            });
        }

        const result = await businessIntelligenceService.getEnhancedContractDetails(contractAddress);
        
        if (result.success) {
            res.json(result);
        } else {
            if (result.error === 'Contract not found') {
                res.status(404).json(result);
            } else {
                res.status(500).json(result);
            }
        }
    } catch (error) {
        console.error('Error in contract details:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Dashboard Metrics (existing)
app.get('/api/contract-business/metrics', async (req, res) => {
    try {
        if (!businessIntelligenceService.isInitialized) {
            await businessIntelligenceService.initialize();
        }

        const result = await businessIntelligenceService.getDashboardMetrics(req.query);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error in dashboard metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Historical Metrics (existing)
app.get('/api/contract-business/metrics/historical', async (req, res) => {
    try {
        if (!businessIntelligenceService.isInitialized) {
            await businessIntelligenceService.initialize();
        }

        const result = await businessIntelligenceService.getHistoricalMetrics(req.query);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error in historical metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Task 6 Test Server running on http://localhost:${PORT}`);
    console.log('📡 Available endpoints:');
    console.log('  - GET /api/contract-business (Enhanced Business Directory)');
    console.log('  - GET /api/contract-business/:contractAddress (Individual Contract Details)');
    console.log('  - GET /api/contract-business/metrics (Dashboard Metrics)');
    console.log('  - GET /api/contract-business/metrics/historical (Historical Metrics)');
    console.log('  - GET /health (Health Check)');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    try {
        if (businessIntelligenceService.isInitialized) {
            await businessIntelligenceService.shutdown();
        }
    } catch (error) {
        console.error('❌ Shutdown error:', error.message);
    }
    process.exit(0);
});