-- Database Documentation Script
-- This script adds COMMENT statements to document the database structure
-- Comments are metadata only and do not affect existing functionality

-- =============================================================================
-- STARKNET BLOCKCHAIN DATA TABLES (Raw blockchain data from Starknet RPC)
-- =============================================================================

-- Core Starknet blockchain tables
COMMENT ON TABLE blocks IS 'Starknet blockchain blocks - raw block headers and metadata from RPC';
COMMENT ON COLUMN blocks.block_number IS 'Sequential block number on Starknet';
COMMENT ON COLUMN blocks.block_hash IS 'Unique block hash (0x...)';
COMMENT ON COLUMN blocks.parent_block_hash IS 'Hash of previous block';
COMMENT ON COLUMN blocks.timestamp IS 'Block timestamp (Unix timestamp)';
COMMENT ON COLUMN blocks.finality_status IS 'Block finality: PENDING, ACCEPTED_ON_L2, ACCEPTED_ON_L1';
COMMENT ON COLUMN blocks.created_at IS 'When this record was indexed';

COMMENT ON TABLE transactions IS 'Starknet transactions - all transaction data from blocks';
COMMENT ON COLUMN transactions.tx_hash IS 'Unique transaction hash (0x...)';
COMMENT ON COLUMN transactions.block_number IS 'Block containing this transaction';
COMMENT ON COLUMN transactions.tx_type IS 'Transaction type: INVOKE, DEPLOY_ACCOUNT, DECLARE, etc.';
COMMENT ON COLUMN transactions.sender_address IS 'Address that initiated the transaction';
COMMENT ON COLUMN transactions.entry_point_selector IS 'Function selector being called';
COMMENT ON COLUMN transactions.status IS 'Transaction status: ACCEPTED_ON_L2, ACCEPTED_ON_L1, REJECTED';
COMMENT ON COLUMN transactions.actual_fee IS 'Actual fee paid for transaction (in wei)';

COMMENT ON TABLE contracts IS 'Deployed smart contracts on Starknet';
COMMENT ON COLUMN contracts.contract_address IS 'Deployed contract address (0x...)';
COMMENT ON COLUMN contracts.class_hash IS 'Contract class hash defining the contract code';
COMMENT ON COLUMN contracts.deployer_address IS 'Address that deployed this contract';
COMMENT ON COLUMN contracts.deployment_tx_hash IS 'Transaction hash of deployment';
COMMENT ON COLUMN contracts.deployment_block IS 'Block number where contract was deployed';
COMMENT ON COLUMN contracts.is_proxy IS 'Whether this is a proxy contract';

COMMENT ON TABLE events IS 'Events emitted by smart contracts during transaction execution';
COMMENT ON COLUMN events.event_id IS 'Auto-incrementing event ID';
COMMENT ON COLUMN events.tx_hash IS 'Transaction that emitted this event';
COMMENT ON COLUMN events.contract_address IS 'Contract that emitted the event';
COMMENT ON COLUMN events.block_number IS 'Block containing the transaction';

COMMENT ON TABLE contract_classes IS 'Contract class definitions and ABI data';
COMMENT ON COLUMN contract_classes.class_hash IS 'Unique class hash (0x...)';
COMMENT ON COLUMN contract_classes.abi_json IS 'Contract ABI in JSON format';
COMMENT ON COLUMN contract_classes.declared_tx_hash IS 'Transaction that declared this class';
COMMENT ON COLUMN contract_classes.declared_block IS 'Block where class was declared';

COMMENT ON TABLE execution_calls IS 'Function calls made during transaction execution';
COMMENT ON COLUMN execution_calls.call_id IS 'Auto-incrementing call ID';
COMMENT ON COLUMN execution_calls.tx_hash IS 'Transaction containing this call';
COMMENT ON COLUMN execution_calls.contract_address IS 'Contract being called';
COMMENT ON COLUMN execution_calls.entry_point_selector IS 'Function being called';
COMMENT ON COLUMN execution_calls.call_status IS 'Call execution status';

