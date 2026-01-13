#!/bin/bash

# Database Documentation Viewer
# Usage: ./view-db-docs.sh [table_name]

DB_HOST="localhost"
DB_PORT="5432"
DB_USER="david_user"
DB_NAME="david"
export PGPASSWORD="Davidsoyaya@1015"

if [ -z "$1" ]; then
    echo "=== DATABASE DOCUMENTATION OVERVIEW ==="
    echo ""
    echo "📊 STARKNET BLOCKCHAIN DATA TABLES:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        schemaname,
        tablename,
        obj_description(oid, 'pg_class') as description
    FROM pg_tables pt
    JOIN pg_class pc ON pc.relname = pt.tablename
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'lisk_%'
    AND tablename IN ('blocks', 'transactions', 'contracts', 'events', 'contract_classes', 'execution_calls', 'wallet_interactions', 'raw_rpc_responses')
    ORDER BY tablename;
    "
    
    echo ""
    echo "🔗 LISK BLOCKCHAIN DATA TABLES:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        schemaname,
        tablename,
        obj_description(oid, 'pg_class') as description
    FROM pg_tables pt
    JOIN pg_class pc ON pc.relname = pt.tablename
    WHERE schemaname = 'public' 
    AND tablename LIKE 'lisk_%'
    ORDER BY tablename;
    "
    
    echo ""
    echo "📈 BUSINESS INTELLIGENCE & METRICS TABLES:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        schemaname,
        tablename,
        obj_description(oid, 'pg_class') as description
    FROM pg_tables pt
    JOIN pg_class pc ON pc.relname = pt.tablename
    WHERE schemaname = 'public' 
    AND tablename IN ('bi_contract_categories', 'bi_contract_index', 'project_metrics_realtime', 'category_metrics_realtime', 'chain_metrics_daily', 'wallet_metrics_realtime')
    ORDER BY tablename;
    "
    
    echo ""
    echo "Usage: $0 [table_name] - View detailed documentation for specific table"
    
else
    TABLE_NAME="$1"
    echo "=== DOCUMENTATION FOR TABLE: $TABLE_NAME ==="
    echo ""
    
    # Table comment
    echo "📋 TABLE DESCRIPTION:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT obj_description('$TABLE_NAME'::regclass, 'pg_class') as table_description;
    "
    
    echo ""
    echo "📝 COLUMN DESCRIPTIONS:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        column_name,
        data_type,
        COALESCE(col_description(pgc.oid, a.attnum), 'No description') as column_description
    FROM information_schema.columns c
    JOIN pg_class pgc ON pgc.relname = c.table_name
    JOIN pg_attribute a ON a.attrelid = pgc.oid AND a.attname = c.column_name
    WHERE c.table_name = '$TABLE_NAME'
    AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
    "
    
    echo ""
    echo "📊 TABLE STATISTICS:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        COUNT(*) as total_records,
        pg_size_pretty(pg_total_relation_size('$TABLE_NAME')) as table_size
    FROM $TABLE_NAME;
    "
fi
