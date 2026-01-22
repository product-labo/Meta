# Starknet RPC Flow & Structure Analysis

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     STARKNET RPC INDEXER                        │
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   RPC Layer  │ ───> │  Processing  │ ───> │   Database   │ │
│  │              │      │    Layer     │      │    Layer     │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📡 RPC Connection Flow

### 1. **RPC Client Initialization**
Location: `src/services/rpc/StarknetRPCClient.ts`

```typescript
StarknetRPCClient
  ├── Constructor(url, timeout)
  │   └── Creates Axios instance with:
  │       ├── baseURL: STARKNET_RPC_URL (from .env)
  │       ├── timeout: 30000ms (default)
  │       └── headers: 'Content-Type: application/json'
  │
  └── makeRequest(method, params)
      ├── Serializes BigInt → hex strings
      ├── Formats JSON-RPC 2.0 request
      ├── POST to RPC endpoint
      └── Returns result or throws error
```

**RPC URLs Used:**
- Primary: `https://starknet-rpc.publicnode.com`
- Fallback: `https://rpc.starknet.lava.build`

### 2. **Request Formatting**
Location: `src/services/rpc/RequestFormatter.ts`

```
Request Flow:
  Input → Validate Method → Format Params → JSON-RPC 2.0 Structure
  
Supported Methods:
  ├── starknet_blockNumber (no params)
  ├── starknet_getBlockWithTxs (blockId)
  ├── starknet_getTransactionByHash (txHash)
  ├── starknet_getTransactionReceipt (txHash)
  ├── starknet_getClass (classHash)
  └── starknet_getStorageAt (address, key, blockId?)
```

### 3. **Response Parsing**
Location: `src/services/rpc/ResponseParser.ts`

```
Response Flow:
  RPC Response → Validate JSON-RPC 2.0 → Extract Result → Parse Format
  
Parsing Types:
  ├── Block Response (block_number, block_hash, timestamp)
  ├── Transaction Response (tx_hash, sender_address)
  └── Contract Class Response (class_hash, abi)
```

## 🔄 Data Ingestion Flow

### Main Entry Point
Location: `src/app.ts` → `StarknetRPCQueryApp`

```
Startup Sequence:
  1. Load Config (.env variables)
  2. Connect to Database (PostgreSQL)
  3. Run Migrations (create tables)
  4. Test RPC Connection (getBlockNumber)
  5. Fetch Historical Data (recent blocks)
  6. Start Continuous Sync (real-time)
```

### Data Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCK PROCESSING FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. RPC FETCH
   ├── getLatestBlockNumber()
   └── getBlockWithTxs(blockNumber)
       └── Returns: Block + Transactions[]

2. BLOCK PROCESSOR
   ├── Extract block metadata
   ├── Insert into `blocks` table
   └── Pass transactions to Transaction Processor

3. TRANSACTION PROCESSOR
   ├── For each transaction:
   │   ├── Extract tx metadata
   │   ├── Fetch transaction receipt (for events)
   │   ├── Insert into `transactions` table
   │   └── Pass to Event Processor
   
4. EVENT PROCESSOR
   ├── Extract events from receipt
   ├── Parse event data (keys, data arrays)
   ├── Insert into `events` table
   └── Link to contract_address

5. CONTRACT PROCESSOR
   ├── Identify contract deployments
   ├── Extract class_hash
   ├── Insert into `contracts` table
   └── Fetch contract class details

6. WALLET PROCESSOR
   ├── Track sender_address
   ├── Insert into `wallets` table
   └── Record wallet_interactions
```

## 🗄️ Database Schema Structure

### Core Tables

```sql
blocks
  ├── block_number (BIGINT, PK)
  ├── block_hash (VARCHAR)
  ├── parent_block_hash (VARCHAR)
  ├── timestamp (TIMESTAMP)
  └── finality_status (VARCHAR)

transactions
  ├── tx_hash (VARCHAR, PK)
  ├── block_number (BIGINT, FK → blocks)
  ├── tx_type (VARCHAR)
  ├── sender_address (VARCHAR)
  ├── actual_fee (NUMERIC)
  ├── max_fee (NUMERIC)
  └── status (VARCHAR)

events
  ├── id (SERIAL, PK)
  ├── tx_hash (VARCHAR, FK → transactions)
  ├── block_number (BIGINT, FK → blocks)
  ├── contract_address (VARCHAR)
  ├── event_keys (TEXT[])
  └── event_data (TEXT[])

contracts
  ├── contract_address (VARCHAR, PK)
  ├── class_hash (VARCHAR)
  ├── deployment_block (BIGINT)
  └── deployment_tx_hash (VARCHAR)

wallets
  ├── address (VARCHAR, PK)
  ├── first_seen_block (BIGINT)
  └── last_activity_block (BIGINT)
```

## 🔍 Key Methods & Their Flow

### 1. `getBlockWithReceipts(blockId)`

```
Flow:
  1. Format blockId (number/bigint → {block_number: N})
  2. Call starknet_getBlockWithTxs RPC method
  3. For each transaction in block:
     a. Transform transaction data
     b. Fetch transaction receipt (for events)
     c. Extract events from receipt
     d. Attach events to transaction
  4. Return complete Block object with transactions + events
```

### 2. `ingestBlock(blockNumber)`

```
Flow:
  1. Fetch block via RPC
  2. Start database transaction
  3. Insert block into `blocks` table
  4. For each transaction:
     a. Insert into `transactions` table
     b. Process events
     c. Identify contracts
     d. Track wallets
  5. Commit transaction
