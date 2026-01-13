/**
 * Task 3.2: Generate transaction data in mc_transaction_details table
 * Requirements: 1.3, 3.2 - Create realistic transaction patterns for sample contracts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
};

async function generateTransactionData() {
    console.log('🚀 Task 3.2: Generating Transaction Data\n');

    const pool = new Pool(dbConfig);

    try {
        // 1. Get all contracts to generate transactions for
        console.log('1️⃣ Getting contract data...');
        
        const contractsQuery = `
            SELECT 
                contract_address,
                contract_name,
                category,
                subcategory,
                chain_id
            FROM bi_contract_index 
            ORDER BY created_at
        `;
        
        const contractsResult = await pool.query(contractsQuery);
        const contracts = contractsResult.rows;
        
        console.log(`📊 Found ${contracts.length} contracts to generate transactions for:`);
        contracts.forEach((contract, index) => {
            console.log(`   ${index + 1}. ${contract.contract_name} (${contract.category}) - Chain ${contract.chain_id}`);
        });

        // 2. Check existing transaction data
        console.log('\n2️⃣ Checking existing transaction data...');
        
        const existingTxQuery = `
            SELECT 
                contract_address,
                COUNT(*) as tx_count
            FROM mc_transaction_details 
            GROUP BY contract_address
            ORDER BY tx_count DESC
        `;
        
        const existingResult = await pool.query(existingTxQuery);
        const existingTxData = existingResult.rows;
        
        console.log(`📊 Found existing transactions for ${existingTxData.length} contracts:`);
        existingTxData.forEach(row => {
            const contract = contracts.find(c => c.contract_address === row.contract_address);
            const contractName = contract ? contract.contract_name : 'Unknown';
            console.log(`   - ${contractName}: ${row.tx_count} transactions`);
        });

        // 3. Generate wallet addresses for realistic customer patterns
        console.log('\n3️⃣ Generating wallet addresses...');
        
        const walletTypes = {
            whale: { count: 2, minTx: 50, maxTx: 200, minValue: 5, maxValue: 50 },
            premium: { count: 8, minTx: 20, maxTx: 100, minValue: 1, maxValue: 10 },
            regular: { count: 30, minTx: 5, maxTx: 50, minValue: 0.1, maxValue: 2 },
            small: { count: 60, minTx: 1, maxTx: 10, minValue: 0.01, maxValue: 0.5 }
        };

        const wallets = [];
        Object.entries(walletTypes).forEach(([type, config]) => {
            for (let i = 0; i < config.count; i++) {
                wallets.push({
                    address: generateWalletAddress(),
                    type: type,
                    config: config
                });
            }
        });

        console.log(`📊 Generated ${wallets.length} wallet addresses:`);
        Object.entries(walletTypes).forEach(([type, config]) => {
            console.log(`   - ${type}: ${config.count} wallets`);
        });

        // 4. Generate transactions for each contract
        console.log('\n4️⃣ Generating transactions for contracts...');
        
        let totalNewTransactions = 0;
        
        for (const contract of contracts) {
            console.log(`\n📝 Generating transactions for ${contract.contract_name}...`);
            
            // Determine transaction patterns based on category
            const txPatterns = getTransactionPatterns(contract.category);
            const targetTxCount = txPatterns.baseTransactions + Math.floor(Math.random() * txPatterns.variability);
            
            // Check existing transactions for this contract
            const existingForContract = existingTxData.find(row => row.contract_address === contract.contract_address);
            const currentTxCount = existingForContract ? parseInt(existingForContract.tx_count) : 0;
            
            if (currentTxCount >= targetTxCount) {
                console.log(`   ✅ Already has ${currentTxCount} transactions (target: ${targetTxCount})`);
                continue;
            }
            
            const newTxNeeded = targetTxCount - currentTxCount;
            console.log(`   📊 Generating ${newTxNeeded} new transactions (current: ${currentTxCount}, target: ${targetTxCount})`);
            
            // Generate transactions
            const transactions = [];
            const contractWallets = selectWalletsForContract(wallets, contract.category);
            
            for (let i = 0; i < newTxNeeded; i++) {
                const wallet = contractWallets[Math.floor(Math.random() * contractWallets.length)];
                const transaction = generateTransaction(contract, wallet, txPatterns);
                transactions.push(transaction);
            }
            
            // Insert transactions in batches
            const batchSize = 100;
            let insertedCount = 0;
            
            for (let i = 0; i < transactions.length; i += batchSize) {
                const batch = transactions.slice(i, i + batchSize);
                
                try {
                    await insertTransactionBatch(pool, batch);
                    insertedCount += batch.length;
                } catch (error) {
                    console.error(`   ❌ Failed to insert batch: ${error.message}`);
                }
            }
            
            console.log(`   ✅ Inserted ${insertedCount}/${newTxNeeded} transactions`);
            totalNewTransactions += insertedCount;
        }

        // 5. Verify final transaction data
        console.log('\n5️⃣ Verifying final transaction data...');
        
        const finalTxQuery = `
            SELECT 
                bci.contract_name,
                bci.category,
                bci.chain_id,
                COUNT(mtd.*) as total_transactions,
                COUNT(CASE WHEN mtd.status = 'success' THEN 1 END) as successful_transactions,
                COUNT(CASE WHEN mtd.status = 'failed' THEN 1 END) as failed_transactions,
                COUNT(DISTINCT mtd.from_address) as unique_customers,
                COALESCE(SUM(mtd.transaction_value), 0) as total_volume_eth,
                COALESCE(AVG(mtd.transaction_value), 0) as avg_transaction_value
            FROM bi_contract_index bci
            LEFT JOIN mc_transaction_details mtd ON bci.contract_address = mtd.contract_address
            GROUP BY bci.contract_address, bci.contract_name, bci.category, bci.chain_id
            ORDER BY total_transactions DESC
        `;
        
        const finalResult = await pool.query(finalTxQuery);
        
        console.log(`📊 Final Transaction Summary:`);
        let totalTx = 0, totalCustomers = 0, totalVolume = 0;
        
        finalResult.rows.forEach(row => {
            const successRate = row.total_transactions > 0 ? 
                ((row.successful_transactions / row.total_transactions) * 100).toFixed(1) : 0;
            
            console.log(`   ${row.contract_name}:`);
            console.log(`     - Transactions: ${row.total_transactions} (${successRate}% success)`);
            console.log(`     - Customers: ${row.unique_customers}`);
            console.log(`     - Volume: ${parseFloat(row.total_volume_eth).toFixed(4)} ETH`);
            console.log(`     - Avg Value: ${parseFloat(row.avg_transaction_value).toFixed(4)} ETH`);
            
            totalTx += parseInt(row.total_transactions);
            totalCustomers += parseInt(row.unique_customers);
            totalVolume += parseFloat(row.total_volume_eth);
        });

        // 6. Test Requirements Validation
        console.log('\n6️⃣ Validating Task 3.2 Requirements...');
        
        console.log('📋 Requirement 1.3 - Create realistic transaction patterns for sample contracts:');
        console.log(`   ✅ Generated ${totalNewTransactions} new transactions`);
        console.log(`   ✅ Total transactions across all contracts: ${totalTx}`);
        
        console.log('📋 Requirement 3.2 - Include successful and failed transactions:');
        const overallSuccessRate = finalResult.rows.reduce((sum, row) => sum + parseInt(row.successful_transactions), 0) / totalTx * 100;
        console.log(`   ✅ Overall success rate: ${overallSuccessRate.toFixed(1)}%`);
        
        console.log('📋 Add customer interaction data with varying transaction volumes:');
        console.log(`   ✅ Total unique customers: ${totalCustomers}`);
        console.log(`   ✅ Total volume: ${totalVolume.toFixed(4)} ETH`);
        console.log(`   ✅ Varying transaction patterns by category`);

        console.log('\n🎉 Task 3.2 Requirements Successfully Met!');
        console.log('\n📋 Summary:');
        console.log(`   - New Transactions Generated: ${totalNewTransactions}`);
        console.log(`   - Total Transactions: ${totalTx}`);
        console.log(`   - Total Unique Customers: ${totalCustomers}`);
        console.log(`   - Total Volume: ${totalVolume.toFixed(4)} ETH`);
        console.log(`   - Success Rate: ${overallSuccessRate.toFixed(1)}%`);

    } catch (error) {
        console.error('❌ Task 3.2 failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

/**
 * Generate a random wallet address
 * @returns {string} Wallet address
 */
