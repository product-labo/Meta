# Schema Changes Summary

## Required Changes Applied

### 1. ✅ Add chain_id Everywhere

**Purpose**: Enable multi-chain support across all tables

**Tables Updated**:
- `transactions` - Added `chain_id` FK to `chain_config`
- `events` - Added `chain_id` FK to `chain_config`
- `accounts` - Added `chain_id` FK to `chain_config` with UNIQUE(address, chain_id)
- `account_state_snapshots` - Added `chain_id` FK to `chain_config`
- `account_state_deltas` - Added `chain_id` FK to `chain_config`
- `token_balances` - Added `chain_id` FK to `chain_config`, updated PK to (chain_id, address, block_height)
- `token_locks` - Added `chain_id` FK to `chain_config`
- `transaction_accounts` - Added `chain_id` FK to `chain_config`
- `raw_rpc_responses` - Added `chain_id` FK to `chain_config`

**Benefits**:
- Full multi-chain isolation
- Prevents data mixing between chains
- Enables chain-specific queries
- Supports independent chain management

---

### 2. ✅ Add is_active to token_locks

**Purpose**: Track lock lifecycle without deleting historical data

**Schema Change**:
```sql
ALTER TABLE token_locks 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_token_locks_is_active ON token_locks(is_active);
```

**Behavior**:
- `is_active = true` - Lock is currently active, balance is locked
- `is_active = false` - Lock has been released/expired, kept for history

**Benefits**:
- Historical tracking of all locks
- No data loss on lock release
- Audit trail for lock lifecycle
- Query active locks: `WHERE is_active = true`
- Query lock history: `WHERE is_active = false`

**Updated Requirement**: 10.9 - "WHEN a lock is released, THE Lisk_Indexer SHALL set is_active to false (not delete the record)"

---

### 3. ✅ Enforce Snapshot Uniqueness

**Purpose**: Prevent duplicate state snapshots for the same account/module/height

**Schema Change**:
```sql
-- Updated UNIQUE constraint
UNIQUE(chain_id, address, block_height, module)
```

**Previous**: `UNIQUE(address, block_height, module)`
**New**: `UNIQUE(chain_id, address, block_height, module)`

**Benefits**:
- Prevents duplicate snapshots
- Ensures one snapshot per account/module/height/chain
- Database-level enforcement
- Idempotent re-indexing support

**Impact**:
- INSERT will fail if duplicate snapshot attempted
- Use UPSERT (INSERT ... ON CONFLICT) for idempotent operations
- Guarantees data integrity

---

### 4. ✅ Ensure Events Drive Receiver Detection

**Purpose**: Extract receiver addresses from event data, not just transaction params

**Implementation**:

**Events Table Enhancement**:
- Added documentation on receiver detection
- Events are primary source for receiver addresses

**Transaction Accounts Table Enhancement**:
- Added receiver detection logic documentation
- Specified event patterns for common modules

**Event Patterns for Receiver Detection**:
```javascript
// token.transfer event
{
  module: 'token',
  name: 'transfer',
  data: {
    senderAddress: '...',
    recipientAddress: '...',  // ← Extract receiver
    amount: '...'
  }
}

// token.transferCrossChain event
{
  module: 'token',
  name: 'transferCrossChain',
  data: {
    senderAddress: '...',
    recipientAddress: '...',  // ← Extract receiver
    receivingChainID: '...'
  }
}

// pos.delegate event
{
  module: 'pos',
  name: 'delegate',
  data: {
    delegatorAddress: '...',
    delegateAddress: '...',  // ← Extract validator
    amount: '...'
  }
}
```

**Processing Logic**:
1. Index transaction → Create sender account + sender role
2. Index events → Parse event data
3. Extract receiver/recipient addresses from event data
4. Create account records for receivers (if not exists)
5. Create transaction_accounts entries with role='receiver'
6. Update last_seen_height for receiver accounts

**Benefits**:
- Accurate receiver tracking
- Supports all transaction types
- Handles cross-chain transfers
- Captures validator/delegate relationships
- Event-driven architecture

**Updated Requirement**: 11.8 - "WHEN processing events, THE Lisk_Indexer SHALL extract receiver addresses from event data and create receiver role relationships"

---

## Summary of Changes

