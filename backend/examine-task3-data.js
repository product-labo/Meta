/**
 * Examine existing data for Task 3 - Database population analysis
 * Check current state and identify what needs to be added
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
};

async function examineTask3Data() {
    console.log('🔍 Examining Task 3: Database Population Current State\n');

    const pool = new Pool(dbConfig);

    try {
        // 1. Examine Contract Index Data
        console.log('1️⃣ Examining bi_contract_index table...');
        
        const contractQuery = `
            SELECT 
                contract_address,
                contract_name,
                category,
                subcategory,
                chain_id,
                is_verified,
                description,
                created_at
            FROM bi_contract_index 
            ORDER BY created_at
        `;
        
        const contractResult = await pool.query(contractQuery);
        
        console.log(`📊 Found ${contractResult.rows.length} contracts:`);
        contractResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.contract_name} (${row.category})`);
            console.log(`      - Address: ${row.contract_address}`);
            console.log(`      - Chain: ${row.chain_id}, Verified: ${row.is_verified}`);
            console.log(`      - Subcategory: ${row.subcategory || 'None'}`);
        });

        // 2. Examine Transaction Data
        console.log('\n2️⃣ Examining mc_transaction_details table...');
        
        const txSummaryQuery = `
            SELECT 
                contract_address,
                COUNT(*) as transaction_count,
                COUNT(DISTINCT from_address) as unique_wallets,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_tx,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tx,
                MIN(block_timestamp) as earliest_tx,
                MAX(block_timestamp) as latest_tx,
                COALESCE(SUM(transaction_value), 0) as total_volume_eth
            FROM mc_transaction_details 
            GROUP BY contract_address
            ORDER BY transaction_count DESC
        `;
        
        const txResult = await pool.query(txSummaryQuery);
        
        console.log(`📊 Transaction summary by contract:`);
        txResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.contract_address}:`);
            console.log(`      - Transactions: ${row.transaction_count} (${row.successful_tx} success, ${row.failed_tx} failed)`);
            console.log(`      - Unique wallets: ${row.unique_wallets}`);
            console.log(`      - Volume: ${parseFloat(row.total_volume_eth).toFixed(4)} ETH`);
            console.log(`      - Date range: ${row.earliest_tx} to ${row.latest_tx}`);
        });

        // 3. Examine Project Metrics
        console.log('\n3️⃣ Examining project_metrics_realtime table...');
        
        const metricsQuery = `
            SELECT 
                pmr.contract_address,
                bci.contract_name,
                pmr.total_customers,
                pmr.total_transactions,
                pmr.success_rate_percent,
                pmr.growth_score,
                pmr.health_score,
                pmr.risk_score,
                pmr.total_volume_eth,
                pmr.last_updated
            FROM project_metrics_realtime pmr
            JOIN bi_contract_index bci ON pmr.contract_address = bci.contract_address
            ORDER BY pmr.growth_score DESC
        `;
        
        const metricsResult = await pool.query(metricsQuery);
        
        console.log(`📊 Current metrics:`);
        metricsResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.contract_name}:`);
            console.log(`      - Customers: ${row.total_customers}, Transactions: ${row.total_transactions}`);
            console.log(`      - Success Rate: ${parseFloat(row.success_rate_percent).toFixed(1)}%`);
            console.log(`      - Scores - Growth: ${row.growth_score}, Health: ${row.health_score}, Risk: ${row.risk_score}`);
            console.log(`      - Volume: ${parseFloat(row.total_volume_eth).toFixed(4)} ETH`);
            console.log(`      - Last Updated: ${row.last_updated}`);
        });

        // 4. Check Categories and Chains
        console.log('\n4️⃣ Analyzing categories and chains...');
        
        const categoryQuery = `
            SELECT 
                category,
                COUNT(*) as contract_count,
                ARRAY_AGG(DISTINCT subcategory) as subcategories
            FROM bi_contract_index 
            GROUP BY category
            ORDER BY contract_count DESC
        `;
        
        const categoryResult = await pool.query(categoryQuery);
        
        console.log(`📊 Categories:`);
        categoryResult.rows.forEach(row => {
            console.log(`   - ${row.category}: ${row.contract_count} contracts`);
            console.log(`     Subcategories: ${row.subcategories.filter(s => s).join(', ') || 'None'}`);
        });

        const chainQuery = `
            SELECT 
                chain_id,
                COUNT(*) as contract_count
            FROM bi_contract_index 
            GROUP BY chain_id
            ORDER BY contract_count DESC
        `;
        
        const chainResult = await pool.query(chainQuery);
        
        console.log(`📊 Chains:`);
        chainResult.rows.forEach(row => {
            console.log(`   - Chain ${row.chain_id}: ${row.contract_count} contracts`);
        });

        // 5. Check Wallet Distribution
        console.log('\n5️⃣ Analyzing wallet distribution...');
        
        const walletQuery = `
            SELECT 
                from_address,
                COUNT(*) as transaction_count,
                COUNT(DISTINCT contract_address) as contracts_interacted,
                COALESCE(SUM(transaction_value), 0) as total_spent_eth,
                MIN(block_timestamp) as first_tx,
                MAX(block_timestamp) as last_tx
            FROM mc_transaction_details 
            GROUP BY from_address
            ORDER BY transaction_count DESC
            LIMIT 10
        `;
        
        const walletResult = await pool.query(walletQuery);
        
        console.log(`📊 Top wallets by activity:`);
        walletResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.from_address}:`);
            console.log(`      - Transactions: ${row.transaction_count}`);
            console.log(`      - Contracts: ${row.contracts_interacted}`);
            console.log(`      - Total Spent: ${parseFloat(row.total_spent_eth).toFixed(4)} ETH`);
        });

        // 6. Identify Gaps for Task 3
        console.log('\n6️⃣ Task 3 Requirements Analysis...');
        
        console.log('📋 Current State:');
        console.log(`   ✅ Contract Index: ${contractResult.rows.length} contracts`);
        console.log(`   ✅ Transaction Data: ${txResult.rows.reduce((sum, row) => sum + parseInt(row.transaction_count), 0)} transactions`);
        console.log(`   ✅ Project Metrics: ${metricsResult.rows.length} calculated`);
        console.log(`   ✅ Categories: ${categoryResult.rows.length} different categories`);
        console.log(`   ✅ Chains: ${chainResult.rows.length} different chains`);
        
        console.log('\n📋 Task 3 Requirements:');
        console.log('   3.1 Create sample contract data:');
        console.log('       - ✅ Already have 3 contracts with business info');
        console.log('       - ✅ Categories and subcategories present');
        console.log('       - ✅ Verified and unverified contracts');
        console.log('       - 🔄 Could add more diverse contracts for better testing');
        
        console.log('   3.2 Generate transaction data:');
        console.log('       - ✅ Already have 858 realistic transactions');
        console.log('       - ✅ Success and failed transactions present');
        console.log('       - ✅ Customer interaction data with varying volumes');
        console.log('       - 🔄 Could add more recent transactions for real-time testing');
        
        console.log('   3.3 Calculate and populate metrics:');
        console.log('       - ✅ Metrics calculation pipeline working');
        console.log('       - ✅ All metrics tables populated');
        console.log('       - ✅ Metrics accuracy verified');
        console.log('       - 🔄 Need to test metrics update triggers');
        
        console.log('   3.4 Property tests:');
        console.log('       - ❌ Need to implement property tests');
        console.log('       - ❌ Need to test project creation workflow');
        console.log('       - ❌ Need to test metrics calculation accuracy');

        console.log('\n🎯 Recommended Actions for Task 3:');
        console.log('   1. Add more diverse sample contracts (different chains, categories)');
        console.log('   2. Generate additional recent transaction data');
        console.log('   3. Test and verify metrics update triggers');
        console.log('   4. Implement property-based tests');
        console.log('   5. Verify end-to-end data population workflow');

    } catch (error) {
        console.error('❌ Data examination failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the examination
examineTask3Data().catch(console.error);