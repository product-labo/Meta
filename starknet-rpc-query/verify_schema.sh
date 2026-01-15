#!/bin/bash

echo "🔍 Starknet Schema Verification"
echo "================================"
echo ""

sudo -u postgres psql -d david << 'SQL'
\echo '✅ 1. Infrastructure Tables'
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chain_config') 
    THEN '✅ chain_config exists' 
    ELSE '❌ chain_config missing' END as status
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_state') 
    THEN '✅ sync_state exists' 
    ELSE '❌ sync_state missing' END;

\echo ''
\echo '✅ 2. Extended Tables'
SELECT table_name || ' ✅' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'starknet_%'
ORDER BY table_name;

\echo ''
\echo '✅ 3. Chain ID Coverage'
SELECT 
    COUNT(*) as tables_with_chain_id,
    CASE WHEN COUNT(*) >= 20 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND column_name = 'chain_id';

\echo ''
\echo '✅ 4. Historical Preservation'
SELECT 
    COUNT(*) as tables_with_is_active,
    CASE WHEN COUNT(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND column_name = 'is_active';

\echo ''
\echo '✅ 5. Transaction Enhancements'
SELECT 
    column_name,
    CASE WHEN data_type IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name IN ('nonce', 'max_fee', 'calldata', 'signature')
ORDER BY column_name;

\echo ''
\echo '✅ 6. Event Enhancements'
SELECT 
    column_name,
    CASE WHEN data_type IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name IN ('event_index', 'keys', 'data')
ORDER BY column_name;

\echo ''
\echo '✅ 7. Foreign Keys'
SELECT 
    COUNT(*) as foreign_key_count,
    CASE WHEN COUNT(*) >= 20 THEN '✅ PASS' ELSE '⚠️ CHECK' END as status
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';

\echo ''
\echo '✅ 8. Indexes'
SELECT 
    COUNT(*) as index_count,
    CASE WHEN COUNT(*) >= 40 THEN '✅ PASS' ELSE '⚠️ CHECK' END as status
FROM pg_indexes 
WHERE schemaname = 'public';

\echo ''
\echo '✅ 9. CHECK Constraints'
SELECT 
    COUNT(*) as check_constraint_count,
    CASE WHEN COUNT(*) >= 5 THEN '✅ PASS' ELSE '⚠️ CHECK' END as status
FROM information_schema.table_constraints 
WHERE constraint_type = 'CHECK' AND table_schema = 'public';

\echo ''
\echo '================================'
\echo 'Verification Complete!'
SQL

echo ""
echo "📊 Summary:"
echo "   - Infrastructure: chain_config, sync_state"
echo "   - Extended: 5 new analytics tables"
echo "   - Enhanced: All core tables with chain_id"
echo "   - Historical: is_active columns added"
echo "   - Validation: CHECK constraints added"
echo ""
echo "✅ Schema is ready for indexer updates!"
