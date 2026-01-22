# Supported Chains and Technical Requirements

## Overview

MetaGauge's Multi-Chain Wallet Indexing system supports multiple blockchain networks with different technical requirements and capabilities. This document provides detailed information about each supported chain, their requirements, and implementation specifics.

## Supported Blockchain Networks

### EVM-Compatible Chains

#### Ethereum Mainnet
- **Chain ID**: `ethereum`
- **Network ID**: 1
- **Address Format**: 42-character hexadecimal (0x...)
- **Block Time**: ~12 seconds
- **RPC Endpoints**: 
  - Primary: `https://eth-mainnet.g.alchemy.com/v2/{API_KEY}`
  - Fallback: `https://mainnet.infura.io/v3/{API_KEY}`
  - Public: `https://ethereum.publicnode.com`
- **Explorer**: https://etherscan.io
- **Indexing Features**:
  - ✅ Transaction indexing
  - ✅ Event log parsing
  - ✅ Internal transaction tracking
  - ✅ ERC-20/ERC-721 token transfers
  - ✅ Contract interaction decoding

#### Polygon Mainnet
- **Chain ID**: `polygon`
- **Network ID**: 137
- **Address Format**: 42-character hexadecimal (0x...)
- **Block Time**: ~2 seconds
- **RPC Endpoints**:
  - Primary: `https://polygon-mainnet.g.alchemy.com/v2/{API_KEY}`
  - Fallback: `https://polygon-mainnet.infura.io/v3/{API_KEY}`
  - Public: `https://polygon.llamarpc.com`
- **Explorer**: https://polygonscan.com
- **Indexing Features**:
  - ✅ High-speed transaction indexing
  - ✅ Event log parsing
  - ✅ MATIC token tracking
  - ✅ Bridge transaction detection
  - ✅ Gas optimization analysis

#### Lisk L2
- **Chain ID**: `lisk`
- **Network ID**: 1135
- **Address Format**: 42-character hexadecimal (0x...)
- **Block Time**: ~2 seconds
- **RPC Endpoints**:
  - Primary: `https://rpc.api.lisk.com`
  - Fallback: `https://lisk.drpc.org`
- **Explorer**: https://blockscout.lisk.com
- **Special Features**:
  - ✅ L2 bridge transaction tracking
  - ✅ Optimistic rollup data
  - ✅ Cross-chain message indexing
  - ✅ Standard Bridge contract: `0x4200000000000000000000000000000000000006`
- **Indexing Features**:
  - ✅ L1/L2 bridge events
  - ✅ Deposit/withdrawal tracking
  - ✅ Batch transaction processing
  - ✅ State root verification

#### Arbitrum One
- **Chain ID**: `arbitrum`
- **Network ID**: 42161
- **Address Format**: 42-character hexadecimal (0x...)
- **Block Time**: ~0.25 seconds
- **RPC Endpoints**:
  - Primary: `https://arb-mainnet.g.alchemy.com/v2/{API_KEY}`
  - Fallback: `https://arbitrum-mainnet.infura.io/v3/{API_KEY}`
  - Public: `https://arbitrum.llamarpc.com`
- **Explorer**: https://arbiscan.io
- **Indexing Features**:
  - ✅ High-frequency transaction indexing
  - ✅ Arbitrum-specific events
  - ✅ Retryable ticket tracking
  - ✅ L1/L2 message passing

#### Optimism Mainnet
- **Chain ID**: `optimism`
- **Network ID**: 10
- **Address Format**: 42-character hexadecimal (0x...)
- **Block Time**: ~2 seconds
- **RPC Endpoints**:
  - Primary: `https://opt-mainnet.g.alchemy.com/v2/{API_KEY}`
  - Fallback: `https://optimism-mainnet.infura.io/v3/{API_KEY}`
  - Public: `https://mainnet.optimism.io`
- **Explorer**: https://optimistic.etherscan.io
- **Indexing Features**:
  - ✅ Optimistic rollup data
  - ✅ Fraud proof tracking
  - ✅ L1/L2 bridge monitoring
  - ✅ Batch submission analysis

#### Binance Smart Chain (BSC)
- **Chain ID**: `bsc`
- **Network ID**: 56
- **Address Format**: 42-character hexadecimal (0x...)
- **Block Time**: ~3 seconds
- **RPC Endpoints**:
  - Primary: `https://bsc-dataseed1.binance.org`
  - Fallback: `https://bsc-dataseed2.binance.org`
  - Public: `https://bsc.publicnode.com`
- **Explorer**: https://bscscan.com
- **Indexing Features**:
  - ✅ BNB token tracking
  - ✅ PancakeSwap integration
  - ✅ Validator staking events
  - ✅ Cross-chain bridge support

### Starknet

#### Starknet Mainnet
- **Chain ID**: `starknet-mainnet`
- **Network ID**: SN_MAIN
- **Address Format**: 64+ character hexadecimal (0x...)
- **Block Time**: ~10-30 seconds (variable)
- **RPC Endpoints**:
  - Primary: `https://starknet-mainnet.g.alchemy.com/v2/{API_KEY}`
  - Fallback: `https://starknet-mainnet.infura.io/v3/{API_KEY}`
  - Public: `https://starknet-mainnet.public.blastapi.io`
