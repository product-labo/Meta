const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const chainsRoutes = require('./routes/chains');
const transactionsRoutes = require('./routes/transactions');
const eventsRoutes = require('./routes/events');
const tokensRoutes = require('./routes/tokens');
const businessIntelligenceRoutes = require('./routes/business-intelligence');
const contractBusinessRoutes = require('./routes/contract-business-simple');

app.use('/api/chains', chainsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/business-intelligence', businessIntelligenceRoutes);
app.use('/api/contract-business', contractBusinessRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: ['chains', 'transactions', 'events', 'tokens', 'business-intelligence']
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Multi-Chain Indexer API with Business Intelligence',
        version: '1.0.0',
        endpoints: {
            chains: '/api/chains',
            transactions: '/api/transactions',
            events: '/api/events',
            tokens: '/api/tokens',
            businessIntelligence: '/api/business-intelligence'
        },
        businessIntelligence: {
            overview: '/api/business-intelligence/overview',
            traction: '/api/business-intelligence/traction/:category',
            cohorts: '/api/business-intelligence/cohorts',
            riskAnalysis: '/api/business-intelligence/risk-analysis'
        },
        contractBusiness: {
            individual: '/api/contract-business/:contractAddress',
            directory: '/api/contract-business/',
            description: 'Individual smart contract business analytics - each contract as a business entity'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Multi-Chain Indexer API Server running on port ${PORT}`);
    console.log(`📊 Business Intelligence endpoints available at:`);
    console.log(`   • Overview: http://localhost:${PORT}/api/business-intelligence/overview`);
    console.log(`   • Traction: http://localhost:${PORT}/api/business-intelligence/traction/defi`);
    console.log(`   • Cohorts: http://localhost:${PORT}/api/business-intelligence/cohorts`);
    console.log(`   • Risk Analysis: http://localhost:${PORT}/api/business-intelligence/risk-analysis`);
    console.log(`🏢 Individual Contract Business Analytics:`);
    console.log(`   • Contract Business: http://localhost:${PORT}/api/contract-business/:contractAddress`);
    console.log(`   • Business Directory: http://localhost:${PORT}/api/contract-business/`);
    console.log(`   • Health Check: http://localhost:${PORT}/health`);
});