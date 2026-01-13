# Starknet RPC Query System

A comprehensive blockchain data indexing and querying platform for Starknet that ingests data from Starknet nodes via RPC calls, stores it in a structured PostgreSQL database, and provides efficient access to blockchain state, transactions, contracts, and analytical insights.

## Features

- **RPC Client Layer**: Handles communication with Starknet nodes with retry logic and error handling
- **Data Ingestion Pipeline**: Processes and stores blockchain data with failure recovery
- **Query Interface**: Provides efficient access to indexed blockchain data
- **Property-Based Testing**: Comprehensive testing using fast-check for correctness validation
- **Analytics Support**: Tracks wallet interactions, contract usage, and network statistics

## Architecture

The system consists of three main components:

1. **RPC Client Layer** - Manages communication with Starknet nodes
2. **Data Ingestion Pipeline** - Processes and stores blockchain data
3. **Query Interface** - Provides access to indexed data

## Installation

```bash
npm install
```

## Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Configure the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `STARKNET_RPC_URL`: Starknet RPC endpoint URL
- `BATCH_SIZE`: Number of blocks to process in each batch
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
# Run all tests
npm test

# Run property-based tests
npm run test:property

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── models/           # Data models and interfaces
├── interfaces/       # Core system interfaces
├── services/         # Business logic services
│   ├── rpc/         # RPC client services
│   ├── ingestion/   # Data ingestion services
│   └── query/       # Query services
├── repositories/     # Data access layer
├── database/         # Database connection and migrations
├── utils/           # Utility functions
└── test/            # Test utilities and generators
```

## Core Interfaces

### RPC Client
- `IStarknetRPCClient`: Main RPC client interface
- `IConnectionManager`: Connection management
- `IRequestFormatter`: Request formatting
- `IResponseParser`: Response parsing

### Data Ingestion
- `IIngestionOrchestrator`: Orchestrates ingestion process
- `IBlockProcessor`: Processes block data
- `ITransactionProcessor`: Processes transaction data
- `IContractProcessor`: Processes contract data
- `IEventProcessor`: Processes event data

### Database
- `IDatabaseConnection`: Database connection management
- `IDatabaseTransaction`: Transaction management
- `IMigrationManager`: Database migration management

### Repositories
- `IBlockRepository`: Block data access
- `ITransactionRepository`: Transaction data access
- `IContractRepository`: Contract data access
- `IEventRepository`: Event data access
- `IWalletRepository`: Wallet data access

## Testing

The system uses a dual testing approach:

### Unit Tests
- Verify specific examples and edge cases
- Test component integration
- Validate error scenarios

### Property-Based Tests
- Verify universal properties across all inputs
- Use fast-check library with 100+ iterations per property
- Test correctness properties defined in the design document

## License

MIT