#!/bin/bash

# Database Backup Script
# Exports all tables and views to SQL format

# Get database credentials from .env
source backend/.env 2>/dev/null || source .env 2>/dev/null

# Set timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="backend/backups"
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "📊 Database: $DB_NAME"
echo "🏠 Host: $DB_HOST"

# Run pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -p ${DB_PORT:-5432} \
  -U $DB_USER \
  -d $DB_NAME \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully!"
  echo "📁 Backup file: $BACKUP_FILE"
  echo "📊 File size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
  echo "❌ Backup failed!"
  exit 1
fi
