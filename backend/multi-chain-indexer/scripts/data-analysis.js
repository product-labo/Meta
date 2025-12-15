const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function analyzeDataCapture() {
    console.log('📊 MULTI-CHAIN INDEXER DATA ANALYSIS');
    console.log('='.repeat(80));

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();

        console.log('\n🎯 WHAT YOUR INDEXER CURRENTLY CAPTURES:');
        console.log('='.repeat(60));

        // Get current data stats
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM mc_chains WHERE is_active = true) as active_chains,
                (SELECT COUNT(*) FROM mc_registry) as monitored_addresses,
                (SELECT COUNT(*) FROM mc_chain_snapshots cs JOIN mc_rotation_cycles rc ON cs.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as chain_snapshots,
                (SELECT COUNT(*) FROM mc_entity_snapshots es JOIN mc_rotation_cycles rc ON es.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as entity_snapshots,
                (SELECT COUNT(*) FROM mc_event_logs el JOIN mc_rotation_cycles rc ON el.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as event_logs,
                (SELECT COUNT(*) FROM mc_contract_state cs JOIN mc_rotation_cycles rc ON cs.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as contract_calls,
                (SELECT COUNT(*) FROM mc_transactions tx JOIN mc_rotation_cycles rc ON tx.cycle_id = rc.id WHERE rc.status = 'ACTIVE') as transactions
        `);

        const data = stats.rows[0];

        console.log('✅ CURRENTLY CAPTURING:');
        console.log(`   📍 Monitored Addresses: ${data.monitored_addresses} (smart contracts + wallets)`);
        console.log(`   ⛓️  Active Chains: ${data.active_chains} (Ethereum, Polygon, BSC, Base, Starknet)`);
        console.log(`   📊 Chain Snapshots: ${data.chain_snapshots} (latest blocks, gas prices)`);
        console.log(`   🏠 Entity Snapshots: ${data.entity_snapshots} (balances, nonces, contract state)`);
        console.log(`   📝 Event Logs: ${data.event_logs} (contract events, transfers, approvals)`);
        console.log(`   🔧 Contract Calls: ${data.contract_calls} (function call results)`);
        console.log(`   💸 Transactions: ${data.transactions} (full transaction data)`);

        console.log('\n📋 DETAILED BREAKDOWN:');
        console.log('='.repeat(60));

        console.log('🏠 PER ADDRESS DATA:');
        console.log('   • Balance (native token: ETH, MATIC, BNB, etc.)');
        console.log('   • Nonce (transaction count)');
        console.log('   • Contract status (is it a smart contract?)');
        console.log('   • Code hash (contract bytecode hash)');
        console.log('   • Timestamp of capture');

        console.log('\n📝 EVENT LOGS (Real-time contract interactions):');
        console.log('   • Block number where event occurred');
        console.log('   • Transaction hash that triggered the event');
        console.log('   • Event signature (topic0) - what type of event');
        console.log('   • Raw event data');
        console.log('   • Contract that emitted the event');

        console.log('\n⛓️  CHAIN-LEVEL DATA:');
        console.log('   • Latest block number');
        console.log('   • Block timestamp');
        console.log('   • Gas prices (base fee, priority fee)');
        console.log('   • Fee history trends');

        console.log('\n💸 TRANSACTION DATA (Schema supports):');
        console.log('   • Transaction hash');
        console.log('   • From/To addresses');
        console.log('   • Value transferred');
        console.log('   • Gas price & gas used');
        console.log('   • Transaction status (success/failed)');
        console.log('   • Input data (function calls)');

        // Check what event types we're seeing
        console.log('\n🔍 SAMPLE EVENT ANALYSIS:');
        console.log('='.repeat(60));

        const eventSample = await client.query(`
            SELECT 
                el.topic0,
                COUNT(*) as count,
                c.name as chain_name,
                r.name as contract_name
            FROM mc_event_logs el
            JOIN mc_registry r ON el.registry_id = r.id
            JOIN mc_chains c ON r.chain_id = c.id
            JOIN mc_rotation_cycles rc ON el.cycle_id = rc.id
            WHERE rc.status = 'ACTIVE'
            GROUP BY el.topic0, c.name, r.name
            ORDER BY count DESC
            LIMIT 10
        `);

        eventSample.rows.forEach(row => {
            let eventType = 'Unknown';
            if (row.topic0 === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                eventType = 'ERC20 Transfer';
            } else if (row.topic0 === '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925') {
                eventType = 'ERC20 Approval';
            }

            console.log(`   ${eventType}: ${row.count} events`);
            console.log(`     Chain: ${row.chain_name}, Contract: ${row.contract_name}`);
            console.log(`     Topic: ${row.topic0}`);
            console.log('');
        });

        console.log('\n❌ WHAT IT\'S NOT CURRENTLY CAPTURING:');
        console.log('='.repeat(60));
        console.log('   ❌ Function signatures/names (only raw data)');
        console.log('   ❌ Decoded function parameters');
        console.log('   ❌ Failed transaction details');
        console.log('   ❌ Internal transactions (contract-to-contract calls)');
        console.log('   ❌ Token transfer amounts (decoded)');
        console.log('   ❌ DeFi protocol-specific data (swaps, liquidity, etc.)');
        console.log('   ❌ Address labels/names');
        console.log('   ❌ Transaction traces');

        console.log('\n🚀 WHAT IT COULD EASILY CAPTURE (with enhancements):');
        console.log('='.repeat(60));
        console.log('   ✅ Decoded function calls (with ABI)');
        console.log('   ✅ Token transfer amounts and recipients');
        console.log('   ✅ DeFi swap data (amounts, prices)');
        console.log('   ✅ NFT transfers and metadata');
        console.log('   ✅ Failed transaction reasons');
        console.log('   ✅ Contract creation events');
        console.log('   ✅ Address interaction patterns');
        console.log('   ✅ Real-time alerts on specific events');

        console.log('\n📈 CURRENT PERFORMANCE:');
        console.log('='.repeat(60));

        const performance = await client.query(`
            SELECT 
                c.name as chain_name,
                COUNT(cs.id) as snapshots,
                MIN(cs.captured_at) as first_capture,
                MAX(cs.captured_at) as last_capture,
                EXTRACT(EPOCH FROM (MAX(cs.captured_at) - MIN(cs.captured_at)))/60 as duration_minutes
            FROM mc_chain_snapshots cs
            JOIN mc_chains c ON cs.chain_id = c.id
            JOIN mc_rotation_cycles rc ON cs.cycle_id = rc.id
            WHERE rc.status = 'ACTIVE'
            GROUP BY c.name
            ORDER BY snapshots DESC
        `);

        performance.rows.forEach(row => {
            const rate = row.duration_minutes > 0 ? (row.snapshots / row.duration_minutes).toFixed(2) : 'N/A';
            console.log(`   ${row.chain_name.toUpperCase()}:`);
            console.log(`     Snapshots: ${row.snapshots}`);
            console.log(`     Rate: ${rate} snapshots/minute`);
            console.log(`     Duration: ${Math.round(row.duration_minutes)} minutes`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
    } finally {
        await client.end();
    }
}

analyzeDataCapture();