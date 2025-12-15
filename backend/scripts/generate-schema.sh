#!/bin/bash

# Generate Schema Script
# Creates a clean schema file without data

# Get database credentials from .env
source backend/.env 2>/dev/null || source .env 2>/dev/null

SCHEMA_FILE="backend/schema.sql"
TEMP_FILE="backend/schema-new.sql"

echo "🔄 Generating schema..."
echo "📊 Database: $DB_NAME"

# Run pg_dump for schema only
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -p ${DB_PORT:-5432} \
  -U $DB_USER \
  -d $DB_NAME \
  --schema-only \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -f "$TEMP_FILE"

if [ $? -eq 0 ]; then
  # Backup old schema
  if [ -f "$SCHEMA_FILE" ]; then
    cp "$SCHEMA_FILE" "${SCHEMA_FILE}.backup"
    echo "📦 Old schema backed up to ${SCHEMA_FILE}.backup"
  fi
  
  # Replace with new schema
  mv "$TEMP_FILE" "$SCHEMA_FILE"
  
  echo "✅ Schema generated successfully!"
  echo "📁 Schema file: $SCHEMA_FILE"
  echo "📊 File size: $(du -h "$SCHEMA_FILE" | cut -f1)"
else
  echo "❌ Schema generation failed!"
  exit 1
fi