- **Explorer**: https://starkscan.co
- **Special Features**:
  - ✅ Cairo contract support
  - ✅ STARK proof verification
  - ✅ Account abstraction
  - ✅ Native multi-call support
- **Indexing Features**:
  - ✅ Transaction indexing with internal calls
  - ✅ Event parsing with Cairo types
  - ✅ Account contract interactions
  - ✅ Declare/deploy transaction tracking
  - ✅ L1/L2 message handling

#### Starknet Sepolia (Testnet)
- **Chain ID**: `starknet-sepolia`
- **Network ID**: SN_SEPOLIA
- **Address Format**: 64+ character hexadecimal (0x...)
- **Block Time**: ~10-30 seconds (variable)
- **RPC Endpoints**:
  - Primary: `https://starknet-sepolia.g.alchemy.com/v2/{API_KEY}`
  - Public: `https://starknet-sepolia.public.blastapi.io`
- **Explorer**: https://sepolia.starkscan.co
- **Use Cases**:
  - Development and testing
  - Contract deployment testing
  - Integration testing

## Technical Requirements

### System Requirements

#### Minimum Hardware
- **CPU**: 4 cores, 2.5GHz
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 100 Mbps stable connection

#### Recommended Hardware
- **CPU**: 8+ cores, 3.0GHz+
- **RAM**: 16GB+
- **Storage**: 500GB+ NVMe SSD
- **Network**: 1 Gbps stable connection

#### Production Hardware
- **CPU**: 16+ cores, 3.5GHz+
- **RAM**: 32GB+
- **Storage**: 1TB+ NVMe SSD with backup
- **Network**: 10 Gbps with redundancy

### Software Dependencies

#### Core Dependencies
```json
{
  "node": ">=18.0.0",
  "npm": ">=8.0.0",
  "postgresql": ">=14.0",
  "redis": ">=6.0"
}
```

#### Node.js Packages
```json
{
  "ethers": "^6.8.0",
  "starknet": "^5.24.0",
  "pg": "^8.11.0",
  "ws": "^8.14.0",
  "express": "^4.18.0",
  "jsonwebtoken": "^9.0.0"
}
```

### Database Schema Requirements

#### PostgreSQL Configuration
```sql
-- Minimum PostgreSQL settings
shared_preload_libraries = 'pg_stat_statements'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

#### Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
```

#### Storage Requirements
- **Base Schema**: ~50MB
- **Per Million Transactions**: ~500MB
- **Per Million Events**: ~300MB
- **Indexes**: ~30% of data size
- **Recommended**: 10GB+ free space per active wallet

### Network Requirements

#### RPC Endpoint Requirements
- **Latency**: <100ms average
- **Uptime**: >99.9%
- **Rate Limits**: 
  - Development: 100 requests/second
  - Production: 1000+ requests/second
- **WebSocket Support**: Required for real-time updates

#### Bandwidth Requirements
- **Initial Indexing**: 10-100 MB per wallet (varies by activity)
- **Ongoing Sync**: 1-10 MB per day per wallet
- **WebSocket Updates**: <1 KB per update

### Security Requirements

#### API Security
- **Authentication**: JWT tokens with 24-hour expiry
- **Rate Limiting**: Per-user and per-endpoint limits
- **HTTPS**: TLS 1.3 required for all connections
- **CORS**: Configured for specific domains only

#### Database Security
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions
- **Backup**: Encrypted daily backups
- **Monitoring**: Query performance and security logs

#### Infrastructure Security
- **Firewall**: Restrict access to necessary ports only
- **VPN**: Required for administrative access
- **Monitoring**: 24/7 system monitoring
- **Updates**: Regular security patches

## Performance Characteristics

### Indexing Performance

#### EVM Chains
| Chain | Blocks/Second | Transactions/Second | Initial Sync Time* |
|-------|---------------|--------------------|--------------------|
| Ethereum | 50-100 | 500-1000 | 2-6 hours |
| Polygon | 200-500 | 2000-5000 | 1-3 hours |
| Lisk | 200-400 | 1000-3000 | 1-2 hours |
| Arbitrum | 1000-2000 | 5000-10000 | 30min-2 hours |
| Optimism | 200-400 | 1000-3000 | 1-2 hours |
| BSC | 150-300 | 1500-3000 | 1-3 hours |

*For wallets with moderate activity (1000-10000 transactions)

#### Starknet
| Network | Blocks/Second | Transactions/Second | Initial Sync Time* |
|---------|---------------|--------------------|--------------------|
| Mainnet | 20-50 | 100-500 | 3-8 hours |
| Sepolia | 30-60 | 200-600 | 1-4 hours |

*Starknet indexing includes internal call processing

### Real-Time Performance
- **WebSocket Latency**: <50ms
- **Status Update Frequency**: Every 5 seconds
- **Progress Update Accuracy**: ±1 block
- **Concurrent Indexing Jobs**: Up to 50 per instance

