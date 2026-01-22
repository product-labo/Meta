# Requirements Document

## Introduction

This feature enables startups to onboard their projects by connecting wallet addresses across multiple blockchain networks (including EVM chains and Starknet), automatically indexing all historical transaction data into a normalized PostgreSQL database, and providing real-time progress tracking during the indexing process. The system supports multiple wallets per project and allows users to refresh data from the last indexed block.

## Glossary

- **System**: The MetaGauge multi-chain analytics platform
- **User**: A startup founder or team member using the platform
- **Wallet Address**: A blockchain address (EVM or Starknet format) that the user wants to track
- **Chain**: A blockchain network (Ethereum, Polygon, Lisk, Starknet, etc.)
- **Indexing**: The process of fetching and storing blockchain transaction data
- **Normalized Data**: Transaction and event data stored in a queryable PostgreSQL format
- **Last Indexed Block**: The most recent block number that has been processed for a wallet
- **Indexing Progress**: Real-time status information about the indexing process
- **Project**: A startup's registered entity in the system
- **Multi-Wallet Support**: The ability to track multiple wallet addresses for a single project

## Requirements

### Requirement 1

**User Story:** As a startup founder, I want to add my project's wallet address during onboarding, so that the system can automatically pull all my blockchain data.

#### Acceptance Criteria

1. WHEN a user completes the startup info form THEN the system SHALL prompt for wallet address and chain selection
2. WHEN a user enters a wallet address THEN the system SHALL validate the address format based on the selected chain
3. WHEN a user selects a chain THEN the system SHALL display chain-specific address format requirements
4. WHEN a user submits a valid wallet address THEN the system SHALL store the wallet information and initiate indexing
5. WHEN the wallet address format is invalid THEN the system SHALL display an error message and prevent submission

### Requirement 2

**User Story:** As a startup founder, I want to select from multiple blockchain networks including Starknet, so that I can track my project regardless of which chain it's deployed on.

#### Acceptance Criteria

1. WHEN a user views the chain selection dropdown THEN the system SHALL display all supported EVM chains and Starknet
2. WHEN a user selects an EVM chain THEN the system SHALL expect a 42-character hexadecimal address format
3. WHEN a user selects Starknet THEN the system SHALL expect a 64+ character hexadecimal address format
4. WHEN a user switches chains THEN the system SHALL clear any previous address validation errors
5. WHEN the system detects the chain type THEN the system SHALL automatically configure the appropriate RPC endpoints

### Requirement 3

**User Story:** As a startup founder, I want to see real-time progress while my wallet data is being indexed, so that I know the system is working and how long it will take.

#### Acceptance Criteria

1. WHEN indexing starts THEN the system SHALL display a progress indicator showing current status
2. WHEN blocks are being processed THEN the system SHALL update the progress percentage in real-time
3. WHEN indexing is in progress THEN the system SHALL display the current block number being processed
4. WHEN indexing completes THEN the system SHALL display a success message with total transactions and events indexed
5. WHEN indexing encounters an error THEN the system SHALL display the error message and allow retry

### Requirement 4

**User Story:** As a startup founder, I want all my historical transaction data automatically pulled into the database, so that I can analyze my project's complete history.

#### Acceptance Criteria

1. WHEN indexing starts THEN the system SHALL fetch all transactions from the contract deployment block to current block
2. WHEN transactions are fetched THEN the system SHALL decode and normalize the data into PostgreSQL tables
3. WHEN events are detected THEN the system SHALL parse event parameters and store them in structured format
4. WHEN data is stored THEN the system SHALL maintain referential integrity between transactions, events, and wallets
5. WHEN indexing completes THEN the system SHALL update the last indexed block number for the wallet

### Requirement 5

**User Story:** As a startup founder, I want to add multiple wallet addresses to my project, so that I can track all addresses associated with my startup.

#### Acceptance Criteria

1. WHEN a user views their project dashboard THEN the system SHALL display an "Add Wallet" button
2. WHEN a user clicks "Add Wallet" THEN the system SHALL display the wallet addition form
3. WHEN a user adds a new wallet THEN the system SHALL validate it does not duplicate an existing wallet
4. WHEN a new wallet is added THEN the system SHALL initiate indexing for that wallet independently
5. WHEN multiple wallets exist THEN the system SHALL display all wallets with their individual indexing status

