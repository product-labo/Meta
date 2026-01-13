# Multi-Chain Smart Contract Analytics Implementation Plan

## Project Overview
Build a comprehensive data analytics platform that fetches and stores blockchain data from EVM, Starknet, and Beacon Chain using Apibara indexers. Focus on smart contract interactions, function signatures, and wallet analytics.

## Data Architecture

### Database Schema Design

```typescript
// Core entities
export const chains = pgTable("chains", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"), // 'ethereum', 'starknet', 'beacon'
  chainId: bigint("chain_id", { mode: "number" }),
  isActive: boolean("is_active").default(true)
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"), // 'nft', 'dex', 'defi', 'gaming', 'dao'
  description: text("description")
});

export const smartContracts = pgTable("smart_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  chainId: uuid("chain_id").references(() => chains.id),
  categoryId: uuid("category_id").references(() => categories.id),
  address: text("address"),
  name: text("name"),
  symbol: text("symbol"),
  deploymentBlock: bigint("deployment_block", { mode: "number" }),
  deploymentTx: text("deployment_tx"),
  createdAt: timestamp("created_at").defaultNow()
});

export const functionSignatures = pgTable("function_signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => smartContracts.id),
  signature: text("signature"), // "0x12345678"
  functionName: text("function_name"), // "transfer"
  abi: jsonb("abi"), // Full ABI definition
  isActive: boolean("is_active").default(true)
});

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  address: text("address"),
  firstSeen: timestamp("first_seen"),
  lastSeen: timestamp("last_seen"),
  totalTransactions: bigint("total_transactions", { mode: "number" }).default(0)
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  chainId: uuid("chain_id").references(() => chains.id),
  contractId: uuid("contract_id").references(() => smartContracts.id),
  functionSigId: uuid("function_sig_id").references(() => functionSignatures.id),
  fromWalletId: uuid("from_wallet_id").references(() => wallets.id),
  toWalletId: uuid("to_wallet_id").references(() => wallets.id),
  hash: text("hash"),
  blockNumber: bigint("block_number", { mode: "number" }),
  blockHash: text("block_hash"),
  transactionIndex: integer("transaction_index"),
  gasUsed: bigint("gas_used", { mode: "number" }),
  gasPrice: bigint("gas_price", { mode: "number" }),
  value: text("value"), // Store as string for precision
  status: text("status"), // 'succeeded', 'reverted'
  timestamp: timestamp("timestamp"),
  inputData: text("input_data"),
  rawData: jsonb("raw_data") // Full transaction object
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  contractId: uuid("contract_id").references(() => smartContracts.id),
  eventName: text("event_name"),
  eventSignature: text("event_signature"),
  logIndex: integer("log_index"),
  topics: jsonb("topics"),
  data: text("data"),
  decodedData: jsonb("decoded_data")
});

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  cumulativeGasUsed: bigint("cumulative_gas_used", { mode: "number" }),
  effectiveGasPrice: bigint("effective_gas_price", { mode: "number" }),
  contractAddress: text("contract_address"),
  logsBloom: text("logs_bloom"),
  rawData: jsonb("raw_data")
});
```

## Implementation Timeline

### Phase 1: Infrastructure Setup (Week 1)
**Objectives:**
- Set up development environment
- Configure database and indexer architecture
- Establish monitoring and logging

**Tasks:**
1. **Database Setup**
   - Install PostgreSQL with Drizzle ORM
   - Create all tables with proper indexes
   - Set up connection pooling
   - Configure backup strategy

2. **Indexer Architecture**
   - Set up three separate indexers (EVM, Starknet, Beacon)
   - Configure shared database with chain identification
   - Docker containerization for all services
   - Set up environment variables and secrets management

3. **Development Environment**
   - Set up local development stack
   - Configure CI/CD pipeline
   - Set up code quality tools (ESLint, Prettier)

### Phase 2: Smart Contract Discovery (Week 2)
**Objectives:**
- Identify and categorize target smart contracts
- Build contract metadata database
- Set up ABI management system

**Tasks:**
1. **Contract Identification**
   - Research popular contract addresses per category
   - Set up ABI fetching from Etherscan/4byte directory
   - Build function signature extraction pipeline
   - Create contract verification system

