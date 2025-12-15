# Multi-Chain Indexer CRUD API

This directory contains the REST API endpoints for frontend access to the multi-chain indexer data.

## 📋 API Structure

### Core Endpoints
- **Chains** - `/api/chains` - Chain information and status
- **Transactions** - `/api/transactions` - Transaction details and analytics
- **Events** - `/api/events` - Decoded event logs
- **Tokens** - `/api/tokens` - Token transfers and analytics
- **DeFi** - `/api/defi` - DeFi protocol interactions
- **Addresses** - `/api/addresses` - Address analytics and profiles
- **Contracts** - `/api/contracts` - Smart contract information
- **Analytics** - `/api/analytics` - Aggregated insights and metrics

## 🚀 Getting Started

We'll build each endpoint step by step:

1. **Step 1**: Chain data endpoints
2. **Step 2**: Transaction data endpoints  
3. **Step 3**: Event and token endpoints
4. **Step 4**: DeFi and address analytics
5. **Step 5**: Advanced analytics and insights

## 📊 Data Flow

```
Frontend Request → API Router → Data Service → Database → Response
```

Each endpoint will provide:
- **GET** - Read operations with filtering, pagination, sorting
- **POST** - Create operations (where applicable)
- **PUT** - Update operations (for user preferences, labels)
- **DELETE** - Delete operations (for user data only)

Let's start with Step 1 - Chain data!