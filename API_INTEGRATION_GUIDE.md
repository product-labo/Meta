# 🚀 Multi-Chain Analytics API - Integration Guide

## ✅ What We've Accomplished

### 🏗️ Complete API Backend Transformation
- ✅ **Removed MongoDB dependency** - Now uses file-based JSON storage
- ✅ **OAuth Authentication** - JWT-based auth with Google/GitHub support
- ✅ **Dynamic Configuration** - Uses TARGET and COMPETITOR data from .env
- ✅ **File Storage System** - All data stored in `./data/` directory
- ✅ **Rate Limiting** - 100 requests/15min, 10 analyses/hour
- ✅ **Error Handling** - Comprehensive error responses
- ✅ **API Documentation** - OpenAPI/Swagger at `/api-docs`

### 🔐 Authentication System
- ✅ User registration with bcrypt password hashing
- ✅ JWT token-based authentication
- ✅ API key alternative authentication
- ✅ User tiers (free: 10/month, pro: 100/month, enterprise: unlimited)

### 📋 Contract Configuration Management
- ✅ Save multiple contract configurations per user
- ✅ Auto-load from .env file (TARGET + 5 COMPETITORS)
- ✅ Support for all chains (Ethereum, Lisk, Starknet, etc.)
- ✅ RPC configuration with failover URLs
- ✅ Analysis parameters (block range, thresholds, etc.)

### 🔬 Analysis Engine Integration
- ✅ Async analysis processing
- ✅ Progress tracking and status monitoring
- ✅ Support for single, competitive, and comparative analysis
- ✅ Integration with existing AnalyticsEngine
- ✅ Results stored in organized reports structure

## 🌐 API Endpoints

### Authentication
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login user
GET  /api/auth/me          - Get current user
POST /api/auth/refresh-api-key - Generate new API key
```

### Contract Configuration
```
GET  /api/contracts        - List user configurations
POST /api/contracts        - Create configuration (empty body uses .env)
GET  /api/contracts/:id    - Get specific configuration
PUT  /api/contracts/:id    - Update configuration
DELETE /api/contracts/:id  - Delete configuration
```

### Analysis
```
POST /api/analysis/start      - Start analysis
GET  /api/analysis/:id/status - Monitor progress
GET  /api/analysis/:id/results - Get final results
GET  /api/analysis/history    - Analysis history
GET  /api/analysis/stats      - Usage statistics
```

### User Management
```
GET /api/users/dashboard   - Dashboard data
GET /api/users/profile     - User profile
PUT /api/users/profile     - Update profile
GET /api/users/usage       - Usage statistics
```

## 💻 Frontend Integration Example

### 1. User Registration/Login
```javascript
// Register new user
const registerUser = async (email, password, name) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const { token, user } = await response.json();
  localStorage.setItem('authToken', token);
  return { token, user };
};

// Login existing user
const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const { token, user } = await response.json();
  localStorage.setItem('authToken', token);
  return { token, user };
};
```

### 2. Create Configuration from .env
```javascript
// Create config using .env defaults
const createDefaultConfig = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({}) // Empty body uses .env defaults
  });
  const { config } = await response.json();
  return config;
};

// Create custom config
const createCustomConfig = async (configData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: "My Custom Analysis",
      targetContract: {
        address: "0x...",
        chain: "ethereum",
        name: "My Token"
      },
      competitors: [
        {
          address: "0x...",
          chain: "ethereum", 
          name: "Competitor 1"
        }
      ],
      rpcConfig: {
        ethereum: ["https://eth.nownodes.io/api-key"]
      },
      analysisParams: {
        blockRange: 1000,
        whaleThreshold: 10
      }
    })
  });
  return await response.json();
};
```

### 3. Start Analysis and Monitor Progress
```javascript
// Start analysis
const startAnalysis = async (configId, analysisType = 'competitive') => {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/analysis/start', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ configId, analysisType })
  });
  const { analysisId } = await response.json();
  return analysisId;
};