2. **Category Classification**
   - Manual categorization of major protocols (Uniswap, AAVE, OpenSea, etc.)
   - Implement pattern-based auto-classification
   - Set up community-driven tagging system
   - Create category management interface

3. **ABI Management**
   - Build ABI storage and versioning system
   - Set up automatic ABI updates
   - Create function signature database
   - Implement ABI validation

### Phase 3: Historical Data Ingestion (Week 3-4)
**Objectives:**
- Backfill 1 month of historical data
- Implement efficient batch processing
- Set up data validation and quality checks

**Tasks:**
1. **Backfill Strategy**
   - Start from 1 month ago (configurable)
   - Process in chunks (1000 blocks per batch)
   - Implement parallel processing per chain
   - Set up progress tracking and resumption

2. **Function Signature Matching**
   ```typescript
   // Extract function selector from transaction input
   const functionSelector = transaction.input.slice(0, 10);
   const matchedSignature = await db.query.functionSignatures.findFirst({
     where: eq(functionSignatures.signature, functionSelector)
   });
   ```

3. **Data Processing Pipeline**
   - Transaction analysis and categorization
   - Event log parsing and decoding
   - Wallet interaction tracking
   - Data validation and error handling

### Phase 4: Real-time Processing (Week 5)
**Objectives:**
- Switch to real-time data streaming
- Implement live analytics capabilities
- Set up alerting and monitoring

**Tasks:**
1. **Live Data Streaming**
   - Switch to real-time mode after backfill completion
   - Implement chain reorganization handling
   - Set up event-driven processing
   - Configure real-time data validation

2. **Data Enrichment**
   - Decode function calls using ABI
   - Extract meaningful parameters from transactions
   - Calculate derived metrics and aggregations
   - Implement data quality scoring

## Indexer Implementation

### EVM Indexer
```typescript
export default defineIndexer(EvmStream)({
  streamUrl: "https://mainnet.ethereum.a5a.ch",
  filter: {
    header: "always",
    transactions: [{ to: trackedContracts }],
    logs: [{ address: trackedContracts }]
  },
  plugins: [drizzleStorage({ db })],
  async transform({ block }) {
    const { db } = useDrizzleStorage();
    
    for (const tx of block.transactions) {
      // Extract function signature
      const funcSig = tx.input.slice(0, 10);
      
      // Match against known contracts
      const contract = await findContractByAddress(tx.to);
      const signature = await findFunctionSignature(funcSig);
      
      if (contract && signature) {
        await storeTransactionData(db, tx, contract, signature);
      }
    }
  }
});
```

### Starknet Indexer
```typescript
export default defineIndexer(StarknetStream)({
  streamUrl: "https://mainnet.starknet.a5a.ch",
  filter: {
    header: "always",
    events: [{ address: trackedContracts }],
    transactions: [{ contractAddress: trackedContracts }]
  },
  plugins: [drizzleStorage({ db })],
  async transform({ block }) {
    const { db } = useDrizzleStorage();
    
    for (const event of block.events) {
      const contract = await findStarknetContract(event.address);
      if (contract) {
        await storeStarknetEvent(db, event, contract);
      }
    }
  }
});
```

### Beacon Chain Indexer
```typescript
export default defineIndexer(BeaconChainStream)({
  streamUrl: "https://mainnet.beacon.a5a.ch",
  filter: {
    header: "always",
    transactions: "always",
    validators: "always"
  },
  plugins: [drizzleStorage({ db })],
  async transform({ block }) {
    const { db } = useDrizzleStorage();
    
    // Process execution payload transactions
    for (const tx of block.transactions) {
      await processBeaconTransaction(db, tx);
    }
    
    // Process validator data
    for (const validator of block.validators) {
      await updateValidatorData(db, validator);
    }
  }
});
```

## Data Processing Pipeline

### 1. Transaction Analysis
- Extract function selector from input data (first 4 bytes)
- Match against known function signatures database
- Decode parameters using stored ABI
- Classify transaction by contract category

### 2. Event Processing
- Parse event logs from transaction receipts
- Decode event data using ABI
- Link events to originating transactions
- Extract meaningful business logic data

