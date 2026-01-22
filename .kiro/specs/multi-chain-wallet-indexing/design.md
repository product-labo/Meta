# Design Document

## Overview

The Multi-Chain Wallet Indexing system enables startups to seamlessly onboard their projects by connecting wallet addresses across multiple blockchain networks (EVM and Starknet), automatically indexing all historical transaction data into a normalized PostgreSQL database with real-time progress tracking. The system operates asynchronously, allowing users to proceed to their dashboard immediately while indexing continues in the background.

The architecture consists of three main layers:
1. **Frontend Layer**: React/Next.js components for wallet input, chain selection, and real-time progress visualization
2. **Backend API Layer**: Express.js endpoints for wallet management, indexing orchestration, and progress streaming
3. **Indexing Engine Layer**: Node.js workers that interface with blockchain RPCs to fetch, decode, and store transaction data

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Onboarding  │  │   Dashboard  │  │   Wallet     │          │
│  │    Flow      │  │   Progress   │  │  Management  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │ WebSocket/REST                       │
└────────────────────────────┼──────────────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────────────┐
│                   Backend API (Express.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Wallet     │  │   Indexing   │  │  WebSocket   │          │
│  │ Controller   │  │ Orchestrator │  │   Server     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────────────┐
│                    Indexing Engine Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  EVM Indexer │  │   Starknet   │  │     ABI      │          │
│  │   Worker     │  │    Indexer   │  │    Parser    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   PostgreSQL    │
                    │    Database     │
                    └─────────────────┘
```

### Component Interaction Flow

1. **Onboarding Flow**:
   - User enters wallet address and selects chain
   - Frontend validates address format
   - Backend creates wallet record and queues indexing job
   - User proceeds to dashboard immediately
   - Indexing starts in background worker

2. **Indexing Flow**:
   - ABI Parser extracts contract features
   - Indexer Worker fetches blocks in batches
   - Transactions decoded using ABI
   - Data normalized and stored in PostgreSQL
   - Progress updates sent via WebSocket

3. **Refresh Flow**:
   - User clicks "Refresh Data"
   - System queries last indexed block
   - Incremental indexing from last block to current
   - New data appended without duplication

## Components and Interfaces

### Frontend Components

#### 1. WalletOnboardingForm Component
```typescript
interface WalletOnboardingFormProps {
  projectId: string;
  onComplete: (walletId: string) => void;
}

interface WalletFormData {
  address: string;
  chain: ChainType;
  description?: string;
}

type ChainType = 'ethereum' | 'polygon' | 'lisk' | 'arbitrum' | 'optimism' | 'bsc' | 'starknet-mainnet' | 'starknet-sepolia';
```

**Responsibilities**:
- Render wallet address input with chain-specific validation
- Display chain selection dropdown with EVM and Starknet options
- Validate address format based on selected chain
- Submit wallet data to backend API
- Handle validation errors and display user feedback

#### 2. IndexingProgressWidget Component
```typescript
interface IndexingProgressWidgetProps {
  walletId: string;
  projectId: string;
}

interface IndexingProgress {
  status: 'queued' | 'indexing' | 'completed' | 'error';
  currentBlock: number;
  totalBlocks: number;
  transactionsFound: number;
  eventsFound: number;
  blocksPerSecond: number;
  estimatedTimeRemaining: number; // seconds
  errorMessage?: string;
}
```

**Responsibilities**:
- Connect to WebSocket for real-time updates
- Display progress bar with percentage
- Show current metrics (blocks, transactions, events)
- Calculate and display estimated time remaining
- Handle error states with retry button

#### 3. WalletListComponent
```typescript
interface WalletListProps {
  projectId: string;
}

interface WalletItem {
  id: string;
  address: string;
  chain: ChainType;
  indexingStatus: IndexingStatus;
  lastIndexedBlock: number;
  lastSyncedAt: Date;
  transactionCount: number;
  eventCount: number;
}

interface IndexingStatus {
  state: 'synced' | 'indexing' | 'error' | 'queued';
  progress?: number;
  message?: string;
}
```

**Responsibilities**:
- Display all wallets for a project
- Show indexing status badges
- Provide "Refresh Data" button per wallet
- Allow adding new wallets
- Navigate to wallet detail view

### Backend API Endpoints

#### 1. POST /api/projects/:projectId/wallets
```typescript
Request Body:
{
  address: string;
  chain: string;
  description?: string;
}

Response:
{
  status: 'success';
  data: {
    id: string;
    address: string;
    chain: string;
    indexingJobId: string;
    indexingStatus: 'queued';
  }
}
```

**Responsibilities**:
- Validate wallet address format
- Check for duplicate wallets
- Create wallet record in database
- Queue indexing job
- Return wallet ID and job ID

#### 2. GET /api/projects/:projectId/wallets/:walletId/indexing-status
```typescript
Response:
{
  status: 'success';
  data: {
    walletId: string;
    indexingStatus: 'queued' | 'indexing' | 'completed' | 'error';
    progress: {
      currentBlock: number;
      totalBlocks: number;
      transactionsFound: number;
      eventsFound: number;
      blocksPerSecond: number;
      estimatedTimeRemaining: number;
    };
    lastIndexedBlock: number;
    lastSyncedAt: string;
    errorMessage?: string;
  }
}
```

**Responsibilities**:
- Query indexing job status from database
- Calculate progress metrics
- Return current indexing state

#### 3. POST /api/projects/:projectId/wallets/:walletId/refresh
```typescript
Response:
{
  status: 'success';
  data: {
    indexingJobId: string;
    startBlock: number;
    currentBlock: number;
  }
}
```

**Responsibilities**:
- Get last indexed block for wallet
- Queue incremental indexing job
- Return job ID for progress tracking

#### 4. WebSocket /ws/indexing/:walletId
```typescript
Message Format:
{
  type: 'progress' | 'complete' | 'error';
  data: {
    walletId: string;
    currentBlock: number;
    totalBlocks: number;
    transactionsFound: number;
    eventsFound: number;
    blocksPerSecond: number;
    estimatedTimeRemaining: number;
    errorMessage?: string;
  }
}
```

**Responsibilities**:
- Establish WebSocket connection per wallet
- Stream real-time progress updates
- Handle connection lifecycle
- Implement reconnection logic

### Indexing Engine Components

#### 1. IndexingOrchestrator Service
```typescript
interface IndexingJob {
  id: string;
  walletId: string;
  projectId: string;
  address: string;
  chain: ChainType;
  startBlock: number;
  endBlock: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  priority: number;
}

class IndexingOrchestrator {
  async queueIndexingJob(job: IndexingJob): Promise<string>;
  async startIndexing(jobId: string): Promise<void>;
  async pauseIndexing(jobId: string): Promise<void>;
  async resumeIndexing(jobId: string): Promise<void>;
  async getJobStatus(jobId: string): Promise<IndexingJob>;
}
```

**Responsibilities**:
- Manage indexing job queue
- Assign jobs to appropriate indexer workers
- Handle job prioritization
- Track job lifecycle
- Emit progress events

#### 2. EVMIndexerWorker
```typescript
class EVMIndexerWorker {
  private rpcManager: AdvancedRPCManager;
  private abiParser: ABIParser;
  private signatureDatabase: SignatureDatabase;
  
  async indexWallet(
    address: string,
    chainId: number,
    startBlock: number,
    endBlock: number,
    onProgress: (progress: IndexingProgress) => void
  ): Promise<IndexingResult>;
  
  private async fetchBlockRange(fromBlock: number, toBlock: number): Promise<Transaction[]>;
  private async decodeTransaction(tx: Transaction, abi: ABI): Promise<DecodedTransaction>;
  private async storeTransactions(transactions: DecodedTransaction[]): Promise<void>;
}
```

**Responsibilities**:
- Connect to EVM RPC endpoints with failover
- Fetch transaction logs for wallet address
- Decode transactions using ABI
- Store normalized data in database
- Emit progress updates
- Handle RPC failures gracefully

#### 3. StarknetIndexerWorker
```typescript
class StarknetIndexerWorker {
  private provider: RpcProvider;
  private abiParser: ABIParser;
  
  async indexWallet(
    address: string,
    network: 'mainnet' | 'sepolia',
    startBlock: number,
    endBlock: number,
    onProgress: (progress: IndexingProgress) => void
  ): Promise<IndexingResult>;
  
  private async fetchStarknetBlocks(fromBlock: number, toBlock: number): Promise<StarknetBlock[]>;
  private async decodeStarknetTransaction(tx: StarknetTransaction): Promise<DecodedTransaction>;
  private async processInternalCalls(tx: StarknetTransaction): Promise<InternalCall[]>;
}
```

**Responsibilities**:
- Connect to Starknet RPC endpoints
- Fetch transactions and internal calls
- Decode Starknet-specific data structures
- Store data with chain_type='starknet'
- Handle Starknet-specific events

#### 4. ABIParser Service
```typescript
interface ContractFeatures {
  functions: FunctionSignature[];
  events: EventSignature[];
  customElements: CustomElement[];
}

interface FunctionSignature {
  name: string;
  selector: string;
  inputs: Parameter[];
  outputs: Parameter[];
  stateMutability: 'view' | 'pure' | 'nonpayable' | 'payable';
  category: 'swap' | 'bridge' | 'transfer' | 'custom';
}

class ABIParser {
  async parseABI(abi: string | object): Promise<ContractFeatures>;
  async extractFunctions(abi: ABI): Promise<FunctionSignature[]>;
  async extractEvents(abi: ABI): Promise<EventSignature[]>;
  async categorizeFunctions(functions: FunctionSignature[]): Promise<void>;
  async storeABIFeatures(contractAddress: string, features: ContractFeatures): Promise<void>;
}
```

**Responsibilities**:
- Parse contract ABI (JSON or human-readable)
- Extract function signatures and selectors
- Extract event signatures and topics
- Categorize functions (swap, bridge, transfer, etc.)
- Store ABI features in database for decoding

## Data Models

### Database Schema

#### wallets Table
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  address VARCHAR(66) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  chain_type VARCHAR(20) NOT NULL DEFAULT 'evm', -- 'evm' or 'starknet'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_indexed_block BIGINT DEFAULT 0,
  last_synced_at TIMESTAMP,
  total_transactions INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, address, chain)
);

CREATE INDEX idx_wallets_project ON wallets(project_id);
CREATE INDEX idx_wallets_address ON wallets(address);
CREATE INDEX idx_wallets_chain ON wallets(chain);
```

#### indexing_jobs Table
```sql
CREATE TABLE indexing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'paused'
  start_block BIGINT NOT NULL,
  end_block BIGINT NOT NULL,
  current_block BIGINT DEFAULT 0,
  transactions_found INTEGER DEFAULT 0,
  events_found INTEGER DEFAULT 0,
  blocks_per_second DECIMAL(10,2) DEFAULT 0,
  error_message TEXT,
  priority INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_indexing_jobs_wallet ON indexing_jobs(wallet_id);
CREATE INDEX idx_indexing_jobs_status ON indexing_jobs(status);
CREATE INDEX idx_indexing_jobs_priority ON indexing_jobs(priority DESC);
```

#### contract_abi_features Table
```sql
CREATE TABLE contract_abi_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address VARCHAR(66) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  feature_type VARCHAR(20) NOT NULL, -- 'function', 'event', 'custom'
  name VARCHAR(255) NOT NULL,
  signature TEXT NOT NULL,
  selector VARCHAR(10),
  category VARCHAR(50), -- 'swap', 'bridge', 'transfer', 'custom'
  inputs JSONB,
  outputs JSONB,
  state_mutability VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(contract_address, chain, selector)
);

CREATE INDEX idx_abi_features_contract ON contract_abi_features(contract_address);
CREATE INDEX idx_abi_features_selector ON contract_abi_features(selector);
CREATE INDEX idx_abi_features_category ON contract_abi_features(category);
```

#### wallet_transactions Table (Unified for EVM and Starknet)
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  chain VARCHAR(50) NOT NULL,
  chain_type VARCHAR(20) NOT NULL DEFAULT 'evm',
  transaction_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  from_address VARCHAR(66) NOT NULL,
  to_address VARCHAR(66),
  value_eth DECIMAL(36,18) DEFAULT 0,
  gas_used BIGINT,
  gas_price BIGINT,
  function_selector VARCHAR(10),
  function_name VARCHAR(255),
  function_category VARCHAR(50),
  decoded_params JSONB,
  transaction_status INTEGER,
  is_contract_interaction BOOLEAN DEFAULT false,
  direction VARCHAR(10), -- 'incoming', 'outgoing', 'internal'
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet_id, chain, transaction_hash)
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_block ON wallet_transactions(block_number);
CREATE INDEX idx_wallet_tx_function ON wallet_transactions(function_name);
CREATE INDEX idx_wallet_tx_contract_interaction ON wallet_transactions(is_contract_interaction);
```

#### wallet_events Table
```sql
CREATE TABLE wallet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_hash VARCHAR(66) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  chain_type VARCHAR(20) NOT NULL DEFAULT 'evm',
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  event_signature VARCHAR(66),
  event_name VARCHAR(255) NOT NULL,
  contract_address VARCHAR(66) NOT NULL,
  decoded_params JSONB NOT NULL,
  log_index INTEGER NOT NULL,
  raw_topics TEXT[],
  raw_data TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet_id, chain, transaction_hash, log_index)
);

