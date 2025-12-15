# Multi-Chain Indexer CRUD API Documentation

## 🚀 Overview

This API provides comprehensive access to the multi-chain indexer data with full CRUD operations, filtering, pagination, and analytics. The API is designed for frontend applications to easily consume blockchain intelligence data.

## 📋 API Endpoints

### 🔗 Chains API (`/api/chains`)

#### GET /api/chains
Get all monitored chains with current status and statistics.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "ethereum",
      "chain_id": 1,
      "rpc_urls": ["https://ethereum-rpc.publicnode.com"],
      "is_active": true,
      "latest_block": 18500000,
      "latest_block_time": "2023-12-12T10:30:00Z",
      "monitored_contracts": 5,
      "events_last_hour": 150,
      "transactions_today": 1200
    }
  ],
  "count": 5
}
```

#### GET /api/chains/:chainId
Get detailed information about a specific chain.

#### GET /api/chains/:chainId/activity
Get recent activity timeline for a chain.

**Query Parameters:**
- `hours` (default: 24) - Time range in hours
- `limit` (default: 100) - Maximum results

---

### 💳 Transactions API (`/api/transactions`)

#### GET /api/transactions
Get transactions with advanced filtering and pagination.

**Query Parameters:**
- `chainId` - Filter by chain ID
- `status` - Filter by status (1=success, 0=failed)
- `functionName` - Filter by function name (partial match)
- `fromAddress` - Filter by sender address
- `toAddress` - Filter by recipient address
- `limit` (default: 50) - Results per page
- `offset` (default: 0) - Pagination offset
- `sortBy` (default: captured_at) - Sort column
- `sortOrder` (default: DESC) - Sort direction
- `timeRange` (default: 24h) - Time filter (1h, 24h, 7d, 30d)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tx_hash": "0x123...",
      "block_number": 18500000,
      "from_address": "0xabc...",
      "to_address": "0xdef...",
      "value": "1000000000000000000",
      "gas_used": 21000,
      "status": 1,
      "function_name": "transfer",
      "decoded_input": {...},
      "chain_name": "ethereum",
      "gas_efficiency_percent": 85.5,
      "transaction_fee": "315000000000000"
    }
  ],
  "pagination": {
    "total": 1500,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### GET /api/transactions/:txHash
Get detailed information about a specific transaction including events, token transfers, and DeFi interactions.

#### GET /api/transactions/analytics/summary
Get transaction analytics summary with metrics and trends.

---

### 📝 Events API (`/api/events`)

#### GET /api/events
Get decoded events with filtering and pagination.

**Query Parameters:**
- `chainId` - Filter by chain ID
- `eventName` - Filter by event name (partial match)
- `contractAddress` - Filter by contract address
- `txHash` - Filter by transaction hash
- `limit` (default: 50) - Results per page
- `offset` (default: 0) - Pagination offset
- `timeRange` (default: 24h) - Time filter
- `sortBy` (default: captured_at) - Sort column
- `sortOrder` (default: DESC) - Sort direction

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tx_hash": "0x123...",
      "event_name": "Transfer",
      "event_signature": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "decoded_data": {
        "from": "0xabc...",
        "to": "0xdef...",
        "value": "1000000000000000000"
      },
      "contract_address": "0x456...",
      "contract_name": "USDC Token",
      "chain_name": "ethereum"
    }
  ],
  "pagination": {...}
}
```

#### GET /api/events/analytics/summary
Get events analytics with top events, contracts, and volume trends.

#### GET /api/events/types
Get all available event types with usage statistics.

---

### 🪙 Tokens API (`/api/tokens`)

#### GET /api/tokens/transfers
Get token transfers with comprehensive filtering.

