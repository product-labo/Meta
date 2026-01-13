# Starknet RPC Query System - Complete Setup Guide

## 🚀 System Overview

Your Starknet RPC Query System is now fully operational with:

### Core Components
- **Database Layer**: PostgreSQL with complete schema and migrations
- **RPC Client**: Connects to Starknet blockchain nodes
- **Data Ingestion**: Fetches and processes blockchain data
- **Query Service**: Provides efficient data access
- **HTTP API Server**: REST endpoints for external access

### Available Endpoints

Once running, the system provides these HTTP endpoints:

```
GET /health                                    - Health check
GET /api/blocks/latest                         - Get latest block
GET /api/blocks/:identifier                    - Get block by number or hash
GET /api/blocks/:blockNumber/transactions      - Get block transactions
GET /api/transactions/:txHash                  - Get transaction by hash
GET /api/wallets/:address/interactions         - Get wallet interactions
GET /api/contracts/:address/events             - Get contract events
```

## 🏃‍♂️ How to Start All Services

### Option 1: Full System with HTTP API (Recommended)
```bash
# Start the complete system with HTTP API server
npm run server
```

This will:
1. Connect to your PostgreSQL database
2. Run database migrations
3. Connect to Starknet RPC
4. Start data ingestion (fetches last 3 months of data)
5. Begin continuous blockchain sync
6. Start HTTP API server on port 3000

### Option 2: Data Indexer Only
```bash
# Start just the data ingestion system (no HTTP API)
npm run dev
```

### Option 3: Production Build
```bash
# Build and run production version
npm run build
npm start
```

## 📊 What Happens When You Start

1. **Database Connection**: Connects to PostgreSQL and runs migrations
2. **RPC Connection**: Tests connection to Starknet node
3. **Historical Data Fetch**: Downloads last 3 months of blockchain data
4. **Continuous Sync**: Starts real-time block processing
5. **API Server**: Starts HTTP server for queries (if using `npm run server`)

## 🔍 Monitoring the System

### Logs
The system provides detailed logging:
- Database connection status
- RPC connection health
- Block processing progress
- API request logs
- Error handling

### Health Check
```bash
curl http://localhost:3000/health
```

### Example API Calls
```bash
# Get latest block
curl http://localhost:3000/api/blocks/latest

# Get specific block
curl http://localhost:3000/api/blocks/12345

# Get wallet interactions
curl http://localhost:3000/api/wallets/0x123.../interactions

# Get contract events
curl http://localhost:3000/api/contracts/0x456.../events
```

## ⚙️ Configuration

Your system is configured via `.env` file:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/starknet_rpc_query

# Starknet RPC
STARKNET_RPC_URL=https://starknet-mainnet.public.blastapi.io

# Processing
BATCH_SIZE=100
MAX_CONCURRENT_REQUESTS=10

# Logging
LOG_LEVEL=info

# API Server
PORT=3000
```

## 🛑 Stopping the System

Press `Ctrl+C` to gracefully shutdown. The system will:
1. Stop data ingestion
2. Close database connections
3. Stop HTTP server
4. Clean up resources

## 📈 Performance Notes

- **Initial Sync**: First run downloads 3 months of data (may take time)
- **Continuous Sync**: Processes new blocks every 10 seconds
- **Database**: Optimized queries with proper indexing
- **API**: Handles concurrent requests efficiently

## 🔧 Troubleshooting

### Database Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database permissions

### RPC Issues
- Check STARKNET_RPC_URL is accessible
- Verify network connectivity
- Monitor rate limits

### API Issues
- Check if port 3000 is available
- Verify no firewall blocking
- Check logs for errors

## 🎯 Ready to Start!

Run this command to start the complete system:

```bash
npm run server
```

Your Starknet RPC Query System will be available at `http://localhost:3000`