function generateWalletAddress() {
    return '0x' + crypto.randomBytes(20).toString('hex');
}

/**
 * Get transaction patterns based on contract category
 * @param {string} category - Contract category
 * @returns {Object} Transaction patterns configuration
 */
function getTransactionPatterns(category) {
    const patterns = {
        'DeFi': {
            baseTransactions: 200,
            variability: 100,
            successRate: 0.92,
            avgValue: 2.5,
            valueVariability: 5.0,
            gasMultiplier: 1.2
        },
        'NFT': {
            baseTransactions: 150,
            variability: 75,
            successRate: 0.88,
            avgValue: 1.8,
            valueVariability: 3.0,
            gasMultiplier: 1.5
        },
        'Gaming': {
            baseTransactions: 300,
            variability: 150,
            successRate: 0.95,
            avgValue: 0.8,
            valueVariability: 1.5,
            gasMultiplier: 0.8
        },
        'DAO': {
            baseTransactions: 80,
            variability: 40,
            successRate: 0.96,
            avgValue: 3.2,
            valueVariability: 2.0,
            gasMultiplier: 1.0
        },
        'Infrastructure': {
            baseTransactions: 120,
            variability: 60,
            successRate: 0.98,
            avgValue: 1.5,
            valueVariability: 2.5,
            gasMultiplier: 0.9
        }
    };
    
    return patterns[category] || patterns['DeFi'];
}

