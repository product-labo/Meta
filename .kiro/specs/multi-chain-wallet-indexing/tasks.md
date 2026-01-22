# Implementation Plan

- [x] 1. Database schema setup and migrations
  - Create wallets table with multi-chain support
  - Create indexing_jobs table for job tracking
  - Create contract_abi_features table for ABI storage
  - Create wallet_transactions unified table
  - Create wallet_events table
  - Add indexes for performance optimization
  - _Requirements: 4.4, 8.2, 8.3_

- [x] 1.1 Write property test for transaction uniqueness constraint
  - **Property 4: Transaction uniqueness**
  - **Validates: Requirements 4.4, 6.4**

- [x] 2. Backend API endpoints for wallet management
  - Implement POST /api/projects/:projectId/wallets endpoint
  - Implement GET /api/projects/:projectId/wallets endpoint
  - Implement GET /api/projects/:projectId/wallets/:walletId endpoint
  - Implement POST /api/projects/:projectId/wallets/:walletId/refresh endpoint
  - Add address validation middleware
  - Add authentication and authorization checks
  - _Requirements: 1.1, 1.4, 5.1, 5.2, 6.1, 6.2_

- [x] 2.1 Write property test for address validation consistency
  - **Property 1: Address validation consistency**
  - **Validates: Requirements 1.2, 2.2, 2.3**

- [x] 2.2 Write unit tests for wallet API endpoints
  - Test wallet creation with valid data
  - Test wallet creation with invalid address
  - Test duplicate wallet prevention
  - Test wallet listing and filtering
  - _Requirements: 1.1, 1.4, 5.3_

- [x] 3. Address validation service
  - Implement EVM address format validation (42 chars, hex)
  - Implement Starknet address format validation (64+ chars, hex)
  - Create chain-specific validation rules
  - Add validation error messages with format examples
  - _Requirements: 1.2, 1.3, 1.5, 2.2, 2.3_

- [x] 3.1 Write property test for chain type detection
  - **Property 6: Chain type detection**
  - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 4. ABI Parser service
  - Implement ABI parsing for JSON format
  - Implement ABI parsing for human-readable format
  - Extract function signatures and selectors
  - Extract event signatures and topics
  - Categorize functions (swap, bridge, transfer, custom)
  - Store parsed ABI features in database
  - _Requirements: 8.1, 8.2_

- [x] 4.1 Write property test for ABI parsing completeness
  - **Property 5: ABI parsing completeness**
  - **Validates: Requirements 8.1, 8.2**

- [x] 4.2 Write unit tests for ABI parser
  - Test parsing standard ERC20 ABI
  - Test parsing standard ERC721 ABI
  - Test parsing custom contract ABI
  - Test function categorization logic
  - Test error handling for invalid ABI
  - _Requirements: 8.1, 8.2_

- [x] 5. Indexing orchestrator service
  - Create IndexingOrchestrator class
  - Implement job queue management
  - Implement job prioritization logic
  - Add job lifecycle tracking (queued → running → completed/failed)
  - Implement progress event emission
  - Add job status query methods
  - _Requirements: 3.1, 3.4, 9.1, 9.2, 9.3_

- [x] 5.1 Write property test for indexing job creation
  - **Property 2: Indexing job creation**
  - **Validates: Requirements 1.4, 5.4**

- [x] 5.2 Write unit tests for orchestrator
  - Test job queue operations
  - Test job prioritization
  - Test job status transitions
  - Test progress event emission
  - _Requirements: 3.1, 3.4_

- [x] 6. EVM indexer worker
  - Create EVMIndexerWorker class
  - Implement RPC connection with failover support
  - Implement block range fetching in batches
  - Implement transaction filtering for wallet address
  - Implement transaction decoding using ABI
  - Store transactions in wallet_transactions table
  - Store events in wallet_events table
  - Emit progress updates during indexing
  - _Requirements: 4.1, 4.2, 4.3, 11.1, 11.2, 11.3_

- [x] 6.1 Write property test for RPC failover preservation
  - **Property 8: RPC failover preservation**
  - **Validates: Requirements 11.1, 11.3, 11.5**