## Chain-Specific Implementation Details

### EVM Chain Implementation

#### Transaction Processing
```javascript
// EVM transaction structure
{
  hash: "0x...",
  blockNumber: 12345678,
  from: "0x...",
  to: "0x...",
  value: "1000000000000000000", // Wei
  gasUsed: 21000,
  gasPrice: "20000000000", // Wei
  input: "0x...", // Contract call data
  logs: [...] // Event logs
}
```

#### Event Log Processing
```javascript
// EVM event log structure
{
  address: "0x...", // Contract address
  topics: ["0x...", "0x...", ...], // Event signature + indexed params
  data: "0x...", // Non-indexed parameters
  blockNumber: 12345678,
  transactionHash: "0x...",
  logIndex: 0
}
```

### Starknet Implementation

#### Transaction Processing
```javascript
// Starknet transaction structure
{
  transaction_hash: "0x...",
  block_number: 12345,
  type: "INVOKE", // INVOKE, DECLARE, DEPLOY, etc.
  sender_address: "0x...",
  calldata: [...], // Array of field elements
  signature: [...],
  max_fee: "1000000000000000", // Wei
  actual_fee: "500000000000000",
  execution_status: "SUCCEEDED",
  events: [...] // Contract events
}
```

#### Event Processing
```javascript
// Starknet event structure
{
  from_address: "0x...", // Contract address
  keys: [...], // Event selector + indexed data
  data: [...], // Event data as field elements
  block_number: 12345,
  transaction_hash: "0x..."
}
```

## Monitoring and Alerting

### Key Metrics
- **Indexing Speed**: Blocks processed per second
- **Error Rate**: Failed requests per minute
- **Queue Depth**: Pending indexing jobs
- **Database Performance**: Query response times
- **Memory Usage**: RAM utilization
- **Disk Usage**: Storage consumption

### Alert Thresholds
- **High Error Rate**: >5% failed requests
- **Slow Indexing**: <10 blocks/second for >5 minutes
- **Queue Backup**: >100 pending jobs
- **Database Slow**: >1 second average query time
- **High Memory**: >80% RAM usage
- **Low Disk**: <10% free space

### Monitoring Tools
- **Application**: Custom metrics dashboard
- **Infrastructure**: Prometheus + Grafana
- **Database**: PostgreSQL monitoring
- **Logs**: Centralized logging with search
- **Alerts**: Email/Slack notifications

## Troubleshooting Guide

### Common Issues

#### Slow Indexing Performance
**Symptoms**: Indexing taking longer than expected
**Causes**:
- RPC endpoint rate limiting
- Network connectivity issues
- Database performance problems
- High system load

**Solutions**:
1. Check RPC endpoint status and switch if needed
2. Verify network connectivity and bandwidth
3. Optimize database queries and indexes
4. Scale up hardware resources

#### RPC Connection Failures
**Symptoms**: "Connection timeout" or "RPC error" messages
**Causes**:
- RPC endpoint downtime
- Network connectivity issues
- Rate limit exceeded
- Invalid API keys

**Solutions**:
1. Switch to fallback RPC endpoint
2. Check network connectivity
3. Verify API key validity
4. Implement exponential backoff

#### Database Connection Issues
**Symptoms**: "Database connection failed" errors
**Causes**:
- PostgreSQL service down
- Connection pool exhausted
- Network connectivity
- Authentication issues

**Solutions**:
1. Restart PostgreSQL service
2. Increase connection pool size
3. Check database server connectivity
4. Verify credentials and permissions

### Performance Optimization

#### Database Optimization
```sql
-- Optimize for indexing workload
CREATE INDEX CONCURRENTLY idx_wallet_transactions_block 
ON wallet_transactions(block_number);

CREATE INDEX CONCURRENTLY idx_wallet_events_contract 
ON wallet_events(contract_address, block_number);

-- Analyze tables regularly
ANALYZE wallet_transactions;
ANALYZE wallet_events;
```

#### Application Optimization
```javascript
// Batch processing for better performance
const batchSize = 100;
const transactions = await fetchTransactionsBatch(startBlock, endBlock, batchSize);

// Connection pooling
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

## Future Roadmap

### Planned Chain Support
- **Base**: Coinbase's L2 solution
- **zkSync Era**: Zero-knowledge rollup
- **Avalanche**: High-performance blockchain
- **Fantom**: Fast finality blockchain
- **Solana**: High-throughput blockchain

### Feature Enhancements
- **Real-time Streaming**: Sub-second updates
- **Advanced Analytics**: ML-powered insights
- **Custom Indexing**: User-defined data extraction
- **Cross-chain Analysis**: Multi-chain correlation
- **Historical Snapshots**: Point-in-time data views

### Performance Improvements
- **Parallel Processing**: Multi-threaded indexing
- **Caching Layer**: Redis-based caching
- **Database Sharding**: Horizontal scaling
- **CDN Integration**: Global data distribution
- **Edge Computing**: Regional processing nodes