CREATE INDEX idx_wallet_events_wallet ON wallet_events(wallet_id);
CREATE INDEX idx_wallet_events_name ON wallet_events(event_name);
CREATE INDEX idx_wallet_events_block ON wallet_events(block_number);
CREATE INDEX idx_wallet_events_contract ON wallet_events(contract_address);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Address validation consistency
*For any* wallet address and chain selection, if the address format matches the chain's expected format (42 chars for EVM, 64+ for Starknet), then validation should succeed, and if the format does not match, validation should fail
**Validates: Requirements 1.2, 2.2, 2.3**

### Property 2: Indexing job creation
*For any* valid wallet submission, creating a wallet should result in exactly one indexing job being queued with status 'queued'
**Validates: Requirements 1.4, 5.4**

### Property 3: Progress update monotonicity
*For any* indexing job, the current_block value should never decrease during active indexing, and should always be between start_block and end_block inclusive
**Validates: Requirements 3.2, 3.3, 9.1**

### Property 4: Transaction uniqueness
*For any* wallet and chain combination, no two transactions should have the same transaction_hash, ensuring no duplicate data
**Validates: Requirements 4.4, 6.4**

### Property 5: ABI parsing completeness
*For any* valid contract ABI, parsing should extract all functions and events, and each function should be assigned a category
**Validates: Requirements 8.1, 8.2**

