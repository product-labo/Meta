# Zcash Paywall SDK - Scripts

This directory contains utility scripts for the Zcash Paywall SDK.

## Available Scripts

### setup.sh
Automated setup script for development environment.

```bash
./scripts/setup.sh
```

**What it does:**
- Checks Node.js and PostgreSQL installation
- Installs npm dependencies
- Creates .env file from template
- Creates and initializes database
- Sets up test database
- Provides next steps guidance

### Manual Setup (Alternative)

If you prefer manual setup:

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your configuration

# 3. Create database
createdb zcashpaywall

# 4. Apply schema
psql -d zcashpaywall -f schema.sql

# 5. Create test database (optional)
createdb zcashpaywall_test
psql -d zcashpaywall_test -f schema.sql
```

## Environment Configuration

Required environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=youruser
DB_PASS=yourpass
DB_NAME=zcashpaywall

# Zcash RPC
ZCASH_RPC_URL=http://127.0.0.1:8232
ZCASH_RPC_USER=yourrpcuser
ZCASH_RPC_PASS=yourlongpassword

# Platform Treasury (optional)
PLATFORM_TREASURY_ADDRESS=t1YourPlatformTreasury1111111111111111111
```

## Database Management

### Reset Database
```bash
dropdb zcashpaywall
createdb zcashpaywall
psql -d zcashpaywall -f schema.sql
```

### Backup Database
```bash
pg_dump zcashpaywall > backup.sql
```

### Restore Database
```bash
psql -d zcashpaywall < backup.sql
```

## Development Workflow

1. **Initial Setup**
   ```bash
   ./scripts/setup.sh
   ```

2. **Configure Environment**
   ```bash
   nano .env  # Edit configuration
   ```

3. **Start Zcash Node**
   ```bash
   zcashd  # Start your Zcash daemon
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Production Deployment

For production deployment:

1. Use production database credentials
2. Set `NODE_ENV=production`
3. Configure proper CORS origins
4. Set up SSL/TLS termination
5. Configure rate limiting
6. Set up monitoring and logging
7. Use process manager (PM2, systemd)

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in .env
- Check database exists: `psql -l`

### Zcash RPC Issues
- Verify zcashd is running and synced
- Check RPC credentials in zcash.conf
- Test RPC connection: `zcash-cli getinfo`

### Permission Issues
- Ensure database user has proper permissions
- Check file permissions on scripts
- Verify Node.js can bind to specified port

## Additional Scripts (To Be Added)

Future scripts may include:
- Database migration scripts
- Backup automation
- Log rotation
- Health monitoring
- Performance testing
- Deployment automation