// Monitor progress with polling
const monitorAnalysis = async (analysisId, onProgress) => {
  const token = localStorage.getItem('authToken');
  
  const poll = async () => {
    const response = await fetch(`/api/analysis/${analysisId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const status = await response.json();
    
    onProgress(status); // Update UI with progress
    
    if (status.status === 'completed') {
      return await getAnalysisResults(analysisId);
    } else if (status.status === 'failed') {
      throw new Error(status.errorMessage);
    } else {
      // Continue polling every 5 seconds
      setTimeout(poll, 5000);
    }
  };
  
  return poll();
};

// Get final results
const getAnalysisResults = async (analysisId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/analysis/${analysisId}/results`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};
```

### 4. Complete Workflow Example
```javascript
const runCompleteAnalysis = async () => {
  try {
    // 1. Login/Register
    const { token } = await loginUser('user@example.com', 'password');
    
    // 2. Create config from .env
    const config = await createDefaultConfig();
    console.log('Config created:', config.name);
    
    // 3. Start analysis
    const analysisId = await startAnalysis(config.id, 'competitive');
    console.log('Analysis started:', analysisId);
    
    // 4. Monitor progress
    const results = await monitorAnalysis(analysisId, (status) => {
      console.log(`Progress: ${status.progress}% - ${status.status}`);
    });
    
    // 5. Use results for charts/display
    console.log('Target Results:', results.results.target);
    console.log('Competitor Results:', results.results.competitors);
    console.log('Comparative Analysis:', results.results.comparative);
    
    return results;
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
};
```

## 📊 Response Data Structure

### Analysis Results Format
```javascript
{
  "id": "analysis-uuid",
  "status": "completed",
  "analysisType": "competitive",
  "results": {
    "target": {
      "contract": {
        "address": "0x...",
        "chain": "lisk",
        "name": "USDT"
      },
      "transactions": 1250,
      "metrics": {
        "totalValue": 125000.45,
        "userLifecycle": { /* 5 metrics */ },
        "activity": { /* 5 metrics */ },
        "financial": { /* 5 metrics */ },
        "performance": { /* 5 metrics */ }
      },
      "behavior": {
        "userCount": 450,
        "avgTransactionSize": 100.25,
        "retentionRate": 0.65
      },
      "reportPaths": {
        "json": "./reports/usdt/lisk/analysis_2026-01-24.json",
        "csv": "./reports/usdt/lisk/analysis_2026-01-24.csv",
        "markdown": "./reports/usdt/lisk/analysis_2026-01-24.md"
      }
    },
    "competitors": [
      {
        "contract": { /* competitor contract info */ },
        "transactions": 890,
        "metrics": { /* competitor metrics */ },
        "behavior": { /* competitor behavior */ }
      }
    ],
    "comparative": {
      "summary": "Comparative analysis of USDT against 4 competitors",
      "rankings": {
        "byTransactions": [
          { "rank": 1, "contract": {...}, "value": 1250 },
          { "rank": 2, "contract": {...}, "value": 890 }
        ],
        "byUsers": [...],
        "byValue": [...]
      },
      "insights": [
        "Target contract ranks #1 in transaction volume",
        "Target contract ranks #2 in user count",
        "Target contract ranks #1 in total value"
      ]
    }
  },
  "metadata": {
    "executionTimeMs": 45000,
    "totalTransactions": 2140,
    "chainsAnalyzed": ["lisk", "ethereum"]
  }
}
```

## 🎯 Chart/Display Integration

### For Transaction Volume Chart
```javascript
const createVolumeChart = (results) => {
  const data = [
    {
      name: results.results.target.contract.name,
      value: results.results.target.transactions,
      type: 'target'
    },
    ...results.results.competitors.map(comp => ({
      name: comp.contract.name,
      value: comp.transactions,
      type: 'competitor'
    }))
  ];
  
  // Use with Chart.js, D3, or any charting library
  return data;
};
```

### For Metrics Dashboard
```javascript
const createMetricsDashboard = (results) => {
  const target = results.results.target;
  
  return {
    overview: {
      transactions: target.transactions,
      users: target.behavior.userCount,
      totalValue: target.metrics.totalValue,
      avgTransactionSize: target.behavior.avgTransactionSize
    },
    lifecycle: target.metrics.userLifecycle,
    activity: target.metrics.activity,
    financial: target.metrics.financial,
    performance: target.metrics.performance
  };
};
```

## 🚀 Getting Started

1. **Start the API server:**
   ```bash
   npm start
   # Server runs on http://localhost:5000
   ```

2. **Test the API:**
   ```bash
   node test/api-test.js
   ```

3. **View API documentation:**
   ```
   http://localhost:5000/api-docs
   ```

4. **Check health:**
   ```
   http://localhost:5000/health
   ```

## 📁 Data Storage

All data is stored in JSON files in the `./data/` directory:
- `./data/users.json` - User accounts
- `./data/contracts.json` - Contract configurations  
- `./data/analyses.json` - Analysis results

Reports are stored in the `./reports/` directory organized by contract and chain.

## 🔧 Configuration

The API automatically loads TARGET and COMPETITOR contract data from your `.env` file:
- `CONTRACT_ADDRESS`, `CONTRACT_CHAIN`, `CONTRACT_NAME`
- `COMPETITOR_1_ADDRESS`, `COMPETITOR_1_CHAIN`, etc.
- RPC URLs for all supported chains
- Analysis parameters (block range, thresholds, etc.)

This makes it easy to test with your existing contract data without manual configuration.

---

## ✅ Ready for Frontend Integration!

The API is now fully functional and ready for frontend integration. All endpoints work with file-based storage, authentication is implemented, and the analysis engine is integrated. You can start building your frontend charts and dashboards using the response data structures provided above.