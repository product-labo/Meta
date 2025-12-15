#!/bin/bash

# Database Restore Script
# Restores database from a backup file

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "❌ Error: No backup file specified"
  echo "Usage: bash backend/scripts/restore-database.sh <backup-file>"
  echo "Example: bash backend/scripts/restore-database.sh backend/backups/backup-2025-12-04_12-13-05.sql"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Get database credentials from .env
source backend/.env 2>/dev/null || source .env 2>/dev/null

echo "⚠️  WARNING: This will replace all data in the database!"
echo "📊 Database: $DB_NAME"
echo "🏠 Host: $DB_HOST"
echo "📁 Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

echo ""
echo "🔄 Starting database restore..."

# Run psql to restore
PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -p ${DB_PORT:-5432} \
  -U $DB_USER \
  -d $DB_NAME \
  -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Restore completed successfully!"
  echo "🔍 Please verify your application is working correctly"
else
  echo ""
  echo "❌ Restore failed!"
  echo "⚠️  Your database may be in an inconsistent state"
  echo "💡 Consider restoring from a different backup"
  exit 1
fi
