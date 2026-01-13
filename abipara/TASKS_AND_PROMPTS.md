# Implementation Tasks & Prompts

## Phase 1: Infrastructure Setup (Week 1)

### Task 1.1: Database Schema Setup
**Prompt:** "Create a PostgreSQL database schema using Drizzle ORM for a multi-chain blockchain analytics platform. Include tables for chains, categories, smart_contracts, function_signatures, wallets, transactions, events, and receipts. Each table needs proper relationships, indexes, and UUID primary keys. Include TypeScript types and ensure the schema supports EVM, Starknet, and Beacon Chain data."

**Deliverables:**
- `lib/schema.ts` - Complete database schema
- `drizzle.config.ts` - Drizzle configuration
- Migration files in `migrations/` folder

### Task 1.2: Docker Environment Setup
**Prompt:** "Set up a Docker Compose environment for a blockchain indexing project with PostgreSQL database, Redis cache, and three separate indexer services (EVM, Starknet, Beacon). Include environment variables, health checks, and volume persistence. Add Grafana for monitoring."

**Deliverables:**
- `docker-compose.yml`
- `docker-compose.dev.yml` for development
- `.env.example` file
- Individual Dockerfiles for each indexer

### Task 1.3: Project Structure & Dependencies
**Prompt:** "Initialize a TypeScript Node.js project for blockchain data indexing using Apibara. Set up the project structure with separate folders for indexers, database schema, utilities, and types. Install all necessary dependencies including @apibara/indexer, @apibara/evm, @apibara/starknet, @apibara/beaconchain, drizzle-orm, and PostgreSQL drivers."

**Deliverables:**
- `package.json` with all dependencies
- `tsconfig.json` configuration
- Project folder structure
- Basic build and dev scripts

## Phase 2: Smart Contract Discovery (Week 2)

### Task 2.1: Contract Registry System
**Prompt:** "Build a smart contract registry system that can store and manage contract metadata including address, name, category (NFT, DeFi, DEX), ABI, and deployment information. Create functions to add contracts, fetch ABIs from Etherscan API, and extract function signatures. Include popular contracts like Uniswap V2/V3, AAVE, OpenSea."

**Deliverables:**
- `lib/contract-registry.ts`
- `scripts/populate-contracts.ts`
- Contract data in `data/contracts.json`
- ABI fetching utilities

### Task 2.2: Function Signature Database
**Prompt:** "Create a system to extract and store function signatures from smart contract ABIs. Build a database of function selectors (first 4 bytes of keccak256 hash) mapped to human-readable function names. Include utilities to decode function calls and match transaction input data to known functions."

**Deliverables:**
- `lib/function-signatures.ts`
- `scripts/extract-signatures.ts`
- Function signature database seeding
- Decoding utilities

### Task 2.3: Category Classification System
**Prompt:** "Implement a smart contract categorization system that can classify contracts into categories like NFT, DeFi, DEX, Gaming, DAO. Create both manual classification for known contracts and pattern-based auto-classification using contract bytecode analysis and function signature patterns."

**Deliverables:**
- `lib/categorization.ts`
- Category definitions and rules
- Auto-classification algorithms
- Manual override system

## Phase 3: Historical Data Ingestion (Week 3-4)

### Task 3.1: EVM Indexer Implementation
**Prompt:** "Implement an Apibara EVM indexer that processes Ethereum mainnet data. Filter for transactions to tracked smart contracts, extract function signatures, decode transaction data, process event logs, and store everything in PostgreSQL. Handle transaction receipts, gas data, and wallet interactions. Include error handling and progress tracking."

**Deliverables:**
- `indexers/evm.indexer.ts`
- Transaction processing logic
- Event log parsing
- Database insertion functions

### Task 3.2: Starknet Indexer Implementation
**Prompt:** "Create an Apibara Starknet indexer that processes Starknet transactions and events. Handle different transaction types (Invoke, Deploy, Declare), decode Starknet events, process L1-L2 messages, and track contract deployments. Store all data with proper Starknet-specific fields like field elements and resource bounds."

**Deliverables:**
- `indexers/starknet.indexer.ts`
- Starknet transaction processing
- Event decoding for Starknet
- L1-L2 message handling

### Task 3.3: Beacon Chain Indexer Implementation
**Prompt:** "Build an Apibara Beacon Chain indexer that processes consensus layer data including validator information, execution payloads, blob data, and withdrawals. Extract EVM transactions from execution payloads and track validator performance metrics."

**Deliverables:**
- `indexers/beacon.indexer.ts`
- Validator data processing
- Execution payload extraction
- Blob data handling

### Task 3.4: Backfill System
**Prompt:** "Create a backfill system that can process historical blockchain data efficiently. Implement chunked processing (1000 blocks per batch), parallel processing across multiple workers, progress tracking, and resumption capability. Include data validation and error recovery mechanisms."

**Deliverables:**
- `scripts/backfill.ts`
- Progress tracking system
- Batch processing logic
- Error recovery mechanisms

## Phase 4: Real-time Processing (Week 5)

