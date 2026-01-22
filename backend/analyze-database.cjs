const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
});

async function analyzeDatabase() {
    try {
        console.log('=== DATABASE ANALYSIS REPORT ===\n');
        
        // Get all tables
        const tablesResult = await pool.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 TOTAL TABLES:', tablesResult.rows.length);
        console.log('Tables:', tablesResult.rows.map(r => r.table_name).join(', '));
        console.log('\n');
        
        // Check for multi-chain tables
        const mcTables = tablesResult.rows.filter(r => r.table_name.startsWith('mc_') || r.table_name.includes('multichain'));
        console.log('🔗 MULTI-CHAIN TABLES (' + mcTables.length + '):');
        for (const table of mcTables) {
            try {
                const count = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
                console.log(`  - ${table.table_name}: ${count.rows[0].count} records`);
            } catch (e) {
                console.log(`  - ${table.table_name}: ERROR - ${e.message}`);
            }
        }
        console.log('\n');
        
        // Check for business intelligence tables
        const biTables = tablesResult.rows.filter(r => r.table_name.startsWith('bi_'));
        console.log('💼 BUSINESS INTELLIGENCE TABLES (' + biTables.length + '):');
        for (const table of biTables) {
            try {
                const count = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
                console.log(`  - ${table.table_name}: ${count.rows[0].count} records`);
            } catch (e) {
                console.log(`  - ${table.table_name}: ERROR - ${e.message}`);
            }
        }
        console.log('\n');
        
        // Check for metrics tables
        const metricsTables = tablesResult.rows.filter(r => r.table_name.includes('metrics'));
        console.log('📈 METRICS TABLES (' + metricsTables.length + '):');
        for (const table of metricsTables) {
            try {
                const count = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
                console.log(`  - ${table.table_name}: ${count.rows[0].count} records`);
            } catch (e) {
                console.log(`  - ${table.table_name}: ERROR - ${e.message}`);
            }
        }
        console.log('\n');
        
        // Check core application tables
        const coreTables = ['users', 'projects', 'wallets', 'api_keys'];
        console.log('👥 CORE APPLICATION TABLES:');
        for (const tableName of coreTables) {
            try {
                const count = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
                console.log(`  - ${tableName}: ${count.rows[0].count} records`);
            } catch (e) {
                console.log(`  - ${tableName}: NOT FOUND`);
            }
        }
        console.log('\n');
        
        // Check for blockchain data
        const blockchainTables = ['transactions', 'blocks', 'addresses', 'inputs', 'outputs'];
        console.log('⛓️  BLOCKCHAIN DATA TABLES:');
        for (const tableName of blockchainTables) {
            try {
                const count = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
                console.log(`  - ${tableName}: ${count.rows[0].count} records`);
            } catch (e) {
                console.log(`  - ${tableName}: NOT FOUND`);
            }
        }
        console.log('\n');
        
        // Sample some key data
        console.log('🔍 SAMPLE DATA ANALYSIS:');
        
        // Check if we have real blockchain transaction data
        try {
            const mcTransactions = await pool.query('SELECT COUNT(*) FROM mc_transaction_details');
            if (mcTransactions.rows[0].count > 0) {
                const sampleTx = await pool.query('SELECT * FROM mc_transaction_details LIMIT 3');
                console.log('  Multi-chain transactions sample:');
                sampleTx.rows.forEach((tx, i) => {
                    console.log(`    ${i+1}. Chain ${tx.chain_id}: ${tx.transaction_hash} (${tx.status})`);
                });
            } else {
                console.log('  No transaction data in mc_transaction_details');
            }
        } catch (e) {
            console.log('  No mc_transaction_details table found');
        }
        
        // Check business contracts
        try {
            const contracts = await pool.query('SELECT COUNT(*) FROM bi_contract_index');
            if (contracts.rows[0].count > 0) {
                const sampleContracts = await pool.query('SELECT contract_address, contract_name, category FROM bi_contract_index LIMIT 3');
                console.log('  Business contracts sample:');
                sampleContracts.rows.forEach((contract, i) => {
                    console.log(`    ${i+1}. ${contract.contract_name || 'Unnamed'} (${contract.category}): ${contract.contract_address}`);
                });
            } else {
                console.log('  No contract data in bi_contract_index');
            }
        } catch (e) {
            console.log('  No bi_contract_index table found');
        }
        
        // Check projects
        try {
            const projects = await pool.query('SELECT COUNT(*) FROM projects');
            if (projects.rows[0].count > 0) {
                const sampleProjects = await pool.query('SELECT name, category, status FROM projects LIMIT 3');
                console.log('  Projects sample:');
                sampleProjects.rows.forEach((project, i) => {
                    console.log(`    ${i+1}. ${project.name} (${project.category}, ${project.status})`);
                });
            } else {
                console.log('  No project data in projects table');
            }
        } catch (e) {
            console.log('  No projects table found');
        }
        
        console.log('\n=== END ANALYSIS ===');
        
    } catch (error) {
        console.error('Database analysis error:', error.message);
    } finally {
        await pool.end();
    }
}

analyzeDatabase();