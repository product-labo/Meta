# Starknet RPC Indexer Documentation

## Overview

The Starknet RPC Indexer is a comprehensive blockchain data indexing system that continuously fetches data from Starknet RPC endpoints, processes it through multiple specialized processors, and stores it in a PostgreSQL database with complete data integrity.

## What It Does

### Core Functionality
- **Real-time Block Syncing**: Continuously monitors Starknet for new blocks
- **Transaction Processing**: Extracts and processes all transaction data including fees, types, and metadata
- **Event Extraction**: Retrieves events from transaction receipts and links them to contracts
- **Contract Analysis**: Identifies contract deployments, class hashes, and contract interactions
- **Wallet Tracking**: Monitors wallet addresses and their interactions with contracts
- **Data Integrity**: Ensures all data relationships are maintained with foreign key constraints

### Data Processing Pipeline

1. **RPC Layer**: Fetches data from Starknet Lava RPC endpoint
2. **Block Processor**: Processes block headers and metadata
3. **Transaction Processor**: Handles transaction details, fees, and receipts
4. **Event Processor**: Extracts events from transaction receipts
5. **Contract Processor**: Identifies contract deployments and class hashes
6. **Wallet Processor**: Tracks wallet addresses and interactions
7. **Database Layer**: Stores all processed data with relationships

### Database Tables Populated

| Table | Description | Key Data |
|-------|-------------|----------|
| `blocks` | Block headers and metadata | block_number, block_hash, timestamp |
| `transactions` | Transaction details | tx_hash, tx_type, sender_address, actual_fee |
| `events` | Contract events from receipts | contract_address, tx_hash, block_number |
| `contracts` | Contract deployments | contract_address, class_hash, deployment_block |
| `wallets` | Unique wallet addresses | address, first_seen_block |
| `wallet_interactions` | Wallet-contract interactions | wallet_address, contract_address, tx_hash |
| `execution_calls` | Function call executions | tx_hash, contract_address, call_status |
| `transaction_receipts` | Receipt data | tx_hash, gas_used, actual_fee |
| `contract_classes` | Contract class metadata | class_hash |
| `functions` | Contract function definitions | class_hash, function_name |

## How to Start the Indexer

### Method 1: Service Management (Recommended)

```bash
# Start the indexer as a background service
./indexer-service.sh start

# Check if it's running
./indexer-service.sh status

# View live logs
./indexer-service.sh logs

# Stop the indexer
./indexer-service.sh stop

# Restart the indexer
./indexer-service.sh restart
```

### Method 2: Direct Execution

```bash
# Build the project first
npm run build

# Start the continuous indexer directly
node dist/continuous-indexer.js

# Or use the startup script
./start-continuous-indexer.sh
```

### Method 3: Development Mode

```bash
# Start with TypeScript compilation
npm start
```

## Service Management Commands

### Start Command
```bash
./indexer-service.sh start
```
- Builds the TypeScript project
- Starts the indexer as a background daemon
- Creates PID file for process tracking
- Redirects output to logs/indexer.log

### Status Command
```bash
./indexer-service.sh status
```
- Shows if indexer is running
- Displays process ID (PID)
- Shows recent log activity

### Logs Command
```bash
./indexer-service.sh logs
```
- Follows live log output
- Shows real-time indexing activity
- Press Ctrl+C to exit log viewing

### Stop Command
```bash
./indexer-service.sh stop
```
- Gracefully stops the indexer process
- Sends SIGTERM signal for clean shutdown
- Removes PID file
- Force kills if graceful shutdown fails

## Configuration

### Environment Variables (.env)

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=database_name
DB_USER=username
DB_PASSWORD=password

# Starknet RPC Configuration
STARKNET_RPC_URL=https://rpc.starknet.lava.build
STARKNET_RPC_TIMEOUT=30000
STARKNET_RPC_RETRY_ATTEMPTS=3
STARKNET_RPC_RETRY_DELAY=1000

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=3001