### Task 4.1: Real-time Data Pipeline
**Prompt:** "Implement real-time data processing that switches from historical backfill to live streaming. Handle chain reorganizations, implement data validation, and ensure low-latency processing. Add monitoring for block processing lag and transaction parsing success rates."

**Deliverables:**
- Real-time processing logic
- Chain reorg handling
- Performance monitoring
- Alerting system

### Task 4.2: Data Enrichment System
**Prompt:** "Build a data enrichment pipeline that adds context to raw blockchain data. Include USD value calculations using price feeds, gas cost analysis, transaction success/failure categorization, and derived metrics calculation. Implement caching for frequently accessed data."

**Deliverables:**
- `lib/enrichment.ts`
- Price feed integration
- Metrics calculation
- Caching layer

### Task 4.3: Analytics Query System
**Prompt:** "Create a comprehensive analytics query system with pre-built queries for common analytics needs. Include contract interaction volume, function signature popularity, wallet behavior analysis, cross-chain comparisons, and time-series data. Optimize queries for performance with proper indexing."

**Deliverables:**
- `lib/analytics.ts`
- Pre-built query functions
- Database indexes
- Query optimization

## Phase 5: API & Frontend (Week 6)

### Task 5.1: REST API Development
**Prompt:** "Build a REST API using Express.js that exposes the blockchain analytics data. Include endpoints for contract data, transaction history, wallet analytics, function signature stats, and cross-chain comparisons. Implement pagination, filtering, and rate limiting."

**Deliverables:**
- `api/server.ts`
- Route handlers
- API documentation
- Rate limiting middleware

### Task 5.2: GraphQL API (Optional)
**Prompt:** "Create a GraphQL API layer that provides flexible querying capabilities for the blockchain analytics data. Include resolvers for all data types, implement DataLoader for efficient database queries, and add real-time subscriptions for live data updates."

**Deliverables:**
- GraphQL schema
- Resolvers
- Subscription system
- DataLoader implementation

### Task 5.3: Basic Dashboard
**Prompt:** "Build a simple web dashboard using React/Next.js that displays key blockchain analytics metrics. Include charts for transaction volume, top contracts, function signature usage, and wallet activity. Make it responsive and include real-time updates."

**Deliverables:**
- React dashboard
- Chart components
- Real-time data updates
- Responsive design

## Monitoring & Operations

### Task M.1: Monitoring Setup
**Prompt:** "Set up comprehensive monitoring for the blockchain indexing system using Prometheus and Grafana. Monitor indexer performance, database metrics, API response times, and system resources. Create alerts for critical issues like indexer failures or high processing lag."

**Deliverables:**
- Prometheus configuration
- Grafana dashboards
- Alert rules
- Health check endpoints

### Task M.2: Logging System
**Prompt:** "Implement structured logging throughout the application using Winston or similar. Include log levels, structured JSON output, error tracking, and centralized log aggregation. Add correlation IDs for tracing requests across services."

**Deliverables:**
- Logging configuration
- Log aggregation setup
- Error tracking
- Log analysis tools

## Testing & Quality

### Task T.1: Unit Testing
**Prompt:** "Create comprehensive unit tests for all core functionality including database operations, data processing logic, function signature matching, and API endpoints. Use Jest and achieve >80% code coverage."

**Deliverables:**
- Test suites for all modules
- Mock data and fixtures
- Coverage reports
- CI/CD integration

### Task T.2: Integration Testing
**Prompt:** "Build integration tests that verify the complete data flow from blockchain data ingestion to API responses. Test indexer functionality with mock blockchain data and verify database consistency."

**Deliverables:**
- Integration test suites
- Mock blockchain data
- Database test utilities
- End-to-end test scenarios

## Deployment Tasks

### Task D.1: Production Deployment
**Prompt:** "Set up production deployment using Kubernetes or Docker Swarm. Include auto-scaling, load balancing, health checks, and rolling updates. Configure production database with proper backup and recovery procedures."

**Deliverables:**
- Kubernetes manifests
- Deployment scripts
- Backup procedures
- Scaling configuration

### Task D.2: CI/CD Pipeline
**Prompt:** "Create a CI/CD pipeline using GitHub Actions or similar that automatically tests, builds, and deploys the application. Include code quality checks, security scanning, and automated database migrations."

**Deliverables:**
- CI/CD configuration
- Automated testing
- Security scanning
- Deployment automation

---

## Task Execution Order

1. **Week 1**: Tasks 1.1 → 1.2 → 1.3
2. **Week 2**: Tasks 2.1 → 2.2 → 2.3
3. **Week 3**: Tasks 3.1 → 3.2 → 3.3
4. **Week 4**: Task 3.4 + Testing
5. **Week 5**: Tasks 4.1 → 4.2 → 4.3
6. **Week 6**: Tasks 5.1 → 5.2 → 5.3

**Parallel Tasks**: M.1, M.2, T.1, T.2 can be worked on alongside main tasks
**Final Phase**: D.1, D.2 for production deployment

Each task is designed to be completed independently with clear deliverables and can be assigned to different team members or completed sequentially.
