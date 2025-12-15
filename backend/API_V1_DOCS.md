# API V1 Documentation

## Base URL
```
https://api.yourdomain.com/api/v1
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All responses follow this structure:
```json
{
  "success": true|false,
  "data": {...},
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

## User Data Endpoints

### GET /user/transactions
Get user's contract transactions with pagination.

**Query Parameters:**
- `projectId` (optional): Filter by specific project
- `limit` (optional): Number of results (1-1000, default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.yourdomain.com/api/v1/user/transactions?limit=10&offset=0"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transaction_hash": "0x...",
      "block_number": 1000000,
      "from_address": "0x...",
      "to_address": "0x...",
      "value": "1000000000000000000",
      "function_name": "transfer",
      "chain": "lisk",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### GET /user/events
Get user's contract events with pagination.

**Query Parameters:**
- `projectId` (optional): Filter by specific project
- `eventName` (optional): Filter by event name
- `limit` (optional): Number of results (1-1000, default: 50)
- `offset` (optional): Pagination offset (default: 0)

### GET /user/dashboard
Get user dashboard summary with recent activity.

**Response:**
```json
{
  "success": true,
  "data": {
    "recent_transactions": [...],
    "recent_events": [...],
    "sync_status": {
      "status": "success",
      "synced_at": "2025-01-01T00:00:00Z"
    },
    "summary": {
      "total_transactions": 150,
      "total_events": 75,
      "last_sync": "2025-01-01T00:00:00Z"
    }
  }
}
```

### GET /user/projects/:projectId/analytics
Get analytics for specific project.

**Path Parameters:**
- `projectId`: UUID of the project

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 100,
    "totalEvents": 50,
    "recentActivity": 25
  }
}
```

### POST /user/projects/:projectId/sync
Trigger secure data sync for project.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Sync completed successfully"
  }
}
```

### GET /user/sync-status
Get user's sync history.

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)

## AI Insights Endpoints

### POST /ai/analyze
Get AI insights for user's data.

**Request Body:**
```json
{
  "projectId": "uuid (optional)",
  "objective": "Custom analysis objective (optional)",
  "model": "AI model to use (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analysis_id",
    "summary": "AI generated insights...",
    "objective": "Analysis objective",
    "model": "open-mistral-7b",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### POST /ai/projects/:projectId/analyze
Get AI insights for specific project.

### GET /ai/insights
Get user's AI insights history.

**Query Parameters:**
- `projectId` (optional): Filter by project
- `limit` (optional): Number of results (default: 10)

### GET /ai/quick-insights
Get quick dashboard insights.

## Error Codes

- `INVALID_UUID`: Invalid UUID format
- `INVALID_LIMIT`: Invalid pagination limit
- `INVALID_OFFSET`: Invalid pagination offset
- `UNAUTHORIZED`: User doesn't own resource
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `SERVER_ERROR`: Internal server error

## Rate Limiting
- 1000 requests per hour per user
- 100 AI analysis requests per day per user

## Security Features
- JWT token authentication
- User ownership verification
- Input validation and sanitization
- SQL injection protection
- Rate limiting
- Audit logging
