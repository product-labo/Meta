# Local PostgreSQL Setup Guide for Boardling/Lisk

This guide will help you set up a local PostgreSQL database for development and testing.

## Prerequisites

You need PostgreSQL installed on your system. Choose one of the following methods:

### Option 1: Install PostgreSQL (Recommended)

#### Windows:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer (recommended version: 15 or 16)
3. During installation:
   - Set password for postgres user (remember this!)
   - Default port: 5432
   - Install pgAdmin (optional GUI tool)

#### macOS:
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Option 2: Use Docker (Alternative)

```bash
# Run PostgreSQL in Docker
docker run --name boardling-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_USER=boardling_user \
  -e POSTGRES_DB=boardling_lisk \
  -p 5432:5432 \
  -d postgres:15

# To stop: docker stop boardling-postgres
# To start: docker start boardling-postgres
# To remove: docker rm -f boardling-postgres
```

## Quick Setup (Automated)

Run the setup script:

```bash
# Windows (PowerShell)
cd boardling/backend
node setup-local-db.js

# Or use npm script
npm run setup:db
```

This will:
1. Test PostgreSQL connection
2. Create database and user
3. Run all migrations
4. Verify setup

## Manual Setup

### Step 1: Create Database and User

Connect to PostgreSQL as superuser:

```bash
# Windows
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

Run these SQL commands:

```sql
-- Create user
CREATE USER boardling_user WITH PASSWORD 'yourpassword';

-- Create database
CREATE DATABASE boardling_lisk OWNER boardling_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE boardling_lisk TO boardling_user;

-- Connect to the database
\c boardling_lisk

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO boardling_user;

-- Exit
\q
```

### Step 2: Verify Connection

Test the connection:

```bash
node boardling/backend/test-db-connection.js
```

### Step 3: Run Migrations

Apply all database migrations:

```bash
cd boardling/backend
node run-migrations.js
```

## Database Configuration

Your `.env` file should have:

```env
# Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=boardling_user
DB_PASS=yourpassword
DB_NAME=boardling_lisk
LOCAL_CONNECTION_STRING=postgresql://boardling_user:yourpassword@localhost:5432/boardling_lisk
```

## Useful Commands

### Check PostgreSQL Status

```bash
# Windows
pg_ctl status -D "C:\Program Files\PostgreSQL\15\data"

# macOS (Homebrew)
brew services list

# Linux
sudo systemctl status postgresql
```

### Connect to Database

```bash
# Using psql
psql -h localhost -U boardling_user -d boardling_lisk

# Using connection string
psql postgresql://boardling_user:yourpassword@localhost:5432/boardling_lisk
```

### Common psql Commands

```sql
\l              -- List all databases
\c boardling_lisk  -- Connect to database
\dt             -- List all tables
\d table_name   -- Describe table structure
\du             -- List all users
\q              -- Quit
```

### Backup and Restore

```bash
# Backup
pg_dump -h localhost -U boardling_user boardling_lisk > backup.sql

# Restore
psql -h localhost -U boardling_user boardling_lisk < backup.sql
```

### Reset Database (Caution!)

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS boardling_lisk;"
psql -U postgres -c "CREATE DATABASE boardling_lisk OWNER boardling_user;"

# Then run migrations again
node run-migrations.js
```

## Troubleshooting

### Connection Refused

1. Check if PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Look for "postgresql-x64-15"
   
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Check `pg_hba.conf` file allows local connections:
   ```
   # Add this line if not present:
   host    all             all             127.0.0.1/32            md5
   ```

3. Restart PostgreSQL after changes

### Authentication Failed

1. Verify password in `.env` matches database user password
2. Try resetting password:
   ```sql
   ALTER USER boardling_user WITH PASSWORD 'newpassword';
   ```

### Port Already in Use

1. Check if another PostgreSQL instance is running
2. Change port in `.env` and `postgresql.conf`
3. Or stop the conflicting service

### Permission Denied

```sql
-- Grant all permissions
GRANT ALL PRIVILEGES ON DATABASE boardling_lisk TO boardling_user;
GRANT ALL ON SCHEMA public TO boardling_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO boardling_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO boardling_user;
```

## Database Schema

The database includes tables for:

- **users** - User accounts and authentication
- **projects** - Project information
- **wallets** - Lisk wallet addresses
- **invoices** - Payment invoices
- **lisk_transactions** - Blockchain transactions
- **lisk_analytics** - Analytics data
- **subscriptions** - User subscriptions

Run migrations to create all tables:
```bash
node run-migrations.js
```

## Testing

Run tests to verify database setup:

```bash
# Test connection
node test-db-connection.js

# Run all tests
npm test
```

## Production Considerations

For production, consider:

1. **Use strong passwords** - Generate secure passwords
2. **Enable SSL** - Set `DB_SSL_ENABLED=true`
3. **Connection pooling** - Configure `DB_POOL_SIZE`
4. **Backups** - Set up automated backups
5. **Monitoring** - Use tools like pgAdmin or DataDog
6. **Use managed services** - Consider AWS RDS, Supabase, or similar

## Additional Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- pgAdmin (GUI): https://www.pgadmin.org/
- Supabase (Managed PostgreSQL): https://supabase.com/
- Connection pooling: https://node-postgres.com/features/pooling
