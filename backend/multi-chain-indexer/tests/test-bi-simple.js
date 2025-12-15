const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testBI() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('🚀 Testing Business Intelligence Setup...');

        // Create categories table first
        await client.query(`
            CREATE TABLE IF NOT EXISTS bi_contract_categories (
                id SERIAL PRIMARY KEY,
                category_name VARCHAR(50) UNIQUE NOT NULL,
                subcategory VARCHAR(100),
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        // Insert sample categories
        await client.query(`
            INSERT INTO bi_contract_categories (category_name, subcategory, description) VALUES
            ('defi', 'dex', 'Decentralized Exchanges'),
            ('defi', 'lending', 'Lending protocols'),
            ('nft', 'marketplace', 'NFT marketplaces'),
            ('dao', 'governance', 'Governance protocols')
            ON CONFLICT (category_name) DO NOTHING
        `);

        // Create contract index table
        await client.query(`
            CREATE TABLE IF NOT EXISTS bi_contract_index (
                id BIGSERIAL PRIMARY KEY,
                contract_address VARCHAR(66) NOT NULL,
                chain_id INTEGER,
                category_id INTEGER REFERENCES bi_contract_categories(id),
                contract_name VARCHAR(255),
                protocol_name VARCHAR(255),
                risk_score INTEGER DEFAULT 50,
                is_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(contract_address, chain_id)
            )
        `);

        console.log('✅ Basic BI tables created');

        // Test categorization of existing contracts
        const contracts = await client.query(`
            SELECT DISTINCT r.address, r.chain_id, r.name
            FROM mc_registry r
            LIMIT 5
        `);

        console.log(`📊 Found ${contracts.rows.length} contracts to categorize:`);

        for (const contract of contracts.rows) {
            // Simple categorization logic
            let categoryId = 1; // Default to DeFi DEX
            let protocolName = 'Unknown Protocol';

            // Check transaction patterns to categorize
            const txPatterns = await client.query(`
                SELECT 
                    array_agg(DISTINCT td.function_name) FILTER (WHERE td.function_name IS NOT NULL) as functions,
                    COUNT(*) as tx_count
                FROM mc_transaction_details td
                WHERE td.to_address = $1 AND td.chain_id = $2
                GROUP BY td.to_address
            `, [contract.address, contract.chain_id]);

            if (txPatterns.rows.length > 0) {
                const functions = txPatterns.rows[0].functions || [];
                const txCount = txPatterns.rows[0].tx_count;

                // Simple categorization
                if (functions.some(f => f && f.includes('swap'))) {
                    categoryId = 1; // DEX
                    protocolName = 'DEX Protocol';
                } else if (functions.some(f => f && (f.includes('mint') || f.includes('borrow')))) {
                    categoryId = 2; // Lending
                    protocolName = 'Lending Protocol';
                } else if (functions.some(f => f && f.includes('matchOrders'))) {
                    categoryId = 3; // NFT Marketplace
                    protocolName = 'NFT Marketplace';
                }

                // Insert into BI index
                await client.query(`
                    INSERT INTO bi_contract_index (
                        contract_address, chain_id, category_id, contract_name, 
                        protocol_name, risk_score, is_verified
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (contract_address, chain_id) DO UPDATE SET
                        category_id = $3,
                        protocol_name = $5,
                        updated_at = NOW()
                `, [
                    contract.address,
                    contract.chain_id,
                    categoryId,
                    contract.name || 'Unknown Contract',
                    protocolName,
                    txCount > 100 ? 30 : 70, // Lower risk for high activity
                    txCount > 100
                ]);

                console.log(`   ✓ ${contract.name || contract.address.slice(0, 10)}... -> ${protocolName} (${txCount} txs)`);
            }
        }

        // Show categorization results
        const results = await client.query(`
            SELECT 
                bci.protocol_name,
                bcc.category_name,
                bcc.subcategory,
                COUNT(*) as contract_count,
                AVG(bci.risk_score) as avg_risk_score
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            GROUP BY bci.protocol_name, bcc.category_name, bcc.subcategory
            ORDER BY contract_count DESC
        `);

        console.log('\n📈 Categorization Summary:');
        results.rows.forEach(row => {
            console.log(`   ${row.category_name}/${row.subcategory}: ${row.contract_count} contracts (${row.protocol_name}, Risk: ${Math.round(row.avg_risk_score)})`);
        });

        console.log('\n🎉 Business Intelligence setup completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

testBI();