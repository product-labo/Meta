# Starknet RPC Query System - Status & Scaling Plan

## ✅ WHAT'S WORKING

### Core Infrastructure
- **Database**: PostgreSQL with 562 blocks, 3,238 transactions
- **RPC Client**: Successfully fetches blocks and transaction receipts
- **Real-time Sync**: Continuously indexes new blocks every 10-30 seconds
- **Historical Sync**: Processes blocks in chunks (tested with 75 blocks)
- **Data Storage**: Blocks and transactions stored correctly

### Contract Identification
- **Event Analysis**: Successfully identifies ERC20 tokens via Transfer events
- **Activity Patterns**: Identifies high-activity contracts (250+ transactions)
- **Transaction Receipts**: RPC calls work for `starknet_getTransactionReceipt`
- **Pattern Recognition**: Can distinguish DEX/DeFi protocols from activity

### Commands & Operations
```bash
# Start indexer
npm run dev &

# Historical sync
npx ts-node --transpile-only historical-sync.ts &

# Monitor database
./monitor_db.sh

# Stop everything
pkill -f "ts-node"
```

## ❌ WHAT NEEDS FIXING

### Event Processing
- **Issue**: Events table has foreign key constraints preventing full event storage
- **Current**: Only 1 test event stored despite capturing many events
- **Fix Needed**: Remove/modify foreign key constraints or create proper contract records first

### Contract Detection
- **Issue**: 0 contracts in database despite having DEPLOY_ACCOUNT transactions
- **Current**: Contract processing logic exists but not storing properly
- **Fix Needed**: Fix contract insertion logic and handle INVOKE-based contract discovery

### RPC Limitations
- **Issue**: `starknet_getClassHashAt` and `starknet_getClass` calls fail
- **Current**: "Invalid params" errors on contract class queries
- **Fix Needed**: Either fix RPC parameter format or use alternative identification methods

### Database Schema Mismatches
- **Issue**: Events table expects `contract_address` FK but we have `from_address`
- **Issue**: Some BigInt/Date conversions cause insertion failures
- **Fix Needed**: Align database schema with actual Starknet data structure

## 🚀 HOW TO SCALE THIS

### Phase 1: Fix Core Issues (1-2 days)
```sql
-- Fix events table constraints
ALTER TABLE events DROP CONSTRAINT events_contract_address_fkey;
ALTER TABLE events ADD COLUMN from_address VARCHAR(66);
ALTER TABLE events ADD COLUMN event_keys TEXT;
ALTER TABLE events ADD COLUMN event_data TEXT;
```

```typescript
// Fix event processing in HistoricalDataFetcher.ts
for (const event of tx.events) {
  await client.query(`
    INSERT INTO events (tx_hash, block_number, from_address, event_keys, event_data)
    VALUES ($1, $2, $3, $4, $5)
  `, [
    tx.txHash,
    Number(block.blockNumber),
    event.fromAddress,
    JSON.stringify(event.keys),
    JSON.stringify(event.data)
  ]);
}
```

### Phase 2: Enhanced Contract Discovery (2-3 days)
```typescript
// Add contract identification service
class ContractIdentificationService {
  async identifyContract(address: string): Promise<ContractInfo> {
    // 1. Analyze event signatures
    // 2. Check transaction patterns
    // 3. Test common interface functions
    // 4. Store contract metadata
  }
}
```

### Phase 3: Performance Optimization (3-5 days)
```typescript
// Batch processing improvements
const BATCH_SIZE = 1000; // Increase from 50
const PARALLEL_WORKERS = 5; // Process multiple blocks simultaneously

// Add caching layer
class RPCCache {
  private cache = new Map();
  async getWithCache(method: string, params: any[]) {
    // Cache frequently accessed data
  }
}
```

### Phase 4: Advanced Analytics (1 week)
```sql
-- Add analytics tables
CREATE TABLE contract_analytics (
  contract_address VARCHAR(66) PRIMARY KEY,
  contract_type VARCHAR(50),
  daily_transactions INTEGER,
  total_volume BIGINT,
  first_seen TIMESTAMP,
  last_activity TIMESTAMP
);

CREATE TABLE wallet_analytics (
  wallet_address VARCHAR(66) PRIMARY KEY,
  transaction_count INTEGER,
  contracts_interacted INTEGER,
  total_gas_used BIGINT,
  activity_score DECIMAL
);
```

### Phase 5: Horizontal Scaling (1-2 weeks)
```yaml
# Docker Compose scaling
version: '3.8'
services:
  indexer-1:
    image: starknet-indexer
    environment:
      - WORKER_ID=1
      - BLOCK_RANGE=1-1000000
  
  indexer-2:
    image: starknet-indexer
    environment:
      - WORKER_ID=2
      - BLOCK_RANGE=1000001-2000000
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=starknet_cluster
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 📊 SCALING TARGETS

### Short Term (1 month)
- **Blocks**: 100,000+ blocks indexed
- **Events**: Full event processing (10,000+ events)
- **Contracts**: 1,000+ identified contracts
- **Performance**: 100 blocks/minute processing speed

### Medium Term (3 months)
- **Coverage**: Complete 6-month blockchain history
- **Real-time**: <5 second lag from network
- **Analytics**: Contract classification, wallet scoring
- **API**: REST API for external access

### Long Term (6 months)
- **Multi-node**: Distributed processing across 3+ nodes
- **Advanced Analytics**: DeFi TVL tracking, MEV detection
- **Machine Learning**: Automated contract classification
- **Enterprise**: Support for 10+ concurrent API users

## 🛠️ IMMEDIATE ACTION ITEMS

1. **Fix Events** (Priority 1)
   ```bash
   # Run this SQL to fix events table
   psql -h localhost -U david_user -d david -c "ALTER TABLE events DROP CONSTRAINT IF EXISTS events_contract_address_fkey;"
   ```

2. **Update Event Processing** (Priority 1)
   - Modify `HistoricalDataFetcher.ts` event insertion
   - Test with recent transactions

3. **Contract Processing** (Priority 2)
   - Fix contract insertion logic
   - Add contract type detection

4. **Performance Testing** (Priority 3)
   - Benchmark current throughput
   - Identify bottlenecks

## 📈 SUCCESS METRICS

- **Data Quality**: >99% successful block processing
- **Performance**: >50 blocks/minute sustained
- **Coverage**: <1 hour lag from network head
- **Reliability**: >99.9% uptime
- **Scalability**: Linear performance with added resources

---

**Current Status**: Foundation is solid, core functionality works, ready for optimization and scaling! 🚀
