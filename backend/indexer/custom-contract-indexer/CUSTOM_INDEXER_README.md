# Custom Contract Indexer

Index any smart contract on any EVM chain with user-specified contracts and ABIs.

## Features

- **Multi-chain support** - Index contracts on Ethereum, Polygon, BSC, Lisk, etc.
- **User-defined contracts** - Specify which contracts to index
- **Custom ABIs** - Provide contract ABIs for proper decoding
- **Event & transaction indexing** - Captures both events and function calls
- **Dedicated database** - Separate from main indexer database
- **Batch processing** - Efficient block range processing
- **Resume capability** - Automatically resumes from last indexed block

## Quick Start

### 1. Setup Environment

```bash
cp .env.custom .env
# Edit .env with your database credentials
```

### 2. Interactive Mode

```bash
node run-custom-indexer.js
```

Follow prompts to:
- Add chains (Chain ID + RPC URL)
- Add contracts (Address + ABI + Start Block)
- Start indexing

### 3. Config File Mode

```bash
# Edit custom-indexer-config.json with your contracts
node run-custom-indexer.js custom-indexer-config.json
```

## Configuration Format

```json
{
  "chains": {
    "1": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
    "137": "https://polygon-rpc.com"
  },
  "contracts": [
    {
      "chainId": 1,
      "address": "0x...",
      "startBlock": 18000000,
      "abi": [
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "function transfer(address to, uint256 amount) returns (bool)"
      ]
    }
  ]
}
```

## Database Schema

### Tables Created

- **indexed_contracts** - Contract metadata and indexing status
- **contract_transactions** - All transactions to/from contracts
- **contract_events** - Decoded contract events

### Query Examples

```sql
-- Get all transfers for a contract
SELECT * FROM contract_events 
WHERE contract_address = '0x...' 
AND event_name = 'Transfer';

-- Get function calls by name
SELECT * FROM contract_transactions 
WHERE function_name = 'transfer' 
AND chain_id = 1;

-- Check indexing progress
SELECT contract_address, last_indexed_block 
FROM indexed_contracts;
```

## Supported Chains

Any EVM-compatible chain:
- Ethereum (1)
- Polygon (137)
- BSC (56)
- Lisk (4202)
- Arbitrum (42161)
- Optimism (10)
- And more...

## ABI Formats

Supports both:
- **Human-readable ABI** (recommended)
- **JSON ABI** (standard format)

```javascript
// Human-readable (easier)
[
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function transfer(address to, uint256 amount) returns (bool)"
]

// JSON ABI (standard)
[
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [...]
  }
]
```

## Use Cases

- **DeFi Protocol Monitoring** - Track specific DEX/lending contracts
- **Token Analytics** - Monitor ERC20/ERC721 contracts
- **Governance Tracking** - Index DAO voting contracts
- **Custom dApp Data** - Index your own smart contracts
- **Cross-chain Analysis** - Compare same contract on different chains

## Performance

- Processes ~1000 blocks per batch
- Handles multiple contracts simultaneously
- Automatic retry on RPC failures
- Efficient database upserts (no duplicates)

## Monitoring

Check indexing progress:

```sql
SELECT 
  chain_id,
  contract_address,
  last_indexed_block,
  (SELECT COUNT(*) FROM contract_transactions WHERE contract_address = ic.contract_address) as tx_count,
  (SELECT COUNT(*) FROM contract_events WHERE contract_address = ic.contract_address) as event_count
FROM indexed_contracts ic;
```
