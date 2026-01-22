# Multi-Chain Wallet Indexing API Documentation

## Overview

The Multi-Chain Wallet Indexing API provides endpoints for managing wallet addresses across multiple blockchain networks (EVM chains and Starknet), automatically indexing historical transaction data, and tracking indexing progress in real-time.

## Base URL

```
https://api.metagauge.com/api
```

## Authentication

All endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Supported Chains

### EVM Chains
- **ethereum** - Ethereum Mainnet
- **polygon** - Polygon Mainnet
- **lisk** - Lisk L2
- **arbitrum** - Arbitrum One
- **optimism** - Optimism Mainnet
- **bsc** - Binance Smart Chain

### Starknet Chains
- **starknet-mainnet** - Starknet Mainnet
- **starknet-sepolia** - Starknet Sepolia Testnet

## Address Format Requirements

### EVM Addresses
- Must be exactly 42 characters long
- Must start with `0x`
- Must contain only hexadecimal characters
- Example: `0x4200000000000000000000000000000000000006`

### Starknet Addresses
- Must be 64+ characters long
- Must start with `0x`
- Must contain only hexadecimal characters
- Example: `0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc`

## Endpoints

### 1. Create Wallet

Add a new wallet address to a project for indexing.

**Endpoint:** `POST /projects/{projectId}/wallets`

**Parameters:**
- `projectId` (path, required): UUID of the project

**Request Body:**
```json
{
  "address": "0x4200000000000000000000000000000000000006",
  "chain": "lisk",
  "description": "Lisk L2 Standard Bridge Contract"
}
```

**Request Fields:**
- `address` (string, required): The wallet address to index
- `chain` (string, required): The blockchain network (see supported chains)
- `description` (string, optional): Human-readable description of the wallet

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440001",
    "address": "0x4200000000000000000000000000000000000006",
    "chain": "lisk",
    "chain_type": "evm",
    "description": "Lisk L2 Standard Bridge Contract",
    "is_active": true,
    "last_indexed_block": 0,
    "total_transactions": 0,
    "total_events": 0,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "indexingJobId": "550e8400-e29b-41d4-a716-446655440002",
    "indexingStatus": "queued"
  }
}
```

**Error Responses:**

*400 Bad Request - Invalid address format:*
```json
{
  "status": "error",
  "data": {
    "error": "Invalid EVM address format. Must be 42 characters and start with 0x"
  }
}
```

*409 Conflict - Duplicate wallet:*
```json
{
  "status": "error",
  "data": {
    "error": "Wallet already exists for this project and chain"
  }
}
```

### 2. List Project Wallets

Retrieve all wallets associated with a project.

**Endpoint:** `GET /projects/{projectId}/wallets`

**Parameters:**
- `projectId` (path, required): UUID of the project

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "project_id": "550e8400-e29b-41d4-a716-446655440001",
      "address": "0x4200000000000000000000000000000000000006",
      "chain": "lisk",
      "chain_type": "evm",
      "description": "Lisk L2 Standard Bridge Contract",
      "is_active": true,
      "last_indexed_block": 1500000,
      "total_transactions": 1250,
      "total_events": 650,
      "last_synced_at": "2024-01-15T12:45:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T12:45:00Z",
      "indexingStatus": {
        "state": "completed",
        "currentBlock": 1500000,
        "transactionsFound": 1250,
        "eventsFound": 650,
        "blocksPerSecond": 0,
        "errorMessage": null
      }
    }
  ]
}
```

**Indexing Status States:**
- `queued` - Indexing job is waiting to start
- `running` - Indexing is currently in progress
- `completed` - Indexing has finished successfully
- `failed` - Indexing encountered an error
- `unknown` - No indexing job found

### 3. Get Wallet Details

Retrieve detailed information about a specific wallet.

**Endpoint:** `GET /projects/{projectId}/wallets/{walletId}`

**Parameters:**
- `projectId` (path, required): UUID of the project
- `walletId` (path, required): UUID of the wallet

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440001",
    "address": "0x4200000000000000000000000000000000000006",
    "chain": "lisk",
    "chain_type": "evm",
    "description": "Lisk L2 Standard Bridge Contract",
    "is_active": true,
    "last_indexed_block": 1500000,
    "total_transactions": 1250,
    "total_events": 650,
    "last_synced_at": "2024-01-15T12:45:00Z",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T12:45:00Z"
  }
}
```

### 4. Get Indexing Status

Get real-time indexing progress and status for a wallet.

**Endpoint:** `GET /projects/{projectId}/wallets/{walletId}/indexing-status`

**Parameters:**
- `projectId` (path, required): UUID of the project
- `walletId` (path, required): UUID of the wallet

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "walletId": "550e8400-e29b-41d4-a716-446655440000",
    "indexingStatus": "running",
    "progress": {
      "currentBlock": 1250000,
      "totalBlocks": 1500000,
      "transactionsFound": 950,
      "eventsFound": 475,
      "blocksPerSecond": 25.5,
      "estimatedTimeRemaining": 9804,
      "percentage": 83.33
    },
    "lastIndexedBlock": 1200000,
    "lastSyncedAt": "2024-01-15T12:30:00Z",
    "errorMessage": null
  }
}
```