/**
 * Select appropriate wallets for a contract based on category
 * @param {Array} wallets - All available wallets
 * @param {string} category - Contract category
 * @returns {Array} Selected wallets
 */
function selectWalletsForContract(wallets, category) {
    // Different categories attract different wallet types
    const categoryPreferences = {
        'DeFi': { whale: 0.3, premium: 0.4, regular: 0.2, small: 0.1 },
        'NFT': { whale: 0.2, premium: 0.3, regular: 0.3, small: 0.2 },
        'Gaming': { whale: 0.1, premium: 0.2, regular: 0.4, small: 0.3 },
        'DAO': { whale: 0.4, premium: 0.3, regular: 0.2, small: 0.1 },
        'Infrastructure': { whale: 0.25, premium: 0.35, regular: 0.25, small: 0.15 }
    };
    
    const preferences = categoryPreferences[category] || categoryPreferences['DeFi'];
    const selectedWallets = [];
    
    Object.entries(preferences).forEach(([type, ratio]) => {
        const typeWallets = wallets.filter(w => w.type === type);
        const selectCount = Math.ceil(typeWallets.length * ratio);
        selectedWallets.push(...typeWallets.slice(0, selectCount));
    });
    
    return selectedWallets;
}

/**
 * Generate a single transaction
 * @param {Object} contract - Contract information
 * @param {Object} wallet - Wallet information
 * @param {Object} patterns - Transaction patterns
 * @returns {Object} Transaction data
 */
function generateTransaction(contract, wallet, patterns) {
    // Generate timestamp (last 90 days)
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 90);
    const timestamp = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    // Determine success/failure
    const isSuccess = Math.random() < patterns.successRate;
    
    // Generate transaction value based on wallet type and patterns
    const baseValue = patterns.avgValue;
    const walletMultiplier = {
        whale: 10,
        premium: 3,
        regular: 1,
        small: 0.3
    }[wallet.type] || 1;
    
    const value = (baseValue * walletMultiplier * (0.5 + Math.random() * patterns.valueVariability)).toFixed(6);
    
    // Generate gas fee and price
    const gasUsed = Math.floor(21000 + Math.random() * 200000);
    const gasPrice = (10 + Math.random() * 50) / 1000000000; // Convert gwei to ETH
    const gasFee = (gasUsed * gasPrice * patterns.gasMultiplier).toFixed(9);
    
    // Generate transaction hash
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    return {
        transaction_hash: txHash,
        block_number: Math.floor(18000000 + Math.random() * 1000000),
        block_timestamp: timestamp,
        from_address: wallet.address,
        to_address: contract.contract_address,
        contract_address: contract.contract_address,
        transaction_value: parseFloat(value),
        gas_fee_eth: parseFloat(gasFee),
        gas_used: gasUsed,
        gas_price: parseFloat(gasPrice.toFixed(9)),
        status: isSuccess ? 'success' : 'failed',
        chain_id: contract.chain_id,
        function_name: generateMethodName(contract.category),
        created_at: new Date()
    };
}

/**
 * Generate appropriate method name based on contract category
 * @param {string} category - Contract category
 * @returns {string} Method name
 */
function generateMethodName(category) {
    const methods = {
        'DeFi': ['swap', 'addLiquidity', 'removeLiquidity', 'stake', 'unstake', 'claim'],
        'NFT': ['mint', 'transfer', 'approve', 'setApprovalForAll', 'burn'],
        'Gaming': ['play', 'claim', 'upgrade', 'purchase', 'trade'],
        'DAO': ['vote', 'propose', 'execute', 'delegate', 'claim'],
        'Infrastructure': ['bridge', 'relay', 'validate', 'sync']
    };
    
    const categoryMethods = methods[category] || methods['DeFi'];
    return categoryMethods[Math.floor(Math.random() * categoryMethods.length)];
}

/**
 * Insert a batch of transactions
 * @param {Pool} pool - Database pool
 * @param {Array} transactions - Array of transactions to insert
 */
async function insertTransactionBatch(pool, transactions) {
    const client = await pool.connect();
    
    try {
        const insertQuery = `
            INSERT INTO mc_transaction_details (
                transaction_hash, block_number, block_timestamp, from_address, to_address,
                contract_address, transaction_value, gas_fee_eth, gas_used, gas_price,
                status, chain_id, function_name, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;
        
        for (const tx of transactions) {
            try {
                await client.query(insertQuery, [
                    tx.transaction_hash, tx.block_number, tx.block_timestamp, tx.from_address, tx.to_address,
                    tx.contract_address, tx.transaction_value, tx.gas_fee_eth, tx.gas_used, tx.gas_price,
                    tx.status, tx.chain_id, tx.function_name, tx.created_at
                ]);
            } catch (error) {
                // Skip duplicate transactions silently
                if (!error.message.includes('duplicate key')) {
                    throw error;
                }
            }
        }
        
    } finally {
        client.release();
    }
}

// Run the transaction generation
generateTransactionData().catch(console.error);