COMMENT ON TABLE wallet_interactions IS 'Wallet addresses and their contract interactions';
COMMENT ON COLUMN wallet_interactions.wallet_address IS 'Wallet address (0x...)';
COMMENT ON COLUMN wallet_interactions.contract_address IS 'Contract being interacted with';
COMMENT ON COLUMN wallet_interactions.tx_hash IS 'Transaction hash of interaction';

COMMENT ON TABLE raw_rpc_responses IS 'Raw RPC responses for debugging and data integrity';
COMMENT ON COLUMN raw_rpc_responses.rpc_method IS 'RPC method called (e.g., starknet_getBlock)';
COMMENT ON COLUMN raw_rpc_responses.response_json IS 'Full JSON response from RPC';

-- =============================================================================
-- LISK BLOCKCHAIN DATA TABLES (Raw blockchain data from Lisk RPC)
-- =============================================================================

COMMENT ON TABLE lisk_blocks IS 'Lisk blockchain blocks - raw block data from Lisk RPC';
COMMENT ON TABLE lisk_transactions IS 'Lisk blockchain transactions';
COMMENT ON TABLE lisk_contracts IS 'Smart contracts deployed on Lisk blockchain';
COMMENT ON TABLE lisk_wallets IS 'Wallet addresses on Lisk blockchain';
COMMENT ON TABLE lisk_execution_calls IS 'Function calls on Lisk contracts';
COMMENT ON TABLE lisk_transaction_receipts IS 'Transaction receipts from Lisk';
COMMENT ON TABLE lisk_wallet_interactions IS 'Wallet-contract interactions on Lisk';
COMMENT ON TABLE lisk_raw_rpc_responses IS 'Raw RPC responses from Lisk nodes';
COMMENT ON TABLE lisk_sync_state IS 'Synchronization state for Lisk indexer';
COMMENT ON TABLE lisk_chain_config IS 'Lisk blockchain configuration';
COMMENT ON TABLE lisk_logs IS 'Logs from Lisk blockchain operations';

-- =============================================================================
-- BUSINESS INTELLIGENCE & ANALYTICS TABLES (Processed metrics from Starknet blockchain data)
-- =============================================================================

COMMENT ON TABLE bi_contract_categories IS 'Contract category definitions for Starknet contract classification (DeFi, NFT, Gaming, etc.) - derived from Starknet blockchain data';
COMMENT ON COLUMN bi_contract_categories.category_name IS 'Category name (e.g., DeFi, NFT, Gaming)';
COMMENT ON COLUMN bi_contract_categories.parent_category IS 'Parent category for hierarchical classification';
COMMENT ON COLUMN bi_contract_categories.description IS 'Human-readable category description';
COMMENT ON COLUMN bi_contract_categories.icon_name IS 'Icon identifier for UI display';
COMMENT ON COLUMN bi_contract_categories.color_hex IS 'Color code for UI theming';

COMMENT ON TABLE bi_contract_index IS 'Curated index of known Starknet contracts with metadata and classification - sourced from Starknet blockchain data';
COMMENT ON COLUMN bi_contract_index.contract_address IS 'Starknet contract address being indexed';
COMMENT ON COLUMN bi_contract_index.chain_id IS 'Blockchain chain ID (Starknet mainnet/testnet)';
COMMENT ON COLUMN bi_contract_index.contract_name IS 'Human-readable contract name';
COMMENT ON COLUMN bi_contract_index.category IS 'Primary category classification';
COMMENT ON COLUMN bi_contract_index.subcategory IS 'Secondary category classification';
COMMENT ON COLUMN bi_contract_index.website_url IS 'Official project website';
COMMENT ON COLUMN bi_contract_index.twitter_url IS 'Official Twitter/X account';
COMMENT ON COLUMN bi_contract_index.github_url IS 'Source code repository';
COMMENT ON COLUMN bi_contract_index.is_verified IS 'Whether contract is verified/audited';