### Requirement 6

**User Story:** As a startup founder, I want to refresh my wallet data to get the latest transactions, so that my analytics stay up-to-date.

#### Acceptance Criteria

1. WHEN a user views a wallet THEN the system SHALL display a "Refresh Data" button
2. WHEN a user clicks "Refresh Data" THEN the system SHALL start indexing from the last indexed block to current block
3. WHEN refresh indexing runs THEN the system SHALL display progress similar to initial indexing
4. WHEN new data is found THEN the system SHALL append it to existing data without duplication
5. WHEN no new data exists THEN the system SHALL display a message indicating the wallet is up-to-date

### Requirement 7

**User Story:** As a startup founder, I want the system to automatically detect whether my contract is on EVM or Starknet, so that I don't have to manually specify technical details.

#### Acceptance Criteria

1. WHEN a user enters a wallet address THEN the system SHALL analyze the address format to determine chain type
2. WHEN the address is 42 characters THEN the system SHALL classify it as EVM format
3. WHEN the address is 64+ characters THEN the system SHALL classify it as Starknet format
4. WHEN the chain type is detected THEN the system SHALL automatically select appropriate indexing logic
5. WHEN auto-detection fails THEN the system SHALL prompt the user to manually select the chain type

### Requirement 8

**User Story:** As a startup founder, I want my indexed data to be normalized and queryable, so that I can run analytics queries efficiently.

#### Acceptance Criteria

1. WHEN transactions are indexed THEN the system SHALL store them in the ultimate_transactions table with normalized fields
2. WHEN events are indexed THEN the system SHALL store them in the ultimate_events table with decoded parameters
3. WHEN data is stored THEN the system SHALL create appropriate indexes for efficient querying
4. WHEN both EVM and Starknet data exist THEN the system SHALL use a unified schema with chain_type differentiation
5. WHEN queries are executed THEN the system SHALL return results within acceptable performance thresholds

### Requirement 9

**User Story:** As a startup founder, I want to see indexing progress with specific metrics, so that I understand what data is being collected.

#### Acceptance Criteria

1. WHEN indexing is active THEN the system SHALL display blocks processed count
2. WHEN indexing is active THEN the system SHALL display transactions found count
3. WHEN indexing is active THEN the system SHALL display events found count
4. WHEN indexing is active THEN the system SHALL display estimated time remaining
5. WHEN indexing is active THEN the system SHALL display current processing speed in blocks per second

### Requirement 10

**User Story:** As a startup founder, I want to be able to add additional projects after initial onboarding, so that I can track multiple startups from one account.

#### Acceptance Criteria

1. WHEN a user completes onboarding THEN the system SHALL allow access to "Add Project" functionality
2. WHEN a user adds a new project THEN the system SHALL follow the same wallet indexing flow
3. WHEN multiple projects exist THEN the system SHALL keep wallet data isolated per project
4. WHEN viewing projects THEN the system SHALL display indexing status for each project independently
5. WHEN switching between projects THEN the system SHALL maintain separate indexing progress tracking

### Requirement 11

**User Story:** As a system administrator, I want indexing to handle RPC failures gracefully, so that temporary network issues don't break the indexing process.

#### Acceptance Criteria

1. WHEN an RPC endpoint fails THEN the system SHALL automatically switch to a fallback RPC endpoint
2. WHEN all RPC endpoints fail THEN the system SHALL pause indexing and display an error message
3. WHEN RPC connection is restored THEN the system SHALL automatically resume indexing from the last successful block
4. WHEN rate limits are hit THEN the system SHALL implement exponential backoff retry logic
5. WHEN indexing resumes THEN the system SHALL not create duplicate records in the database

### Requirement 12

**User Story:** As a startup founder, I want to see which wallets are currently being indexed, so that I can monitor the system's activity.

#### Acceptance Criteria

1. WHEN viewing the project dashboard THEN the system SHALL display indexing status for each wallet
2. WHEN a wallet is actively indexing THEN the system SHALL show a "Indexing" badge with progress
3. WHEN a wallet indexing is complete THEN the system SHALL show a "Synced" badge with last update time
4. WHEN a wallet indexing has failed THEN the system SHALL show an "Error" badge with error details
5. WHEN no indexing is active THEN the system SHALL show all wallets as "Ready" for refresh