- [x] 6.2 Write property test for incremental indexing correctness
  - **Property 7: Incremental indexing correctness**
  - **Validates: Requirements 6.2, 6.4**

- [x] 6.3 Write unit tests for EVM indexer
  - Test block fetching with mock RPC
  - Test transaction filtering logic
  - Test transaction decoding
  - Test RPC failover mechanism
  - Test error handling for failed blocks
  - _Requirements: 4.1, 4.2, 11.1_

- [x] 7. Starknet indexer worker
  - Create StarknetIndexerWorker class
  - Implement Starknet RPC connection
  - Implement block fetching for Starknet
  - Implement transaction filtering for wallet address
  - Implement internal call processing
  - Store Starknet transactions with chain_type='starknet'
  - Store Starknet events
  - Emit progress updates during indexing
  - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.4_

- [x] 7.1 Write unit tests for Starknet indexer
  - Test Starknet block fetching
  - Test transaction filtering
  - Test internal call processing
  - Test data storage with correct chain_type
  - _Requirements: 4.1, 4.2, 7.4_

- [x] 8. WebSocket server for real-time progress
  - Set up WebSocket server endpoint /ws/indexing/:walletId
  - Implement connection authentication
  - Implement progress message broadcasting
  - Handle client disconnections gracefully
  - Implement reconnection logic
  - Add message queuing for offline clients
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 8.1 Write property test for WebSocket message ordering
  - **Property 11: WebSocket message ordering**
  - **Validates: Requirements 3.2, 3.3**

- [x] 8.2 Write integration tests for WebSocket
  - Test connection establishment
  - Test message delivery
  - Test reconnection after disconnect
  - Test message ordering
  - _Requirements: 3.2, 3.3_

- [x] 9. Indexing status API endpoint
  - Implement GET /api/projects/:projectId/wallets/:walletId/indexing-status
  - Query indexing job from database
  - Calculate progress metrics (percentage, ETA)
  - Return current indexing state
  - Handle completed and error states
  - _Requirements: 3.1, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9.1 Write property test for progress calculation accuracy
  - **Property 10: Progress calculation accuracy**
  - **Validates: Requirements 3.2, 9.1**

- [x] 9.2 Write unit tests for status endpoint
  - Test status retrieval for active job
  - Test status retrieval for completed job
  - Test status retrieval for failed job
  - Test progress calculation
  - _Requirements: 3.1, 9.1_

- [x] 10. Frontend wallet onboarding form component
  - Create WalletOnboardingForm component
  - Implement address input with validation
  - Implement chain selection dropdown (EVM + Starknet)
  - Add real-time address format validation
  - Display chain-specific format hints
  - Handle form submission to API
  - Display validation errors inline
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4_

- [x] 10.1 Write unit tests for onboarding form
  - Test address validation UI feedback
  - Test chain selection behavior
  - Test form submission
  - Test error display
  - _Requirements: 1.2, 1.5, 2.4_

- [ ] 11. Frontend indexing progress widget component
  - Create IndexingProgressWidget component
  - Implement WebSocket connection to progress endpoint
  - Display progress bar with percentage
  - Display current metrics (blocks, transactions, events)
  - Calculate and display estimated time remaining
  - Display blocks per second processing speed
  - Handle error states with retry button
  - Implement automatic reconnection on disconnect
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11.1 Write property test for progress update monotonicity
  - **Property 3: Progress update monotonicity**
  - **Validates: Requirements 3.2, 3.3, 9.1**

- [x] 11.2 Write unit tests for progress widget
  - Test WebSocket connection
  - Test progress display updates
  - Test error state handling
  - Test reconnection logic
  - _Requirements: 3.2, 3.3, 3.5_

- [x] 12. Frontend wallet list component
  - Create WalletListComponent
  - Display all wallets for a project
  - Show indexing status badges (synced, indexing, error, queued)
  - Display last synced timestamp
  - Display transaction and event counts
  - Add "Refresh Data" button per wallet
  - Add "Add Wallet" button
  - Implement wallet detail navigation
  - _Requirements: 5.1, 5.5, 6.1, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 12.1 Write property test for status badge accuracy
  - **Property 12: Status badge accuracy**
  - **Validates: Requirements 12.2, 12.3, 12.4, 12.5**