### Property 6: Chain type detection
*For any* wallet address, if the address length is 42 characters and starts with '0x', it should be classified as 'evm', and if length is 64+ characters, it should be classified as 'starknet'
**Validates: Requirements 7.2, 7.3, 7.4**

### Property 7: Incremental indexing correctness
*For any* refresh operation, the start_block should equal last_indexed_block + 1, and no blocks should be skipped or re-indexed
**Validates: Requirements 6.2, 6.4**

### Property 8: RPC failover preservation
*For any* RPC endpoint failure during indexing, switching to a fallback RPC should resume from the same block without data loss or duplication
**Validates: Requirements 11.1, 11.3, 11.5**

### Property 9: Multi-wallet isolation
*For any* two wallets belonging to different projects, their transaction data should be completely isolated with no cross-contamination
**Validates: Requirements 5.4, 10.3**

### Property 10: Progress calculation accuracy
*For any* indexing job, the progress percentage should equal (current_block - start_block) / (end_block - start_block) * 100, and should never exceed 100%
**Validates: Requirements 3.2, 9.1**

### Property 11: WebSocket message ordering
*For any* sequence of progress updates sent via WebSocket, messages should arrive in chronological order based on current_block values
**Validates: Requirements 3.2, 3.3**

### Property 12: Status badge accuracy
*For any* wallet, the displayed status badge should accurately reflect the most recent indexing job status from the database
**Validates: Requirements 12.2, 12.3, 12.4, 12.5**