**Query Parameters:**
- `chainId` - Filter by chain ID
- `tokenAddress` - Filter by token contract address
- `fromAddress` - Filter by sender address
- `toAddress` - Filter by recipient address
- `tokenSymbol` - Filter by token symbol (partial match)
- `transferType` - Filter by type (transfer, mint, burn)
- `minAmount` - Minimum transfer amount
- `maxAmount` - Maximum transfer amount
- `limit` (default: 50) - Results per page
- `offset` (default: 0) - Pagination offset
- `timeRange` (default: 24h) - Time filter
- `sortBy` (default: captured_at) - Sort column
- `sortOrder` (default: DESC) - Sort direction

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tx_hash": "0x123...",
      "token_address": "0xa0b86a33e6441e6c673a4a1c3cc2c4c8f98fb8a4",
      "token_name": "USD Coin",
      "token_symbol": "USDC",
      "token_decimals": 6,
      "from_address": "0xabc...",
      "to_address": "0xdef...",
      "amount_raw": "1000000",
      "amount_formatted": "1.000000",
      "usd_value": 1.00,
      "transfer_type": "transfer",
      "chain_name": "ethereum"
    }
  ],
  "pagination": {...}
}
```

#### GET /api/tokens/analytics/summary
Get token transfer analytics with top tokens by volume and value.

#### GET /api/tokens/:tokenAddress
Get detailed information about a specific token including holders, volume, and transfer history.

#### GET /api/tokens/list
Get list of all tokens with basic statistics.

---

## 🔧 Usage Examples

### Frontend Integration

```javascript
// Get recent transactions for Ethereum
const response = await fetch('/api/transactions?chainId=1&limit=20&timeRange=1h');
const { data, pagination } = await response.json();

// Get token transfers for USDC
const usdcTransfers = await fetch('/api/tokens/transfers?tokenSymbol=USDC&limit=50');

// Get events for a specific contract
const contractEvents = await fetch('/api/events?contractAddress=0x123...&timeRange=24h');

// Get transaction analytics
const analytics = await fetch('/api/transactions/analytics/summary?chainId=1&timeRange=7d');
```

### Filtering Examples

```javascript
// Get failed transactions only
const failedTxs = await fetch('/api/transactions?status=0&timeRange=24h');

// Get large token transfers (> 1000 tokens)
const largeTxs = await fetch('/api/tokens/transfers?minAmount=1000&sortBy=amount_formatted&sortOrder=DESC');

// Get Transfer events only
const transfers = await fetch('/api/events?eventName=Transfer&limit=100');

// Get transactions from specific address
const userTxs = await fetch('/api/transactions?fromAddress=0xabc...&timeRange=7d');
```

## 📊 Response Format

All API endpoints follow a consistent response format:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 1500,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "chainId": 1,
    "timeRange": "24h",
    ...
  }
}
```

## ❌ Error Handling

Error responses follow this format:

```json
{
  "success": false,
  "error": "Failed to fetch transactions",
  "message": "Database connection failed"
}
```

## 🚀 Getting Started

1. **Start the API server:**
   ```bash
   cd boardling/backend/multi-chain-indexer/api
   npm install
   npm start
   ```

2. **Test endpoints:**
   ```bash
   curl http://localhost:3001/api/chains
   curl http://localhost:3001/api/transactions?limit=5
   curl http://localhost:3001/api/events/analytics/summary
   ```

3. **Frontend integration:**
   - Use the API endpoints in your React/Vue/Angular app
   - Implement pagination with the provided pagination object
   - Use filters for advanced search functionality
   - Display analytics data with charts and graphs

## 🎯 Key Features

- ✅ **Complete CRUD operations** for all data types
- ✅ **Advanced filtering** with multiple parameters
- ✅ **Pagination support** for large datasets
- ✅ **Real-time analytics** with summary endpoints
- ✅ **Flexible sorting** by multiple columns
- ✅ **Time range filtering** (1h, 24h, 7d, 30d)
- ✅ **Cross-chain support** with chain filtering
- ✅ **Detailed transaction analysis** with gas metrics
- ✅ **Token transfer tracking** with USD values
- ✅ **Event decoding** with parameter extraction
- ✅ **Error handling** with descriptive messages
- ✅ **Performance optimized** queries with indexes

This API provides everything your frontend needs to build a comprehensive blockchain analytics dashboard!