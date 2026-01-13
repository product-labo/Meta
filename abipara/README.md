# Blockchain Analytics Indexer

Multi-chain blockchain analytics platform using Apibara indexers for EVM, Starknet, and Beacon Chain data.

## 🚀 Quick Start

### 1. Database Setup
Run the SQL script on your PostgreSQL database:
```bash
psql -U postgres -d your_database_name -f database_setup.sql
```

### 2. Environment Configuration
Update `.env` with your database credentials:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=blockchain_analytics
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Contract Registry
```bash
npm run setup
```

### 5. Start Indexers

**Single indexer:**
```bash
npm run indexer:evm      # Ethereum mainnet
npm run indexer:starknet # Starknet mainnet  
npm run indexer:beacon   # Beacon chain
```

**All indexers simultaneously:**
```bash
npm run indexer:all
```

## 📊 Analytics

Run analytics queries:
```bash
npm run analytics
```

View database in browser:
```bash
npm run db:studio
```

## 🗄️ Database Schema

### Core Tables
- `ba_chains` - Blockchain networks (Ethereum, Starknet, Beacon)
- `ba_categories` - Contract categories (DeFi, NFT, DEX, etc.)
- `ba_smart_contracts` - Tracked smart contracts
- `ba_function_signatures` - Function signatures and selectors
- `ba_wallets` - Wallet addresses and metadata
- `ba_transactions` - All blockchain transactions
- `ba_events` - Smart contract events/logs
- `ba_receipts` - Transaction receipts
- `ba_validators` - Beacon chain validator data
- `ba_starknet_messages` - L1-L2 message passing

## 🔍 Tracked Data

### EVM (Ethereum)
- **Contracts**: Uniswap V2/V3, AAVE, BAYC, major DeFi protocols
- **Functions**: swaps, deposits, transfers, approvals
- **Events**: Transfer, Approval, Swap, Deposit, Withdraw
- **Metrics**: Gas usage, transaction volume, wallet interactions

### Starknet
- **Contracts**: ETH token, major Starknet protocols
- **Functions**: transfer, approve, invoke
- **Events**: Contract events with decoded data
- **Messages**: L1-L2 cross-layer messaging

### Beacon Chain
- **Validators**: Status, balance, rewards, slashing
- **Execution Payload**: EVM transactions within beacon blocks
- **Consensus**: Slot, epoch, proposer data

## 📈 Analytics Queries

### Available Analytics
- Top contracts by transaction volume
- Most popular function signatures
- Cross-chain activity comparison
- Wallet interaction patterns
- Daily transaction volume trends
- Contract-specific transaction history

### Example Usage
```typescript
import { Analytics } from './src/lib/analytics';

// Get top 10 contracts
const topContracts = await Analytics.getTopContracts(10, 30);

// Get function popularity
const topFunctions = await Analytics.getTopFunctions(10, 30);

// Cross-chain comparison
const crossChainStats = await Analytics.getCrossChainStats(30);
```

## 🛠️ Development

### Project Structure
```
src/
├── indexers/           # Blockchain indexers
│   ├── evm.indexer.ts
│   ├── starknet.indexer.ts
│   └── beacon.indexer.ts
├── lib/
│   ├── database.ts     # Database connection
│   ├── schema.ts       # Database schema
│   ├── analytics.ts    # Analytics queries
│   └── contract-registry.ts
└── scripts/
    └── setup.ts        # Setup scripts
```

### Adding New Contracts
Edit `src/lib/contract-registry.ts`:
```typescript
export const POPULAR_CONTRACTS = {
  ethereum: [
    {
      address: '0x...',
      name: 'Your Contract',
      category: 'defi',
      functions: ['functionName1', 'functionName2']
    }
  ]
};
```

### Custom Analytics
Add new queries to `src/lib/analytics.ts`:
```typescript
static async getCustomMetric() {
  return await db.select()...
}
```

## 🔧 Configuration

### Environment Variables
- `DB_*` - Database connection settings
- `*_RPC_URL` - Blockchain RPC endpoints
- `BACKFILL_BLOCKS` - Blocks per batch for historical data
- `PARALLEL_WORKERS` - Number of parallel processing workers

### Indexer Settings
- **EVM**: Tracks specific contract addresses
- **Starknet**: Processes events and L1-L2 messages
- **Beacon**: Handles validator data and execution payloads

## 📊 Data Volume Estimates

### 30 Days of Data
- **Ethereum**: ~2M transactions, ~10M events
- **Starknet**: ~500K transactions, ~2M events
- **Beacon**: ~200K blocks, ~5M validator updates
- **Storage**: ~500GB with indexes

### Processing Performance
- **Backfill**: 24-48 hours for 30 days
- **Real-time**: <1 second latency
- **Queries**: <100ms for most analytics

## 🚨 Monitoring

### Health Checks
- Block processing lag
- Database connection status
- Indexer error rates
- Memory and CPU usage

### Logs
All indexers log processing status:
```
Processing block 18500000 with 150 transactions
Stored transaction: 0x1234...
Updated 32 validators
```

## 🤝 Contributing

1. Add new contracts to registry
2. Create custom analytics queries
3. Extend indexers for additional data
4. Improve performance and monitoring

## 📝 License

MIT License - see LICENSE file for details.