## Error Handling

### Frontend Error Handling

1. **Address Validation Errors**
   - Display inline error message below address input
   - Highlight input field in red
   - Provide format examples for selected chain
   - Prevent form submission until valid

2. **Network Errors**
   - Show toast notification for API failures
   - Implement retry button with exponential backoff
   - Cache form data to prevent loss
   - Display user-friendly error messages

3. **WebSocket Connection Errors**
   - Automatically attempt reconnection (max 5 attempts)
   - Fall back to polling if WebSocket unavailable
   - Display connection status indicator
   - Queue missed updates for replay on reconnect

### Backend Error Handling

1. **Database Errors**
   - Wrap all database operations in try-catch
   - Log errors with context (wallet ID, operation)
   - Return appropriate HTTP status codes
   - Implement transaction rollback for failed operations

2. **RPC Endpoint Failures**
   - Maintain list of fallback RPCs per chain
   - Automatically switch on timeout or error
   - Implement exponential backoff for retries
   - Mark failed RPCs as unhealthy temporarily

3. **Indexing Job Failures**
   - Update job status to 'failed' with error message
   - Store last successful block for resume
   - Emit error event via WebSocket
   - Allow manual retry from dashboard

4. **Rate Limiting**
   - Detect rate limit responses (429 status)
   - Implement adaptive rate limiting
   - Pause indexing with exponential backoff
   - Switch to alternative RPC if available

### Indexing Engine Error Handling

1. **Block Fetch Failures**
   - Retry failed block fetches up to 3 times
   - Skip problematic blocks after max retries
   - Log skipped blocks for manual review
   - Continue indexing subsequent blocks

2. **Transaction Decode Failures**
   - Store raw transaction data even if decode fails
   - Mark transaction as 'decode_failed'
   - Log decode errors with transaction hash
   - Allow re-processing with updated ABI

3. **ABI Parse Failures**
   - Validate ABI format before parsing
   - Return detailed error messages
   - Suggest common ABI format issues
   - Allow manual ABI correction

