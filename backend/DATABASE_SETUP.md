# Quick Database Setup

## TL;DR - Get Started in 3 Steps

```bash
# 1. Install PostgreSQL (if not installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@15
# Linux: sudo apt install postgresql

# 2. Run automated setup
npm run setup:local-db

# 3. Test connection
npm run test:db
```

## What Gets Created

The setup script will:
- ✓ Create database: `boardling_lisk`
- ✓ Create user: `boardling_user`
- ✓ Run all migrations (creates tables)
- ✓ Grant necessary permissions

## Available Commands

```bash
# Setup local PostgreSQL database
npm run setup:local-db

# Test database connection
npm run test:db

# Test Lisk RPC endpoints
npm run test:rpc

# Start the application
npm start
```

## Configuration

Your `.env` file should have:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=boardling_user
DB_PASS=yourpassword
DB_NAME=boardling_lisk
```

## Troubleshooting

### "Connection refused"
- PostgreSQL is not running
- Start it: `brew services start postgresql` (macOS) or check Services (Windows)

### "Authentication failed"
- Wrong password in `.env`
- Reset password: `ALTER USER boardling_user WITH PASSWORD 'newpassword';`

### "Database does not exist"
- Run: `npm run setup:local-db`

## Full Documentation

See `setup-local-postgres.md` for complete setup guide including:
- Installation instructions for all platforms
- Docker setup
- Manual setup steps
- Advanced configuration
- Backup/restore procedures

## Database Schema

Tables created:
- `users` - User accounts
- `projects` - Project information
- `wallets` - Lisk wallet addresses
- `invoices` - Payment invoices
- `lisk_transactions` - Blockchain transactions
- `lisk_analytics` - Analytics data
- `subscriptions` - User subscriptions

## Need Help?

1. Check `setup-local-postgres.md` for detailed guide
2. Run `npm run test:db` to diagnose connection issues
3. Check PostgreSQL logs for errors
