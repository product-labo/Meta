#!/usr/bin/env node

/**
 * Debug Cross-Chain Normalizer
 * Simple test to understand what's failing in the property tests
 */

import { CrossChainNormalizer } from './src/services/cross-chain-normalizer.ts';

console.log('🔍 Debugging Cross-Chain Normalizer');
console.log('=' .repeat(50));

// Test with simple, known values
const testMetrics = {
    total_transactions: 100,
    total_customers: 50,
    success_rate: 95.0,
    avg_transaction_value: 10.5,
    total_revenue_eth: 1000.0,
    growth_score: 75,
    health_score: 80,
    risk_score: 25,
    chain_id: '4202' // Lisk
};

console.log('\n📊 Input metrics:');
console.log(JSON.stringify(testMetrics, null, 2));

try {
    const normalized = CrossChainNormalizer.normalizeMetrics(testMetrics);
    
    console.log('\n📊 Normalized metrics:');
    console.log(JSON.stringify(normalized, null, 2));
    
    // Check each property that might be failing
    console.log('\n🔍 Property checks:');
    
    // Check if all required fields exist
    const hasRequiredFields = (
        typeof normalized.normalized_transaction_volume === 'number' &&
        typeof normalized.normalized_customer_acquisition === 'number' &&
        typeof normalized.normalized_revenue_usd === 'number' &&
        typeof normalized.cross_chain_growth_score === 'number' &&
        typeof normalized.cross_chain_health_score === 'number' &&
        typeof normalized.cross_chain_risk_score === 'number' &&
        normalized.normalization_factors
    );
    console.log('Has required fields:', hasRequiredFields);
    
    // Check if normalized values are non-negative
    const nonNegativeNormalized = (
        normalized.normalized_transaction_volume >= 0 &&
        normalized.normalized_customer_acquisition >= 0 &&
        normalized.normalized_revenue_usd >= 0
    );
    console.log('Non-negative normalized values:', nonNegativeNormalized);
    
    // Check if scores are in valid ranges
    const validScoreRanges = (
        normalized.cross_chain_growth_score >= 0 && normalized.cross_chain_growth_score <= 100 &&
        normalized.cross_chain_health_score >= 0 && normalized.cross_chain_health_score <= 100 &&
        normalized.cross_chain_risk_score >= 0 && normalized.cross_chain_risk_score <= 100
    );
    console.log('Valid score ranges:', validScoreRanges);
    console.log('  Growth score:', normalized.cross_chain_growth_score);
    console.log('  Health score:', normalized.cross_chain_health_score);
    console.log('  Risk score:', normalized.cross_chain_risk_score);
    
    // Check normalization factors
    const reasonableFactors = (
        normalized.normalization_factors.volume_factor >= 0.1 &&
        normalized.normalization_factors.volume_factor <= 5.0 &&
        normalized.normalization_factors.customer_factor >= 0.1 &&
        normalized.normalization_factors.customer_factor <= 5.0 &&
        normalized.normalization_factors.revenue_factor > 0 &&
        normalized.normalization_factors.maturity_factor >= 0.1 &&
        normalized.normalization_factors.maturity_factor <= 1.0
    );
    console.log('Reasonable factors:', reasonableFactors);
    console.log('  Volume factor:', normalized.normalization_factors.volume_factor, '(0.1-5.0)');
    console.log('  Customer factor:', normalized.normalization_factors.customer_factor, '(0.1-5.0)');
    console.log('  Revenue factor:', normalized.normalization_factors.revenue_factor, '(>0)');
    console.log('  Maturity factor:', normalized.normalization_factors.maturity_factor, '(0.1-1.0)');
    
    // Test with different chains
    console.log('\n🔗 Testing different chains:');
    const chains = ['1', '4202', '137', 'starknet'];
    
    for (const chainId of chains) {
        const chainMetrics = { ...testMetrics, chain_id: chainId };
        const chainNormalized = CrossChainNormalizer.normalizeMetrics(chainMetrics);
        const chainInfo = CrossChainNormalizer.getChainInfo(chainId);
        
        console.log(`\n  Chain ${chainId} (${chainInfo?.name || 'Unknown'}):`);
        console.log(`    Volume factor: ${chainNormalized.normalization_factors.volume_factor}`);
        console.log(`    Customer factor: ${chainNormalized.normalization_factors.customer_factor}`);
        console.log(`    Revenue factor: ${chainNormalized.normalization_factors.revenue_factor}`);
        console.log(`    Maturity factor: ${chainNormalized.normalization_factors.maturity_factor}`);
    }
    
    // Test comparison
    console.log('\n🆚 Testing comparison:');
    const metricsA = { ...testMetrics, chain_id: '1' }; // Ethereum
    const metricsB = { ...testMetrics, chain_id: '4202' }; // Lisk
    
    const comparison = CrossChainNormalizer.compareProjects(metricsA, metricsB);
    console.log('Comparison result keys:', Object.keys(comparison));
    console.log('Cross-chain context:', comparison.cross_chain_context);
    
} catch (error) {
    console.error('❌ Error during normalization:', error);
    console.error('Stack trace:', error.stack);
}