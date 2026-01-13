import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

async function debugPropertyTests() {
    try {
        console.log('🔍 Debugging Property Test Failures...');
        
        // Check chain data for chain 1
        console.log('\n1️⃣ Checking Chain 1 Data:');
        const chainQuery = `
            SELECT 
                bci.chain_id,
                COUNT(DISTINCT bci.contract_address) as total_projects,
                COALESCE(SUM(pmr.total_customers), 0) as total_customers,
                COALESCE(AVG(pmr.growth_score), 50) as avg_growth_score
            FROM bi_contract_index bci
            LEFT JOIN project_metrics_realtime pmr ON bci.contract_address = pmr.contract_address
            WHERE bci.chain_id = 1
            GROUP BY bci.chain_id
        `;
        
        const chainResult = await pool.query(chainQuery);
        console.log('Chain 1 data:', chainResult.rows[0]);
        
        // Check if avg_growth_score is causing issues
        if (chainResult.rows[0]) {
            const score = chainResult.rows[0].avg_growth_score;
            console.log(`Growth score: ${score}, type: ${typeof score}, valid range: ${score >= 0 && score <= 100}`);
        }
        
        // Check wallet data
        console.log('\n2️⃣ Checking Wallet Data:');
        const walletQuery = `
            SELECT 
                from_address,
                COUNT(*) as interaction_count,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_count,
                COALESCE(SUM(transaction_value), 0) as total_spent,
                COUNT(DISTINCT contract_address) as unique_contracts
            FROM mc_transaction_details
            WHERE from_address IS NOT NULL
            GROUP BY from_address
            HAVING COUNT(*) > 1
            ORDER BY total_spent DESC
            LIMIT 1
        `;
        
        const walletResult = await pool.query(walletQuery);
        if (walletResult.rows[0]) {
            const wallet = walletResult.rows[0];
            console.log('Sample wallet data:', wallet);
            console.log(`Validation checks:`);
            console.log(`  - successful_count <= interaction_count: ${wallet.successful_count <= wallet.interaction_count}`);
            console.log(`  - total_spent >= 0: ${wallet.total_spent >= 0}`);
            console.log(`  - unique_contracts <= interaction_count: ${wallet.unique_contracts <= wallet.interaction_count}`);
        }
        
        // Check category data for chain 4202
        console.log('\n3️⃣ Checking Category Data for Chain 4202:');
        const categoryQuery = `
            SELECT 
                bci.category,
                COUNT(DISTINCT bci.contract_address) as project_count,
                COALESCE(SUM(pmr.total_customers), 0) as total_customers,
                COALESCE(AVG(pmr.total_customers), 0) as avg_customers_per_project
            FROM bi_contract_index bci
            LEFT JOIN project_metrics_realtime pmr ON bci.contract_address = pmr.contract_address
            WHERE bci.chain_id = 4202
            GROUP BY bci.category
            HAVING COUNT(DISTINCT bci.contract_address) > 0
            LIMIT 1
        `;
        
        const categoryResult = await pool.query(categoryQuery);
        if (categoryResult.rows[0]) {
            const category = categoryResult.rows[0];
            console.log('Sample category data for chain 4202:', category);
            
            // Check average calculation
            const expectedAvg = category.total_customers / category.project_count;
            const actualAvg = parseFloat(category.avg_customers_per_project);
            console.log(`Average calculation check:`);
            console.log(`  - Expected: ${expectedAvg}`);
            console.log(`  - Actual: ${actualAvg}`);
            console.log(`  - Difference: ${Math.abs(expectedAvg - actualAvg)}`);
            console.log(`  - Valid (diff <= 0.1): ${Math.abs(expectedAvg - actualAvg) <= 0.1}`);
        } else {
            console.log('No category data found for chain 4202');
        }
        
        // Check if chain 4202 has any data at all
        const chain4202Check = await pool.query('SELECT COUNT(*) as count FROM bi_contract_index WHERE chain_id = 4202');
        console.log(`Chain 4202 contract count: ${chain4202Check.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await pool.end();
    }
}

debugPropertyTests();