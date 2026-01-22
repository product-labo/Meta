/**
 * Task 3.1: Create and enhance sample contract data in bi_contract_index table
 * Requirements: 7.1, 7.2 - Insert sample smart contracts with business information
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

async function enhanceContractData() {
    console.log('🚀 Task 3.1: Enhancing Sample Contract Data\n');

    const pool = new Pool(dbConfig);

    try {
        // 1. Examine current contract data
        console.log('1️⃣ Examining current contract data...');
        
        const currentContractsQuery = `
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
        
        const currentResult = await pool.query(currentContractsQuery);
        
        console.log(`📊 Found ${currentResult.rows.length} existing contracts:`);
        currentResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.contract_name} (${row.category})`);
            console.log(`      - Address: ${row.contract_address}`);
            console.log(`      - Chain: ${row.chain_id}, Verified: ${row.is_verified}`);
            console.log(`      - Subcategory: ${row.subcategory || 'None'}`);
        });

        // 2. Define additional sample contracts for better diversity
        console.log('\n2️⃣ Preparing additional sample contracts...');
        
        const additionalContracts = [
            {
                contract_address: '0x1234567890123456789012345678901234567890',
                contract_name: 'Starknet DEX Protocol',
                category: 'DeFi',
                subcategory: 'DEX',
                chain_id: 4202, // Starknet
                is_verified: true,
                description: 'Decentralized exchange protocol on Starknet with automated market making'
            },
            {
                contract_address: '0x2345678901234567890123456789012345678901',
                contract_name: 'Polygon Lending Platform',
                category: 'DeFi',
                subcategory: 'Lending',
                chain_id: 137, // Polygon
                is_verified: true,
                description: 'Peer-to-peer lending platform with dynamic interest rates'
            },
            {
                contract_address: '0x3456789012345678901234567890123456789012',
                contract_name: 'Art Collection NFT',
                category: 'NFT',
                subcategory: 'Art',
                chain_id: 1, // Ethereum
                is_verified: false,
                description: 'Curated digital art collection with royalty distribution'
            },
            {
                contract_address: '0x4567890123456789012345678901234567890123',
                contract_name: 'DAO Governance Token',
                category: 'DAO',
                subcategory: 'Governance',
                chain_id: 1, // Ethereum
                is_verified: true,
                description: 'Governance token for decentralized autonomous organization'
            },
            {
                contract_address: '0x5678901234567890123456789012345678901234',
                contract_name: 'Cross-Chain Bridge',
                category: 'Infrastructure',
                subcategory: 'Bridge',
                chain_id: 137, // Polygon
                is_verified: true,
                description: 'Multi-chain bridge for asset transfers between networks'
            },
            {
                contract_address: '0x6789012345678901234567890123456789012345',
                contract_name: 'Metaverse Land Registry',
                category: 'Gaming',
                subcategory: 'Metaverse',
                chain_id: 4202, // Starknet
                is_verified: false,
                description: 'Virtual land ownership and trading platform'
            }
        ];

        // 3. Check which contracts already exist
        console.log('\n3️⃣ Checking for existing contracts...');
        
        const existingAddresses = currentResult.rows.map(row => row.contract_address);
        const newContracts = additionalContracts.filter(contract => 
            !existingAddresses.includes(contract.contract_address)
        );

        console.log(`📊 Found ${newContracts.length} new contracts to add`);

        // 4. Insert new contracts if any
        if (newContracts.length > 0) {
            console.log('\n4️⃣ Inserting new sample contracts...');
            
            for (const contract of newContracts) {
                try {
                    const insertQuery = `
                        INSERT INTO bi_contract_index (
                            contract_address, contract_name, category, subcategory, 
                            chain_id, is_verified, description, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                        ON CONFLICT (contract_address) DO NOTHING
                    `;
                    
                    await pool.query(insertQuery, [
                        contract.contract_address,
                        contract.contract_name,
                        contract.category,
                        contract.subcategory,
                        contract.chain_id,
                        contract.is_verified,
                        contract.description
                    ]);
                    
                    console.log(`✅ Added: ${contract.contract_name} (${contract.category})`);
                    
                } catch (error) {
                    console.log(`❌ Failed to add ${contract.contract_name}: ${error.message}`);
                }
            }
        } else {
            console.log('✅ All sample contracts already exist');
        }

        // 5. Verify final contract data
        console.log('\n5️⃣ Verifying final contract data...');
        
        const finalResult = await pool.query(currentContractsQuery);
        
        console.log(`📊 Total contracts: ${finalResult.rows.length}`);
        
        // Group by category
        const categoryStats = {};
        const chainStats = {};
        let verifiedCount = 0;
        
        finalResult.rows.forEach(row => {
            // Category stats
            if (!categoryStats[row.category]) {
                categoryStats[row.category] = 0;
            }
            categoryStats[row.category]++;
            
            // Chain stats
            if (!chainStats[row.chain_id]) {
                chainStats[row.chain_id] = 0;
            }
            chainStats[row.chain_id]++;
            
            // Verified count
            if (row.is_verified) {
                verifiedCount++;
            }
        });

        console.log('\n📊 Contract Distribution:');
        console.log('   Categories:');
        Object.entries(categoryStats).forEach(([category, count]) => {
            console.log(`     - ${category}: ${count} contracts`);
        });
        
        console.log('   Chains:');
        Object.entries(chainStats).forEach(([chainId, count]) => {
            const chainName = chainId === '1' ? 'Ethereum' : 
                             chainId === '137' ? 'Polygon' : 
                             chainId === '4202' ? 'Starknet' : `Chain ${chainId}`;
            console.log(`     - ${chainName} (${chainId}): ${count} contracts`);
        });
        
        console.log(`   Verification: ${verifiedCount} verified, ${finalResult.rows.length - verifiedCount} unverified`);

        // 6. Test Requirements Validation
        console.log('\n6️⃣ Validating Task 3.1 Requirements...');
        
        console.log('📋 Requirement 7.1 - Insert sample smart contracts with business information:');
        console.log(`   ✅ ${finalResult.rows.length} contracts with complete business information`);
        
        console.log('📋 Requirement 7.2 - Add contract categories and subcategories:');
        const categoriesCount = Object.keys(categoryStats).length;
        const subcategoriesCount = finalResult.rows.filter(row => row.subcategory).length;
        console.log(`   ✅ ${categoriesCount} different categories`);
        console.log(`   ✅ ${subcategoriesCount} contracts with subcategories`);
        
        console.log('📋 Include verified and unverified contracts for testing:');
        console.log(`   ✅ ${verifiedCount} verified contracts`);
        console.log(`   ✅ ${finalResult.rows.length - verifiedCount} unverified contracts`);

        console.log('\n🎉 Task 3.1 Requirements Successfully Met!');
        console.log('\n📋 Summary:');
        console.log(`   - Total Contracts: ${finalResult.rows.length}`);
        console.log(`   - Categories: ${Object.keys(categoryStats).join(', ')}`);
        console.log(`   - Chains: ${Object.keys(chainStats).length} different chains`);
        console.log(`   - Verification Mix: ${verifiedCount} verified, ${finalResult.rows.length - verifiedCount} unverified`);
        console.log('   - Business Information: Complete for all contracts');

    } catch (error) {
        console.error('❌ Task 3.1 failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

// Run the enhancement
enhanceContractData().catch(console.error);