## Testing Strategy

### Unit Testing

**Test Coverage Areas**:
- Address validation functions for all supported chains
- ABI parsing logic for various ABI formats
- Transaction decoding with different function signatures
- Progress calculation formulas
- Chain type detection logic
- Database query functions

**Example Unit Tests**:
```typescript
describe('Address Validation', () => {
  test('should validate EVM address format', () => {
    expect(validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'ethereum')).toBe(true);
  });
  
  test('should reject invalid EVM address', () => {
    expect(validateAddress('invalid', 'ethereum')).toBe(false);
  });
  
  test('should validate Starknet address format', () => {
    expect(validateAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', 'starknet-mainnet')).toBe(true);
  });
});

describe('ABI Parser', () => {
  test('should extract all functions from ABI', () => {
    const abi = [/* ERC20 ABI */];
    const features = parseABI(abi);
    expect(features.functions).toHaveLength(9);
  });
  
  test('should categorize swap functions correctly', () => {
    const func = { name: 'swapExactTokensForTokens', /* ... */ };
    expect(categorizeFunction(func)).toBe('swap');
  });
});
```

### Property-Based Testing

**Property Test Framework**: fast-check (for TypeScript/JavaScript)

**Property Tests**:

1. **Property 1: Address validation consistency**
   - Generate random addresses of varying lengths
   - Test that 42-char hex addresses validate for EVM
   - Test that 64+ char hex addresses validate for Starknet
   - Test that invalid formats always fail

2. **Property 4: Transaction uniqueness**
   - Generate random transaction sets
   - Insert into database
   - Verify no duplicates exist for same wallet/chain/hash

3. **Property 7: Incremental indexing correctness**
   - Generate random last_indexed_block values
   - Verify refresh always starts at last_indexed_block + 1
   - Verify no block gaps in indexed data

4. **Property 10: Progress calculation accuracy**
   - Generate random start/end/current block values
   - Calculate progress percentage
   - Verify result is always between 0-100%
   - Verify formula correctness

**Example Property Tests**:
```typescript
import fc from 'fast-check';

describe('Property: Address Validation Consistency', () => {
  it('should validate all 42-character hex strings as EVM addresses', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 40, maxLength: 40 }),
        (hexStr) => {
          const address = '0x' + hexStr;
          expect(validateAddress(address, 'ethereum')).toBe(true);
        }
      )
    );
  });
});

describe('Property: Progress Calculation Accuracy', () => {
  it('should always return progress between 0-100%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        (start, end, current) => {
          fc.pre(start <= end); // Precondition
          const adjustedCurrent = Math.max(start, Math.min(current, end));
          const progress = calculateProgress(start, end, adjustedCurrent);
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        }
      )
    );
  });
});
```

### Integration Testing

**Test Scenarios**:
1. End-to-end wallet onboarding flow
2. Real-time progress updates via WebSocket
3. Incremental refresh from last block
4. Multi-wallet management for single project
5. RPC failover during active indexing
6. Database transaction rollback on errors

**Example Integration Test**:
```typescript
describe('Wallet Onboarding Integration', () => {
  it('should complete full onboarding flow', async () => {
    // 1. Create project
    const project = await createTestProject();
    
    // 2. Submit wallet
    const wallet = await submitWallet(project.id, {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: 'ethereum'
    });
    
    // 3. Verify indexing job created
    const job = await getIndexingJob(wallet.id);
    expect(job.status).toBe('queued');
    
    // 4. Wait for indexing to start
    await waitForJobStatus(job.id, 'running');
    
    // 5. Verify progress updates
    const progress = await getIndexingProgress(wallet.id);
    expect(progress.currentBlock).toBeGreaterThan(0);
    
    // 6. Wait for completion
    await waitForJobStatus(job.id, 'completed');
    
    // 7. Verify data in database
    const transactions = await getWalletTransactions(wallet.id);
    expect(transactions.length).toBeGreaterThan(0);
  });
});
```

### Manual Testing Checklist

- [ ] Test onboarding with various EVM chains
- [ ] Test onboarding with Starknet mainnet and sepolia
- [ ] Verify real-time progress updates display correctly
- [ ] Test refresh functionality with up-to-date wallet
- [ ] Test refresh functionality with outdated wallet
- [ ] Verify multi-wallet support (add 3+ wallets)
- [ ] Test error handling with invalid addresses
- [ ] Test error handling with network failures
- [ ] Verify WebSocket reconnection after disconnect
- [ ] Test dashboard displays correct status badges
- [ ] Verify data isolation between projects
- [ ] Test with large wallets (1000+ transactions)