**Progress Fields:**
- `currentBlock` - Current block being processed
- `totalBlocks` - Target end block for indexing
- `transactionsFound` - Number of transactions discovered so far
- `eventsFound` - Number of events discovered so far
- `blocksPerSecond` - Current processing speed
- `estimatedTimeRemaining` - Estimated seconds until completion
- `percentage` - Completion percentage (0-100)

### 5. Refresh Wallet Data

Trigger incremental indexing to fetch new data since last sync.

**Endpoint:** `POST /projects/{projectId}/wallets/{walletId}/refresh`

**Parameters:**
- `projectId` (path, required): UUID of the project
- `walletId` (path, required): UUID of the wallet

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "indexingJobId": "550e8400-e29b-41d4-a716-446655440003",
    "startBlock": 1500001,
    "currentBlock": 1600000,
    "message": "Refresh job queued successfully"
  }
}
```

**Error Responses:**

*409 Conflict - Job already running:*
```json
{
  "status": "error",
  "data": {
    "error": "Indexing job already in progress for this wallet"
  }
}
```

## WebSocket Real-Time Updates

### Connection

Connect to receive real-time indexing progress updates:

**Endpoint:** `wss://api.metagauge.com/ws/indexing/{walletId}`

**Authentication:** Include JWT token as query parameter:
```
wss://api.metagauge.com/ws/indexing/550e8400-e29b-41d4-a716-446655440000?token=your_jwt_token
```

### Message Format

**Progress Update:**
```json
{
  "type": "progress",
  "data": {
    "walletId": "550e8400-e29b-41d4-a716-446655440000",
    "currentBlock": 1250000,
    "totalBlocks": 1500000,
    "transactionsFound": 950,
    "eventsFound": 475,
    "blocksPerSecond": 25.5,
    "estimatedTimeRemaining": 9804
  }
}
```

**Completion:**
```json
{
  "type": "complete",
  "data": {
    "walletId": "550e8400-e29b-41d4-a716-446655440000",
    "totalTransactions": 1250,
    "totalEvents": 650,
    "finalBlock": 1500000
  }
}
```

**Error:**
```json
{
  "type": "error",
  "data": {
    "walletId": "550e8400-e29b-41d4-a716-446655440000",
    "errorMessage": "RPC endpoint timeout",
    "currentBlock": 1250000
  }
}
```

## Rate Limits

- **Wallet Creation:** 10 requests per minute per user
- **Status Checks:** 60 requests per minute per user
- **Refresh Operations:** 5 requests per minute per wallet
- **WebSocket Connections:** 10 concurrent connections per user

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_ADDRESS_FORMAT | Address format doesn't match chain requirements |
| 401 | UNAUTHORIZED | Invalid or missing authentication token |
| 403 | FORBIDDEN | User doesn't have access to this resource |
| 404 | WALLET_NOT_FOUND | Wallet doesn't exist or user doesn't have access |
| 409 | DUPLICATE_WALLET | Wallet already exists for this project and chain |
| 409 | INDEXING_IN_PROGRESS | Cannot start new indexing job while one is running |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests, please slow down |
| 500 | INTERNAL_ERROR | Server error, please try again later |

## Examples

### Complete Wallet Onboarding Flow

```javascript
// 1. Create wallet
const createResponse = await fetch('/api/projects/my-project-id/wallets', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: '0x4200000000000000000000000000000000000006',
    chain: 'lisk',
    description: 'Main project wallet'
  })
});

const wallet = await createResponse.json();
const walletId = wallet.data.id;

// 2. Monitor progress via WebSocket
const ws = new WebSocket(`wss://api.metagauge.com/ws/indexing/${walletId}?token=${token}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'progress') {
    console.log(`Progress: ${message.data.currentBlock}/${message.data.totalBlocks}`);
    console.log(`Found: ${message.data.transactionsFound} transactions`);
  } else if (message.type === 'complete') {
    console.log('Indexing completed!');
    ws.close();
  }
};

// 3. Check final status
const statusResponse = await fetch(`/api/projects/my-project-id/wallets/${walletId}/indexing-status`, {
  headers: { 'Authorization': 'Bearer ' + token }
});

const status = await statusResponse.json();
console.log(`Final status: ${status.data.indexingStatus}`);
```

### Refresh Wallet Data

```javascript
// Trigger refresh
const refreshResponse = await fetch(`/api/projects/my-project-id/wallets/${walletId}/refresh`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});

const refreshData = await refreshResponse.json();
console.log(`Refresh started from block ${refreshData.data.startBlock}`);

// Monitor refresh progress
const ws = new WebSocket(`wss://api.metagauge.com/ws/indexing/${walletId}?token=${token}`);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(`Refresh progress: ${message.data.transactionsFound} new transactions found`);
};
```

## SDK Integration

For easier integration, consider using our official SDK:

```bash
npm install @metagauge/wallet-indexing-sdk
```

```javascript
import { WalletIndexingClient } from '@metagauge/wallet-indexing-sdk';

const client = new WalletIndexingClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.metagauge.com'
});

// Create and monitor wallet
const wallet = await client.createWallet({
  projectId: 'my-project-id',
  address: '0x4200000000000000000000000000000000000006',
  chain: 'lisk'
});

// Subscribe to progress updates
client.subscribeToProgress(wallet.id, (progress) => {
  console.log(`Progress: ${progress.percentage}%`);
});
```