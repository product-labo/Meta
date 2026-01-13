#!/usr/bin/env node

import { CrossChainNormalizer } from './src/services/cross-chain-normalizer.ts';

const testMetrics = {
    total_transactions: 100,
    total_customers: 50,
    success_rate: 95.0,
    avg_transaction_value: 10.5,
    total_revenue_eth: 1000.0,
    growth_score: 75,
    health_score: 80,
    risk_score: 25,
    chain_id: '1'
};

console.log('Chain comparison:');
const chains = ['1', '4202', '137'];
for (const chainA of chains) {
    for (const chainB of chains) {
        if (chainA !== chainB) {
            const metricsA = { ...testMetrics, chain_id: chainA };
            const metricsB = { ...testMetrics, chain_id: chainB };
            
            const normalizedA = CrossChainNormalizer.normalizeMetrics(metricsA);
            const normalizedB = CrossChainNormalizer.normalizeMetrics(metricsB);
            
            console.log(`${chainA} vs ${chainB}:`);
            console.log(`  Volume factors: ${normalizedA.normalization_factors.volume_factor} vs ${normalizedB.normalization_factors.volume_factor}`);
            console.log(`  Customer factors: ${normalizedA.normalization_factors.customer_factor} vs ${normalizedB.normalization_factors.customer_factor}`);
            console.log(`  Maturity factors: ${normalizedA.normalization_factors.maturity_factor} vs ${normalizedB.normalization_factors.maturity_factor}`);
            
            const differentFactors = (
                normalizedA.normalization_factors.volume_factor !== normalizedB.normalization_factors.volume_factor ||
                normalizedA.normalization_factors.customer_factor !== normalizedB.normalization_factors.customer_factor ||
                normalizedA.normalization_factors.maturity_factor !== normalizedB.normalization_factors.maturity_factor
            );
            console.log(`  Different factors: ${differentFactors}`);
            console.log('');
        }
    }
}