### 3. Wallet Tracking
- Track unique wallet interactions per contract
- Update interaction counts and timestamps
- Calculate wallet behavior metrics
- Identify whale wallets and power users

### 4. Data Enrichment
- Add USD values using price feeds
- Calculate gas costs in USD
- Add transaction success/failure context
- Generate derived analytics metrics

## Query Capabilities

### Analytics Queries
```sql
-- Top contracts by interaction volume
SELECT c.name, c.address, COUNT(t.id) as interactions
FROM smart_contracts c
JOIN transactions t ON c.id = t.contract_id
WHERE t.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY c.id ORDER BY interactions DESC;

-- Function signature popularity
SELECT fs.function_name, COUNT(t.id) as calls
FROM function_signatures fs
JOIN transactions t ON fs.id = t.function_sig_id
GROUP BY fs.id ORDER BY calls DESC;

-- Cross-chain activity comparison
SELECT ch.name, COUNT(t.id) as transactions
FROM chains ch
JOIN transactions t ON ch.id = t.chain_id
GROUP BY ch.id;

-- Wallet interaction patterns
SELECT w.address, COUNT(DISTINCT t.contract_id) as unique_contracts,
       COUNT(t.id) as total_transactions
FROM wallets w
JOIN transactions t ON w.id = t.from_wallet_id
GROUP BY w.id ORDER BY unique_contracts DESC;
```

## Deployment Strategy

### Infrastructure Requirements
- **Database**: PostgreSQL 15+ with 1TB+ storage
- **Memory**: 32GB+ RAM for indexers
- **CPU**: 8+ cores for parallel processing
- **Network**: High-bandwidth connection for real-time streaming

### Container Architecture
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: blockchain_analytics
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  evm-indexer:
    build: ./indexers/evm
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/blockchain_analytics
  
  starknet-indexer:
    build: ./indexers/starknet
    depends_on: [postgres]
  
  beacon-indexer:
    build: ./indexers/beacon
    depends_on: [postgres]
  
  redis:
    image: redis:7
    
  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
```

### Production Deployment
- **Kubernetes** cluster for auto-scaling
- **Redis** for caching frequently accessed data
- **Grafana** + **Prometheus** for monitoring
- **Elasticsearch** for log aggregation

## Data Volume Estimates

### Storage Requirements
- **1 month Ethereum**: ~2M transactions, ~10M events
- **1 month Starknet**: ~500K transactions, ~2M events  
- **1 month Beacon**: ~200K blocks, ~5M validator updates
- **Total Storage**: ~500GB for comprehensive data with indexes

### Processing Time
- **Initial Backfill**: 24-48 hours for 1 month of data
- **Real-time Processing**: <1 second latency
- **Query Performance**: <100ms for most analytics queries

## Monitoring & Alerts

### Key Metrics
- Block processing lag (should be <10 blocks behind)
- Transaction parsing success rate (>99%)
- Database query performance
- Memory and CPU usage
- Failed indexer restarts

### Alert Conditions
- Indexer stops processing for >5 minutes
- Database connection failures
- Disk space usage >80%
- Query response time >1 second
- Chain reorganization events

### Logging Strategy
- Structured JSON logging
- Centralized log aggregation
- Error tracking with stack traces
- Performance metrics collection

## Security Considerations

### Data Protection
- Encrypt sensitive data at rest
- Use connection pooling with SSL
- Implement rate limiting on APIs
- Regular security audits

### Access Control
- Role-based database access
- API authentication and authorization
- Network security groups
- Regular credential rotation

## Future Enhancements

### Phase 2 Features
- Real-time alerting system
- Advanced analytics dashboard
- Machine learning for fraud detection
- Cross-chain bridge tracking

### Scalability Improvements
- Horizontal indexer scaling
- Database sharding by chain
- CDN for static data
- GraphQL API layer

## Success Metrics

### Technical KPIs
- 99.9% uptime for indexers
- <1 second query response time
- 100% data accuracy
- <10 block processing lag

### Business KPIs
- Track 1000+ smart contracts
- Process 1M+ transactions/day
- Support 10+ DeFi categories
- Enable 100+ unique analytics queries

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-29  
**Next Review**: 2025-01-05