- [x] 12.2 Write unit tests for wallet list
  - Test wallet display
  - Test status badge rendering
  - Test refresh button functionality
  - Test add wallet navigation
  - _Requirements: 5.1, 5.5, 12.1_

- [x] 13. Integrate wallet onboarding into startup flow
  - Update startup onboarding page to include wallet step
  - Add wallet form after project creation
  - Allow skipping wallet addition initially
  - Redirect to dashboard after wallet submission
  - Show indexing progress on dashboard immediately
  - _Requirements: 1.1, 1.4, 10.1, 10.2_

- [x] 13.1 Write integration test for complete onboarding flow
  - Test project creation → wallet addition → indexing start
  - Verify user can proceed to dashboard
  - Verify indexing runs in background
  - _Requirements: 1.1, 1.4, 10.1_

- [x] 14. Implement refresh data functionality
  - Add refresh button to wallet detail view
  - Query last indexed block from database
  - Create incremental indexing job (last_block + 1 to current)
  - Display refresh progress in real-time
  - Update wallet statistics after refresh
  - Handle case where wallet is already up-to-date
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14.1 Write integration test for refresh functionality
  - Test refresh with new data available
  - Test refresh with no new data
  - Verify no duplicate transactions created
  - _Requirements: 6.2, 6.4, 6.5_

- [x] 15. Implement multi-wallet support
  - Allow adding multiple wallets to single project
  - Ensure wallet data isolation per project
  - Display all wallets in project dashboard
  - Track indexing status independently per wallet
  - Support concurrent indexing for multiple wallets
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.3_

- [x] 15.1 Write property test for multi-wallet isolation
  - **Property 9: Multi-wallet isolation**
  - **Validates: Requirements 5.4, 10.3**

- [x] 15.2 Write integration test for multi-wallet
  - Test adding 3+ wallets to project
  - Verify data isolation
  - Verify independent indexing
  - _Requirements: 5.4, 10.3_

- [x] 16. Implement multi-project support
  - Allow users to create additional projects after onboarding
  - Maintain separate wallet lists per project
  - Ensure complete data isolation between projects
  - Display project selector in navigation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16.1 Write integration test for multi-project
  - Test creating multiple projects
  - Verify data isolation between projects
  - Test switching between projects
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 17. Error handling and retry logic
  - Implement RPC failover with multiple endpoints per chain
  - Add exponential backoff for rate limiting
  - Handle transaction decode failures gracefully
  - Store raw data when decode fails
  - Add manual retry button for failed jobs
  - Display user-friendly error messages
  - _Requirements: 3.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 17.1 Write unit tests for error handling
  - Test RPC failover mechanism
  - Test rate limit handling
  - Test decode failure handling
  - Test retry logic
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 18. Dashboard integration
  - Add indexing progress section to project dashboard
  - Display summary of all wallets with status
  - Show aggregate statistics (total transactions, events)
  - Add quick actions (refresh all, add wallet)
  - Implement real-time status updates
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 18.1 Write integration test for dashboard
  - Test dashboard displays correct wallet statuses
  - Test real-time updates
  - Test aggregate statistics
  - _Requirements: 12.1, 12.2_

- [x] 19. Performance optimization
  - Implement batch processing for large block ranges
  - Add database connection pooling
  - Optimize database queries with proper indexes
  - Implement caching for frequently accessed data
  - Add rate limiting for API endpoints
  - _Requirements: 4.1, 4.2, 8.3, 8.5_

- [x] 19.1 Write performance tests
  - Test indexing speed with large wallets
  - Test database query performance
  - Test concurrent indexing jobs
  - _Requirements: 4.1, 8.5_

- [x] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Documentation and deployment
  - Write API documentation for wallet endpoints
  - Create user guide for wallet onboarding
  - Document supported chains and requirements
  - Add deployment instructions for indexing workers
  - Create monitoring dashboard for indexing jobs
  - _Requirements: All_

- [x] 21.1 Write end-to-end integration tests
  - Test complete user journey from signup to indexed data
  - Test multi-chain scenarios
  - Test error recovery scenarios
  - Test using real data and contracts; Lisk address: 0x4200000000000000000000000000000000000006, Starknet address: 0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc
  - _Requirements: All_
