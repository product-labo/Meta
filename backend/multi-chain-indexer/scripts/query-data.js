const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function queryIndexerData() {
    console.log('🔍 Querying Multi-Chain Indexer Data...\n');

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();

        // 1. Current rotation cycle info
        console.log('📊 CURRENT ROTATION CYCLE');
        console.log('='.repeat(50));
        const cycleResult = await client.query(`
            SELECT id, start_time, status, 
                   EXTRACT(EPOCH FROM (NOW() - start_time))/60 as minutes_running
            FROM mc_rotation_cycles 
            WHERE status = 'ACTIVE' 
            ORDER BY start_time DESC LIMIT 1
        `);

        if (cycleResult.rows.length > 0) {
            const cycle = cycleResult.rows[0];
            console.log(`Cycle ID: ${cycle.id}`);
            console.log(`Started: ${cycle.start_time}`);
            console.log(`Running for: ${Math.round(cycle.minutes_running)} minutes`);
            console.log(`Status: ${cycle.status}\n`);
        }

        // 2. Chain snapshots (latest block data per chain)
        console.log('⛓️  LATEST CHAIN SNAPSHOTS');
        console.log('='.repeat(50));
        const chainSnapshots = await client.query(`
            SELECT DISTINCT ON (c.name)
                c.name as chain_name,
                cs.block_number,
                cs.block_timestamp,
                cs.gas_price,
                cs.captured_at
            FROM mc_chain_snapshots cs
            JOIN mc_chains c ON cs.chain_id = c.id
            JOIN mc_rotation_cycles rc ON cs.cycle_id = rc.id
            WHERE rc.status = 'ACTIVE'
            ORDER BY c.name, cs.captured_at DESC
        `);

        chainSnapshots.rows.forEach(row => {
            console.log(`${row.chain_name.toUpperCase()}:`);
            console.log(`  Block: ${row.block_number}`);
            console.log(`  Timestamp: ${row.block_timestamp}`);
            console.log(`  Gas Price: ${row.gas_price}`);
            console.log(`  Captured: ${row.captured_at}`);
            console.log('');
        });

        // 3. Entity snapshots (contract data)
        console.log('📋 CONTRACT ENTITY SNAPSHOTS');
        console.log('='.repeat(50));
        const entitySnapshots = await client.query(`
            SELECT 
                c.name as chain_name,
                r.name as contract_name,
                r.address,
                r.category,
                es.balance,
                es.nonce,
                es.is_contract,
                es.captured_at
            FROM mc_entity_snapshots es
            JOIN mc_registry r ON es.registry_id = r.id
            JOIN mc_chains c ON r.chain_id = c.id
            JOIN mc_rotation_cycles rc ON es.cycle_id = rc.id
            WHERE rc.status = 'ACTIVE'
            ORDER BY es.captured_at DESC
            LIMIT 20
        `);

        entitySnapshots.rows.forEach(row => {
            console.log(`${row.chain_name} - ${row.contract_name || 'Unknown'}:`);
            console.log(`  Address: ${row.address}`);
            console.log(`  Category: ${row.category}`);
            console.log(`  Balance: ${row.balance}`);
            console.log(`  Nonce: ${row.nonce}`);
            console.log(`  Is Contract: ${row.is_contract}`);
            console.log(`  Captured: ${row.captured_at}`);
            console.log('');
        });

        // 4. Event logs
        console.log('📝 RECENT EVENT LOGS');
        console.log('='.repeat(50));
        const eventLogs = await client.query(`
            SELECT 
                c.name as chain_name,
                r.name as contract_name,
                el.block_number,
                el.tx_hash,
                el.topic0,
                el.captured_at
            FROM mc_event_logs el
            JOIN mc_registry r ON el.registry_id = r.id
            JOIN mc_chains c ON r.chain_id = c.id
            JOIN mc_rotation_cycles rc ON el.cycle_id = rc.id
            WHERE rc.status = 'ACTIVE'
            ORDER BY el.captured_at DESC
            LIMIT 10
        `);

        if (eventLogs.rows.length > 0) {
            eventLogs.rows.forEach(row => {
                console.log(`${row.chain_name} - ${row.contract_name || 'Unknown'}:`);
                console.log(`  Block: ${row.block_number}`);
                console.log(`  TX Hash: ${row.tx_hash}`);
                console.log(`  Topic0: ${row.topic0}`);
                console.log(`  Captured: ${row.captured_at}`);
                console.log('');
            });
        } else {
            console.log('No event logs captured yet.\n');
        }

        // 5. Summary statistics
        console.log('📈 SUMMARY STATISTICS');
        console.log('='.repeat(50));

        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM mc_chains WHERE is_active = true) as active_chains,
                (SELECT COUNT(*) FROM mc_registry) as total_contracts,
                (SELECT COUNT(*) FROM mc_chain_snapshots cs JOIN mc_rotation_cycles rc ON cs.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as chain_snapshots,
                (SELECT COUNT(*) FROM mc_entity_snapshots es JOIN mc_rotation_cycles rc ON es.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as entity_snapshots,
                (SELECT COUNT(*) FROM mc_event_logs el JOIN mc_rotation_cycles rc ON el.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as event_logs
        `);

        const summary = stats.rows[0];
        console.log(`Active Chains: ${summary.active_chains}`);
        console.log(`Total Contracts Monitored: ${summary.total_contracts}`);
        console.log(`Chain Snapshots (Current Cycle): ${summary.chain_snapshots}`);
        console.log(`Entity Snapshots (Current Cycle): ${summary.entity_snapshots}`);
        console.log(`Event Logs (Current Cycle): ${summary.event_logs}`);

        // 6. Data collection rate
        console.log('\n⏱️  DATA COLLECTION RATE');
        console.log('='.repeat(50));
        const rateQuery = await client.query(`
            SELECT 
                c.name as chain_name,
                COUNT(cs.id) as snapshots_count,
                MIN(cs.captured_at) as first_capture,
                MAX(cs.captured_at) as last_capture
            FROM mc_chain_snapshots cs
            JOIN mc_chains c ON cs.chain_id = c.id
            JOIN mc_rotation_cycles rc ON cs.cycle_id = rc.id
            WHERE rc.status = 'ACTIVE'
            GROUP BY c.name, c.id
            ORDER BY c.name
        `);

        rateQuery.rows.forEach(row => {
            const duration = new Date(row.last_capture) - new Date(row.first_capture);
            const minutes = duration / (1000 * 60);
            const rate = minutes > 0 ? (row.snapshots_count / minutes).toFixed(2) : 'N/A';

            console.log(`${row.chain_name.toUpperCase()}:`);
            console.log(`  Snapshots: ${row.snapshots_count}`);
            console.log(`  First: ${row.first_capture}`);
            console.log(`  Last: ${row.last_capture}`);
            console.log(`  Rate: ${rate} snapshots/minute`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Query failed:', error.message);
    } finally {
        await client.end();
    }
}

queryIndexerData();