-- Real-time metrics tables (computed from Starknet blockchain data)
COMMENT ON TABLE project_metrics_realtime IS 'Real-time analytics for individual Starknet projects/contracts - computed from Starknet blockchain data (blocks, transactions, events)';
COMMENT ON COLUMN project_metrics_realtime.contract_address IS 'Starknet contract being analyzed';
COMMENT ON COLUMN project_metrics_realtime.total_customers IS 'Total unique Starknet wallet addresses that interacted with this contract';
COMMENT ON COLUMN project_metrics_realtime.daily_active_customers IS 'Unique Starknet wallets active in last 24h';
COMMENT ON COLUMN project_metrics_realtime.total_transactions IS 'Total Starknet transaction count for this contract';
COMMENT ON COLUMN project_metrics_realtime.successful_transactions IS 'Count of successful Starknet transactions';
COMMENT ON COLUMN project_metrics_realtime.total_volume_eth IS 'Total Starknet transaction volume in ETH for this contract';
COMMENT ON COLUMN project_metrics_realtime.total_volume_usd IS 'Total Starknet transaction volume in USD';
COMMENT ON COLUMN project_metrics_realtime.growth_score IS 'Computed growth score (0-100)';
COMMENT ON COLUMN project_metrics_realtime.health_score IS 'Computed health score (0-100)';
COMMENT ON COLUMN project_metrics_realtime.risk_score IS 'Computed risk score (0-100)';

COMMENT ON TABLE category_metrics_realtime IS 'Real-time metrics aggregated by Starknet contract category (DeFi, NFT, etc.) - computed from Starknet blockchain data';
COMMENT ON TABLE chain_metrics_daily IS 'Daily aggregated metrics for Starknet blockchain - computed from Starknet blockchain data';
COMMENT ON TABLE project_metrics_daily IS 'Daily historical metrics for individual Starknet projects - computed from Starknet blockchain data';
COMMENT ON TABLE wallet_metrics_realtime IS 'Real-time analytics for individual Starknet wallet addresses - computed from Starknet blockchain data';

-- =============================================================================
-- APPLICATION & USER MANAGEMENT TABLES
-- =============================================================================

COMMENT ON TABLE users IS 'Application users and authentication data';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access to analytics';
COMMENT ON TABLE projects IS 'Project definitions and metadata';
COMMENT ON TABLE watchlist IS 'User watchlists for tracking specific contracts/wallets';
COMMENT ON TABLE alerts IS 'Alert definitions for monitoring conditions';
COMMENT ON TABLE alert_history IS 'Historical alert triggers and notifications';

-- =============================================================================
-- SYSTEM & INFRASTRUCTURE TABLES
-- =============================================================================

COMMENT ON TABLE sync_state IS 'Synchronization state for Starknet indexer (last processed block, etc.)';
COMMENT ON TABLE chain_config IS 'Blockchain configuration and parameters';
COMMENT ON TABLE schema_migrations IS 'Database schema version tracking';
COMMENT ON TABLE logs IS 'Application logs and system events';

-- Multi-chain support tables
COMMENT ON TABLE mc_chains IS 'Multi-chain configuration (Starknet, Lisk, etc.)';
COMMENT ON TABLE mc_transaction_details IS 'Cross-chain transaction details and mappings';

-- =============================================================================
-- DATA FLOW SUMMARY
-- =============================================================================

/*
DATA FLOW ARCHITECTURE:

1. RAW DATA INGESTION:
   Starknet RPC → blocks, transactions, contracts, events, etc.
   Lisk RPC → lisk_blocks, lisk_transactions, lisk_contracts, etc.

2. DATA PROCESSING:
   Raw blockchain data → Business Intelligence processing → Metrics tables

3. ANALYTICS GENERATION:
   - bi_contract_index: Manual curation + automated classification
   - project_metrics_realtime: Computed from transactions, events, wallet_interactions
   - category_metrics_realtime: Aggregated from project_metrics_realtime
   - chain_metrics_daily: Aggregated from all blockchain data

4. USER ACCESS:
   - API endpoints serve data from metrics tables
   - Users manage watchlists, alerts, and access via api_keys
   - Real-time dashboards powered by *_realtime tables
   - Historical analysis powered by *_daily tables

TABLE RELATIONSHIPS:
- Starknet tables: blocks ← transactions ← events ← contracts
- Lisk tables: lisk_blocks ← lisk_transactions ← lisk_contracts
- BI tables: bi_contract_index → project_metrics_realtime → category_metrics_realtime
- User tables: users → api_keys, watchlist, alerts
*/