```

### 3. `processLatestBlock()`

```
Flow:
  1. Get latest block number from RPC
  2. Query last processed block from DB
  3. If gap exists:
     a. Process next block (lastProcessed + 1)
     b. Log progress
  4. Sleep 10 seconds
  5. Repeat
```

## 🔧 Configuration Structure

### Environment Variables (.env.book)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/david
DB_HOST=localhost
DB_PORT=5432
DB_NAME=david

# Starknet RPC
STARKNET_RPC_PRIMARY=https://starknet-rpc.publicnode.com
STARKNET_RPC_FALLBACK=https://rpc.starknet.lava.build
STARKNET_RPC_URL=https://starknet-rpc.publicnode.com
STARKNET_RPC_TIMEOUT=30000
STARKNET_RPC_RETRY_ATTEMPTS=3

# Application
NODE_ENV=development
LOG_LEVEL=info
PORT=3001

# Ingestion
BATCH_SIZE=100
CHECKPOINT_INTERVAL=1000
MAX_CONCURRENT_REQUESTS=10
```

## 📊 Data Flow Diagram

```
┌──────────────┐
│  Starknet    │
│  Blockchain  │
└──────┬───────┘
       │
       │ RPC Calls (JSON-RPC 2.0)
       ↓
┌──────────────────────────────────────┐
│   StarknetRPCClient                  │
│   ├── makeRequest()                  │
│   ├── getBlockWithReceipts()         │
│   ├── getTransactionReceipt()        │
│   └── getLatestBlockNumber()         │
└──────┬───────────────────────────────┘
       │
       │ Block + Transactions + Events
       ↓
┌──────────────────────────────────────┐
│   DataIngestionService               │
│   ├── processLatestBlock()           │
│   └── ingestBlock()                  │
└──────┬───────────────────────────────┘
       │
       │ Structured Data
       ↓
┌──────────────────────────────────────┐
│   Specialized Processors             │
│   ├── BlockProcessor                 │
│   ├── TransactionProcessor           │
│   ├── EventProcessor                 │
│   ├── ContractProcessor              │
│   └── WalletProcessor                │
└──────┬───────────────────────────────┘
       │
       │ SQL Inserts
       ↓
┌──────────────────────────────────────┐
│   PostgreSQL Database                │
│   ├── blocks                         │
│   ├── transactions                   │
│   ├── events                         │
│   ├── contracts                      │
│   └── wallets                        │
└──────────────────────────────────────┘
```

## 🚀 Execution Flow

### Continuous Indexer Mode

```
Start
  ↓
Load Config
  ↓
Connect to Database
  ↓
Run Migrations
  ↓
Test RPC Connection
  ↓
┌─────────────────────┐
│  Continuous Loop    │
│  ┌───────────────┐  │
│  │ Get Latest    │  │
│  │ Block Number  │  │
│  └───────┬───────┘  │
│          ↓          │
│  ┌───────────────┐  │
│  │ Check Last    │  │
│  │ Processed     │  │
│  └───────┬───────┘  │
│          ↓          │
│  ┌───────────────┐  │
│  │ Process Gap   │  │
│  │ Blocks        │  │
│  └───────┬───────┘  │
│          ↓          │
│  ┌───────────────┐  │
│  │ Sleep 10s     │  │
│  └───────┬───────┘  │
│          │          │
│          └──────────┘
│  (Loop Forever)     │
└─────────────────────┘
```

## 🔑 Key Components

### 1. **RPC Layer**
- **Purpose**: Communicate with Starknet blockchain
- **Files**: 
  - `StarknetRPCClient.ts` (main client)
  - `RequestFormatter.ts` (format requests)
  - `ResponseParser.ts` (parse responses)

### 2. **Ingestion Layer**
- **Purpose**: Fetch and process blockchain data
- **Files**:
  - `DataIngestionService.ts` (orchestration)
  - `BlockProcessor.ts` (block handling)
  - `TransactionProcessor.ts` (tx handling)
  - `EventProcessor.ts` (event extraction)
  - `ContractProcessor.ts` (contract identification)

### 3. **Database Layer**
- **Purpose**: Store processed data
- **Files**:
  - `Database.ts` (connection & queries)
  - `migrations/001_initial_schema.sql` (schema)

### 4. **Application Layer**
- **Purpose**: Coordinate all components
- **Files**:
  - `app.ts` (main application)
  - `continuous-indexer.ts` (continuous mode)
  - `index.ts` (entry point)

## 🎯 Critical Paths

### Path 1: Block to Database
```
RPC.getBlockWithTxs() 
  → DataIngestion.ingestBlock()
  → DB.transaction()
  → INSERT blocks, transactions, events
  → COMMIT
```

### Path 2: Event Extraction
```
RPC.getTransactionReceipt(txHash)
  → Extract receipt.events[]
  → EventProcessor.process()
  → INSERT events table
  → Link to contract_address
```

### Path 3: Contract Discovery
```
Transaction.type === 'DEPLOY'
  → Extract contract_address
  → RPC.getClassHashAt(address)
  → ContractProcessor.process()
  → INSERT contracts table
```

## 📝 Summary

The Starknet RPC indexer follows a **layered architecture**:

1. **RPC Layer**: Handles all blockchain communication via JSON-RPC 2.0
2. **Processing Layer**: Transforms raw blockchain data into structured format
3. **Database Layer**: Persists data with referential integrity

**Key Features**:
- Continuous real-time syncing
- Event extraction from transaction receipts
- Contract deployment tracking
- Wallet activity monitoring
- Automatic retry and error handling
- Database transaction safety

**Data Flow**: Blockchain → RPC Client → Processors → Database
