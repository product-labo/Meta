# Manual Database Setup

Since automated setup is having authentication issues, here's how to set up the database manually:

## Step 1: Create the Database

Open **pgAdmin** or **psql** and run:

```sql
CREATE DATABASE boardling_lisk;
```

## Step 2: Update .env

Make sure your `.env` has:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=yourpassword
DB_NAME=boardling_lisk
```

## Step 3: Run Migrations

After creating the database, run:

```bash
node run-migrations-simple.js
```

Or manually run each SQL file in the `migrations/` folder in order.

## Alternative: Use Existing Database

If you want to use your existing `zcash_indexer` database instead:

1. Update `.env`:
   ```env
   DB_NAME=zcash_indexer
   ```

2. Run migrations:
   ```bash
   node run-migrations-simple.js
   ```

This will add the Lisk tables to your existing database.

## Quick Test

After setup, test the connection:

```bash
npm run test:db
```
