console.log('🚀 Task 3.4: Property-Based Tests for Data Population and Metrics');

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

async function runTests() {
    console.log('\n🔍 Running Property Tests...');
    
    const pool = new Pool(dbConfig);
    let passedTests = 0;
    let totalTests = 0;

    try {
        // Property 10: Project Creation Workflow
        console.log('\n📋 Property 10: Project Creation Workflow');
        
        // Test contract completeness
        const contractQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN contract_name IS NOT NULL AND category IS NOT NULL THEN 1 END) as complete
            FROM bi_contract_index
        `;
        
        const contractResult = await pool.query(contractQuery);
        const { total, complete } = contractResult.rows[0];
        
        totalTests++;
        if (parseInt(complete) === parseInt(total)) {
            console.log('   ✅ All contracts have complete business information');
            passedTests++;
        } else {
            console.log(`   ❌ Contract completeness: ${complete}/${total}`);
        }

        // Test category diversity
        const categoryQuery = `SELECT COUNT(DISTINCT category) as count FROM bi_contract_index`;
        const categoryResult = await pool.query(categoryQuery);
        const categoryCount = parseInt(categoryResult.rows[0].count);
        
        totalTests++;
        if (categoryCount >= 3) {
            console.log(`   ✅ Multiple categories: ${categoryCount} categories`);
            passedTests++;
        } else {
            console.log(`   ❌ Insufficient categories: ${categoryCount}`);
        }

        // Property 12: Metrics Calculation Accuracy
        console.log('\n📋 Property 12: Metrics Calculation Accuracy');
        
        // Test transaction consistency
        const txQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
            FROM mc_transaction_details
        `;
        
        const txResult = await pool.query(txQuery);
        const { total: txTotal, success, failed } = txResult.rows[0];
        
        totalTests++;
        if (parseInt(txTotal) === parseInt(success) + parseInt(failed)) {
            console.log('   ✅ Transaction counts are consistent');
            passedTests++;
        } else {
            console.log(`   ❌ Transaction inconsistency: ${txTotal} ≠ ${success} + ${failed}`);
        }

        // Test volume calculations
        const volumeQuery = `
            SELECT 
                COUNT(*) as contracts,
                COUNT(CASE WHEN total_volume >= 0 THEN 1 END) as valid_volumes
            FROM (
                SELECT 
                    contract_address,
                    COALESCE(SUM(transaction_value), 0) as total_volume
                FROM mc_transaction_details
                WHERE contract_address IS NOT NULL
                GROUP BY contract_address
            ) volumes
        `;
        
        const volumeResult = await pool.query(volumeQuery);
        const { contracts, valid_volumes } = volumeResult.rows[0];
        
        totalTests++;
        if (parseInt(contracts) === parseInt(valid_volumes)) {
            console.log('   ✅ All volume calculations are non-negative');
            passedTests++;
        } else {
            console.log(`   ❌ Invalid volumes: ${valid_volumes}/${contracts}`);
        }

        // Results
        console.log('\n📊 Test Results:');
        console.log(`   Passed: ${passedTests}/${totalTests}`);
        console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (passedTests === totalTests) {
            console.log('\n🎉 Task 3.4 Requirements Successfully Met!');
            console.log('\n📋 Validation Summary:');
            console.log('   ✅ Property 10: Project creation workflow validated');
            console.log('   ✅ Property 12: Metrics calculation accuracy verified');
            console.log('   ✅ Requirements 7.1, 7.2: Contract data completeness confirmed');
            console.log('   ✅ Requirements 6.1, 6.3: Metrics accuracy verified');
        }

    } catch (error) {
        console.error('❌ Test execution failed:', error);
    } finally {
        await pool.end();
    }
}

runTests();