# Ingestion Configuration
BATCH_SIZE=5
CHECKPOINT_INTERVAL=100
MAX_CONCURRENT_REQUESTS=10
```

### Sync Configuration

- **Sync Interval**: 10 seconds between sync checks
- **Batch Size**: 5 blocks processed per cycle
- **Error Backoff**: 20 seconds wait on RPC errors
- **Checkpoint Interval**: Progress saved every 100 blocks

## Monitoring and Logs

### Log Files
- **Main Log**: `logs/indexer.log` - All indexer activity
- **Application Log**: `logs/app.log` - Application-specific logs
- **Monitor Log**: `logs/monitor.log` - System monitoring data

### Log Format
```
[2025-12-24T13:15:30.123Z] INFO: Starting continuous sync...
📊 RPC Block: 4699150, DB Block: 4699149
🔄 Syncing 1 blocks...
🔍 Syncing block 4699150...
✅ Block 4699150 synced successfully
```

### Monitoring Commands
```bash
# View live indexer activity
tail -f logs/indexer.log

# Check recent errors
grep "ERROR" logs/indexer.log | tail -10

# Monitor sync progress
grep "Syncing block" logs/indexer.log | tail -5
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL is running
   sudo systemctl status postgresql
   
   # Verify connection string in .env
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **RPC Connection Issues**
   ```bash
   # Test RPC endpoint
   curl -X POST https://rpc.starknet.lava.build \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"starknet_blockNumber","params":[],"id":1}'
   ```

3. **Build Errors**
   ```bash
   # Clean and rebuild
   rm -rf dist/
   npm run build
   ```

4. **Process Not Starting**
   ```bash
   # Check for existing processes
   ps aux | grep continuous-indexer
   
   # Remove stale PID file
   rm -f /tmp/starknet-indexer.pid
   ```

### Error Recovery

The indexer includes automatic error recovery:
- **Network Errors**: Automatic retry with exponential backoff
- **Database Errors**: Transaction rollback and retry
- **RPC Errors**: Fallback endpoints and retry logic
- **Process Crashes**: Service management restart capability

## Performance Optimization

### Database Optimization
```sql
-- Create indexes for better query performance
CREATE INDEX CONCURRENTLY idx_transactions_block_sender ON transactions(block_number, sender_address);
CREATE INDEX CONCURRENTLY idx_events_contract_block ON events(contract_address, block_number);
CREATE INDEX CONCURRENTLY idx_wallet_interactions_wallet ON wallet_interactions(wallet_address);
```

### System Resources
- **Memory**: ~100MB typical usage
- **CPU**: Low usage during normal operation
- **Disk**: ~1GB per 100k blocks (estimated)
- **Network**: ~10MB/hour for continuous sync

## API Endpoints

When running, the indexer also provides API endpoints:

```bash
# Health check
curl http://localhost:3001/health

# Get block by number
curl http://localhost:3001/api/blocks/4699150

# Get transaction by hash
curl http://localhost:3001/api/transactions/0x123...

# Get wallet interactions
curl http://localhost:3001/api/wallets/0x456.../interactions
```

## Data Integrity Verification

### Verify Data Quality
```sql
-- Check data completeness
SELECT 
  'blocks' as table_name, COUNT(*) as count FROM blocks
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL  
SELECT 'events', COUNT(*) FROM events;

-- Verify data relationships
SELECT COUNT(*) as orphaned_events 
FROM events e 
LEFT JOIN transactions t ON e.tx_hash = t.tx_hash 
WHERE t.tx_hash IS NULL;
```

### Monitor Sync Status
```sql
-- Check latest synced block
SELECT MAX(block_number) as latest_block FROM blocks;

-- Compare with network
-- (Latest network block shown in logs)
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
pg_dump $DATABASE_URL > starknet_backup_$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < starknet_backup_20251224.sql
```

### Configuration Backup
```bash
# Backup configuration
cp .env .env.backup
cp -r logs/ logs_backup/
```

## Security Considerations

- **Database Access**: Use dedicated database user with minimal privileges
- **RPC Endpoints**: Use authenticated endpoints when available
- **Log Files**: Contain no sensitive information
- **Process Isolation**: Runs as non-root user
- **Network Security**: Only outbound connections to RPC endpoints

## Scaling and Production

### Production Deployment
```bash
# Use production environment
NODE_ENV=production ./indexer-service.sh start

# Set up log rotation
sudo logrotate -f /etc/logrotate.d/starknet-indexer

# Monitor with systemd (optional)
sudo systemctl enable starknet-indexer
sudo systemctl start starknet-indexer
```

### High Availability
- **Multiple RPC Endpoints**: Configure fallback endpoints
- **Database Replication**: Set up PostgreSQL streaming replication  
- **Process Monitoring**: Use systemd or supervisor for auto-restart
- **Load Balancing**: Distribute API requests across multiple instances
