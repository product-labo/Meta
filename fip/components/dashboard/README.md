# Dashboard Components

This directory contains dashboard-related components for the MetaGauge platform.

## IndexingProgressWidget

A real-time progress widget that displays blockchain indexing status with WebSocket updates.

### Features

- **Real-time Progress Updates**: Connects via WebSocket to display live indexing progress
- **Progress Monotonicity**: Ensures progress values never decrease (ignores non-monotonic updates)
- **Automatic Reconnection**: Implements exponential backoff for connection failures
- **Error Handling**: Displays user-friendly error messages with retry options
- **Responsive Design**: Works on desktop and mobile devices

### Usage

```tsx
import { IndexingProgressWidget } from '@/components/dashboard'

function WalletDashboard() {
  return (
    <div className="space-y-4">
      <IndexingProgressWidget 
        walletId="wallet-123"
        projectId="project-456"
      />
    </div>
  )
}
```

### Props

- `walletId` (string): The ID of the wallet being indexed
- `projectId` (string): The ID of the project containing the wallet
- `className` (string, optional): Additional CSS classes

### WebSocket Protocol

The component expects WebSocket messages in the following format:

```typescript
// Progress update
{
  type: 'progress',
  data: {
    walletId: string,
    status: 'queued' | 'indexing' | 'completed' | 'error',
    currentBlock: number,
    totalBlocks: number,
    startBlock: number,
    endBlock: number,
    transactionsFound: number,
    eventsFound: number,
    blocksPerSecond: number,
    estimatedTimeRemaining: number
  }
}

// Completion
{
  type: 'complete',
  data: {
    walletId: string
  }
}

// Error
{
  type: 'error',
  data: {
    walletId: string,
    errorMessage: string
  }
}
```

### API Integration

The component fetches initial status from:
```
GET /api/projects/{projectId}/wallets/{walletId}/indexing-status
```

Expected response:
```json
{
  "status": "success",
  "data": {
    "walletId": "wallet-123",
    "status": "indexing",
    "currentBlock": 150,
    "totalBlocks": 200,
    "startBlock": 100,
    "endBlock": 299,
    "transactionsFound": 25,
    "eventsFound": 10,
    "blocksPerSecond": 2.5,
    "estimatedTimeRemaining": 60,
    "lastIndexedBlock": 149,
    "lastSyncedAt": "2023-12-18T19:30:00Z"
  }
}
```

### Testing

The component includes comprehensive tests:

- **Property-based tests**: Verify progress monotonicity and calculation accuracy
- **Unit tests**: Test WebSocket connection, error handling, and UI updates
- **Integration tests**: Test API integration and reconnection logic

Run tests with:
```bash
npm test -- --testPathPatterns="indexing-progress-widget"
```

### Requirements Validation

This component validates the following requirements:

- **3.1, 3.2, 3.3**: Real-time progress display with WebSocket connection
- **3.4, 3.5**: Error handling and reconnection logic  
- **9.1, 9.2, 9.3**: Progress metrics display (blocks, transactions, events)
- **9.4, 9.5**: Speed calculation and ETA display