| Change | Tables Affected | Impact |
|--------|----------------|--------|
| Add chain_id | 9 tables | Multi-chain support |
| Add is_active | token_locks | Historical tracking |
| Enforce uniqueness | account_state_snapshots | Data integrity |
| Event-driven receivers | events, transaction_accounts | Accurate relationships |

---

## Migration Impact

### Existing Data Migration

**For chain_id addition**:
```sql
-- Set default chain_id for existing data
UPDATE transactions SET chain_id = 1135 WHERE chain_id IS NULL;
UPDATE events SET chain_id = 1135 WHERE chain_id IS NULL;
UPDATE accounts SET chain_id = 1135 WHERE chain_id IS NULL;
-- ... repeat for all tables
```

**For is_active addition**:
```sql
-- All existing locks are active
UPDATE token_locks SET is_active = true WHERE is_active IS NULL;
```

**For snapshot uniqueness**:
```sql
-- Remove any duplicate snapshots (keep most recent)
DELETE FROM account_state_snapshots a
USING account_state_snapshots b
WHERE a.snapshot_id < b.snapshot_id
  AND a.chain_id = b.chain_id
  AND a.address = b.address
  AND a.block_height = b.block_height
  AND a.module = b.module;
```

**For receiver detection**:
```sql
-- Re-process events to extract receivers
-- This requires re-running the indexer with event parsing logic
```

---

## Testing Requirements

### New Property Tests

**Property 61: Chain ID Consistency**
*For any* record across all tables, the chain_id should reference a valid chain in chain_config.

**Property 62: Token Lock Active State**
*For any* token lock, if is_active = true, the lock should contribute to locked_balance; if false, it should not.

**Property 63: Snapshot Uniqueness Enforcement**
*For any* two snapshots with the same (chain_id, address, block_height, module), attempting to insert both should result in the second being rejected.

**Property 64: Event-Driven Receiver Detection**
*For any* transaction with transfer events, receiver addresses extracted from events should have corresponding transaction_accounts entries with role='receiver'.

---

## Performance Considerations

### New Indexes

All chain_id columns have indexes for efficient filtering:
```sql
CREATE INDEX idx_transactions_chain_id ON transactions(chain_id);
CREATE INDEX idx_events_chain_id ON events(chain_id);
CREATE INDEX idx_accounts_chain_id ON accounts(chain_id);
CREATE INDEX idx_token_locks_is_active ON token_locks(is_active);
-- ... etc
```

### Query Patterns

**Multi-chain queries**:
```sql
-- Get transactions for specific chain
SELECT * FROM transactions WHERE chain_id = 1135;

-- Get active locks for address on chain
SELECT * FROM token_locks 
WHERE chain_id = 1135 
  AND address = 'lsk...' 
  AND is_active = true;

-- Get receivers from events
SELECT DISTINCT ta.address
FROM transaction_accounts ta
WHERE ta.chain_id = 1135 
  AND ta.role = 'receiver';
```

---

## Backward Compatibility

### Breaking Changes

1. **Primary Key Changes**:
   - `token_balances`: PK changed from `(address, block_height)` to `(chain_id, address, block_height)`
   - Requires data migration and index rebuild

2. **Unique Constraint Changes**:
   - `account_state_snapshots`: UNIQUE changed to include `chain_id`
   - May require duplicate removal

3. **New Required Fields**:
   - All tables now require `chain_id`
   - Existing data needs default chain_id

### Non-Breaking Changes

1. **is_active field**: Added with DEFAULT true, existing data unaffected
2. **Receiver detection**: Additive feature, doesn't break existing queries

---

## Deployment Checklist

- [ ] Backup existing database
- [ ] Run migration scripts to add chain_id columns
- [ ] Set default chain_id for existing data
- [ ] Add is_active column to token_locks
- [ ] Update unique constraints
- [ ] Create new indexes
- [ ] Test multi-chain isolation
- [ ] Re-process events for receiver detection
- [ ] Verify all foreign keys
- [ ] Run property tests
- [ ] Update application code to use chain_id
- [ ] Deploy indexer with event parsing logic
- [ ] Monitor for errors
- [ ] Verify data integrity

---

## Documentation Updates

- [x] Updated design.md with all schema changes
- [x] Updated requirements.md with new acceptance criteria
- [x] Created CHANGES.md (this document)
- [ ] Update API documentation with chain_id parameter
- [ ] Update query examples with chain_id filtering
- [ ] Document event parsing logic for receivers
- [ ] Update operator guide with migration steps
