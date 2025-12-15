# Boardling Backend Setup Guide

This guide will help you set up the unified Boardling backend for full frontend-backend synchronization.

## 🚀 Quick Start (Recommended)

### 1. Prerequisites
- Node.js 18+ 
- Docker (for PostgreSQL)
- Git

### 2. Environment Setup
The `.env` file is already configured for local development. Key settings:

```bash
# Server runs on port 3001 (matches frontend expectations)
PORT=3001

# Frontend CORS (Vite dev server)
CORS_ORIGIN=http://localhost:5173

# Database (PostgreSQL via Docker)
DB_HOST=localhost
DB_PORT=5432
DB_USER=boardling
DB_PASS=boardling123
DB_NAME=boardling
```

### 3. Database Setup
```bash
# Start PostgreSQL with Docker
docker run --name boardling-postgres \
  -e POSTGRES_PASSWORD=boardling123 \
  -e POSTGRES_USER=boardling \
  -e POSTGRES_DB=boardling \
  -p 5432:5432 -d postgres:15

# Set up database schema and test data
npm run setup-db
```

### 4. Start the Backend
```bash
npm install
npm start
```

### 5. Verify Everything is Working
```bash
npm run quick-start
```

## 🔧 Manual Setup (Alternative)

### Database Options

#### Option A: Docker PostgreSQL (Recommended)
```bash
docker run --name boardling-postgres \
  -e POSTGRES_PASSWORD=boardling123 \
  -e POSTGRES_USER=boardling \
  -e POSTGRES_DB=boardling \
  -p 5432:5432 -d postgres:15
```

#### Option B: Local PostgreSQL
1. Install PostgreSQL locally
2. Create database: `createdb boardling`
3. Update `.env` with your credentials

#### Option C: Cloud Database
Update `.env` with your cloud database credentials:
```bash
DB_HOST=your-cloud-db-host
DB_PORT=5432
DB_USER=your-username
DB_PASS=your-password
DB_NAME=your-database
```

### Zcash Node (Optional for Full Testing)

#### Testnet Node
```bash
# Download Zcash
# Configure for testnet in ~/.zcash/zcash.conf:
testnet=1
rpcuser=zcash-rpc-user
rpcpassword=zcash-rpc-password-123
rpcport=18232
```

#### Regtest (Local Testing)
```bash
# In ~/.zcash/zcash.conf:
regtest=1
rpcuser=zcash-rpc-user
rpcpassword=zcash-rpc-password-123
rpcport=18232
```

## 🧪 Testing the Setup

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Authentication Test
```bash
# Register a user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. API Access Test
```bash
# Get API documentation
curl http://localhost:3001/api
```

## 🌐 Frontend Integration

The backend is configured to work with the frontend at:
- **Frontend URL**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Frontend Environment Variables
Create a `.env` file in the frontend root:
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT=30000
```

## 📊 Available Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Password reset
- `POST /auth/reset-password` - Password reset confirmation

### Analytics (Protected)
- `GET /api/projects/:id/dashboard` - Dashboard data
- `GET /api/projects/:id/analytics` - Analytics summary
- `GET /api/analytics/cohorts/:projectId` - Cohort analysis
- `GET /api/analytics/funnel/:projectId` - Adoption funnel

### Payments
- `POST /api/invoice/create` - Create payment invoice
- `GET /api/invoice/:id` - Get invoice details
- `POST /api/invoice/check` - Check payment status

### System
- `GET /health` - Health check
- `GET /api` - API documentation

## 🔐 Security Features

- JWT authentication with configurable expiration
- Rate limiting (1000 requests per 15 minutes per IP)
- CORS protection
- Helmet security headers
- Input validation and sanitization

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs boardling-postgres

# Restart database
docker restart boardling-postgres
```

### Port Conflicts
If port 3001 is in use:
1. Update `PORT=3002` in `.env`
2. Update frontend API calls to use port 3002
3. Restart the backend

### CORS Issues
Make sure `CORS_ORIGIN` in `.env` matches your frontend URL:
```bash
CORS_ORIGIN=http://localhost:5173
```

### JWT Issues
If authentication fails:
1. Check `JWT_SECRET` is set in `.env`
2. Clear browser localStorage
3. Try registering a new user

## 📝 Development Notes

- The server automatically restarts on file changes with `npm run dev`
- Database schema is automatically created on first run
- Test data is created for development
- All routes are logged in development mode
- Error details are shown in development mode only

## 🚀 Production Deployment

For production, update these environment variables:
```bash
NODE_ENV=production
PORT=443
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=your-super-secure-production-jwt-secret
DB_HOST=your-production-db-host
ZCASH_RPC_URL=https://your-zcash-node
PLATFORM_TREASURY_ADDRESS=your-mainnet-treasury-address
```