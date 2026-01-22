/**
 * Cross-Chain Metrics Normalization Service
 * 
 * This service provides normalization logic for comparing metrics across different blockchain networks.
 * It accounts for chain-specific characteristics like transaction costs, block times, and network activity.
 */

interface ChainConfig {
    chainId: string;
    name: string;
    avgBlockTime: number; // seconds
    avgGasPrice: number; // in native token units
    nativeTokenPrice: number; // USD price for normalization
    networkActivity: 'high' | 'medium' | 'low';
    maturityFactor: number; // 0.1 to 1.0, where 1.0 is most mature
}

interface RawMetrics {
    total_transactions: number;
    total_customers: number;
    success_rate: number;
    avg_transaction_value: number;
    total_revenue_eth: number;
    growth_score: number;
    health_score: number;
    risk_score: number;
    chain_id: string;
}

interface NormalizedMetrics extends RawMetrics {
    normalized_transaction_volume: number;
    normalized_customer_acquisition: number;
    normalized_revenue_usd: number;
    cross_chain_growth_score: number;
    cross_chain_health_score: number;
    cross_chain_risk_score: number;
    normalization_factors: {
        volume_factor: number;
        customer_factor: number;
        revenue_factor: number;
        maturity_factor: number;
    };
}

// Chain configurations based on real-world data
const CHAIN_CONFIGS: Record<string, ChainConfig> = {
    '1': { // Ethereum Mainnet
        chainId: '1',
        name: 'Ethereum',
        avgBlockTime: 12,
        avgGasPrice: 0.00002, // ~20 gwei in ETH
        nativeTokenPrice: 3000, // USD (approximate)
        networkActivity: 'high',
        maturityFactor: 1.0
    },
    '4202': { // Lisk Sepolia
        chainId: '4202',
        name: 'Lisk',
        avgBlockTime: 2,
        avgGasPrice: 0.000001, // Much lower gas costs
        nativeTokenPrice: 1.2, // LSK price in USD (approximate)
        networkActivity: 'medium',
        maturityFactor: 0.7
    },
    '137': { // Polygon
        chainId: '137',
        name: 'Polygon',
        avgBlockTime: 2,
        avgGasPrice: 0.00000003, // Very low gas costs
        nativeTokenPrice: 0.8, // MATIC price in USD (approximate)
        networkActivity: 'high',
        maturityFactor: 0.9
    },
    'starknet': { // StarkNet
        chainId: 'starknet',
        name: 'StarkNet',
        avgBlockTime: 10,
        avgGasPrice: 0.000001,
        nativeTokenPrice: 3000, // Uses ETH
        networkActivity: 'medium',
        maturityFactor: 0.6
    }
};

export class CrossChainNormalizer {
    
    /**
     * Normalize metrics for cross-chain comparison
     */
    static normalizeMetrics(rawMetrics: RawMetrics): NormalizedMetrics {
        const chainConfig = CHAIN_CONFIGS[rawMetrics.chain_id];
        
        if (!chainConfig) {
            // Default normalization for unknown chains
            return {
                ...rawMetrics,
                normalized_transaction_volume: rawMetrics.total_transactions,
                normalized_customer_acquisition: rawMetrics.total_customers,
                normalized_revenue_usd: rawMetrics.total_revenue_eth * 3000, // Assume ETH price
                cross_chain_growth_score: rawMetrics.growth_score,
                cross_chain_health_score: rawMetrics.health_score,
                cross_chain_risk_score: rawMetrics.risk_score,
                normalization_factors: {
                    volume_factor: 1.0,
                    customer_factor: 1.0,
                    revenue_factor: 1.0,
                    maturity_factor: 1.0
                }
            };
        }

        // Calculate normalization factors
        const volumeFactor = this.calculateVolumeFactor(chainConfig);
        const customerFactor = this.calculateCustomerFactor(chainConfig);
        const revenueFactor = chainConfig.nativeTokenPrice;
        const maturityFactor = chainConfig.maturityFactor;

        // Apply normalization
        const normalizedTransactionVolume = rawMetrics.total_transactions * volumeFactor;
        const normalizedCustomerAcquisition = rawMetrics.total_customers * customerFactor;
        const normalizedRevenueUsd = rawMetrics.total_revenue_eth * revenueFactor;

        // Adjust scores based on chain maturity and characteristics
        const crossChainGrowthScore = this.adjustGrowthScore(rawMetrics.growth_score, chainConfig);
        const crossChainHealthScore = this.adjustHealthScore(rawMetrics.health_score, chainConfig);
        const crossChainRiskScore = this.adjustRiskScore(rawMetrics.risk_score, chainConfig);

        return {
            ...rawMetrics,
            normalized_transaction_volume: Math.round(normalizedTransactionVolume),
            normalized_customer_acquisition: Math.round(normalizedCustomerAcquisition),
            normalized_revenue_usd: parseFloat(normalizedRevenueUsd.toFixed(2)),
            cross_chain_growth_score: Math.round(crossChainGrowthScore),
            cross_chain_health_score: Math.round(crossChainHealthScore),
            cross_chain_risk_score: Math.round(crossChainRiskScore),
            normalization_factors: {
                volume_factor: parseFloat(volumeFactor.toFixed(3)),
                customer_factor: parseFloat(customerFactor.toFixed(3)),
                revenue_factor: parseFloat(revenueFactor.toFixed(2)),
                maturity_factor: parseFloat(maturityFactor.toFixed(2))
            }
        };
    }

    /**
     * Calculate volume normalization factor based on chain characteristics
     */
    private static calculateVolumeFactor(chainConfig: ChainConfig): number {
        // Chains with faster block times and lower costs tend to have higher transaction volumes
        // Normalize to Ethereum as baseline (factor = 1.0)
        
        const ethereumConfig = CHAIN_CONFIGS['1'];
        if (!ethereumConfig) {
            return 1.0; // Fallback if Ethereum config is missing
        }
        
        const blockTimeRatio = ethereumConfig.avgBlockTime / chainConfig.avgBlockTime;
        const gasCostRatio = ethereumConfig.avgGasPrice / chainConfig.avgGasPrice;
        
        // Prevent division by zero and handle edge cases
        const safeBlockTimeRatio = Math.max(0.1, Math.min(10, blockTimeRatio));
        const safeGasCostRatio = Math.max(0.1, Math.min(1000, gasCostRatio));
        
        // Lower gas costs and faster blocks = higher expected volume, so we normalize down
        let factor = 1.0 / (safeBlockTimeRatio * Math.sqrt(safeGasCostRatio));
        
        // Apply network activity adjustment
        switch (chainConfig.networkActivity) {
            case 'high':
                factor *= 0.8; // High activity chains get normalized down
                break;
            case 'medium':
                factor *= 1.0;
                break;
            case 'low':
                factor *= 1.2; // Low activity chains get normalized up
                break;
        }
        
        // Ensure factor is reasonable (0.1 to 5.0)
        return Math.max(0.1, Math.min(5.0, factor));
    }

    /**
     * Calculate customer acquisition normalization factor
     */
    private static calculateCustomerFactor(chainConfig: ChainConfig): number {
        // Customer acquisition is affected by network maturity and accessibility
        
        let factor = 1.0;
        
        // Maturity factor - more mature chains have easier customer acquisition
        factor *= (2.0 - chainConfig.maturityFactor); // Invert maturity for normalization
        
        // Gas cost factor - lower costs = easier customer acquisition
        const ethereumConfig = CHAIN_CONFIGS['1'];
        if (!ethereumConfig) {
            return factor; // Fallback if Ethereum config is missing
        }
        
        const ethereumGasPrice = ethereumConfig.avgGasPrice;
        const gasCostRatio = chainConfig.avgGasPrice / ethereumGasPrice;
        
        // Prevent extreme values
        const safeGasCostRatio = Math.max(0.001, Math.min(1000, gasCostRatio));
        factor *= Math.sqrt(safeGasCostRatio); // Square root to moderate the effect
        
        // Ensure factor is reasonable (0.5 to 2.0)
        return Math.max(0.5, Math.min(2.0, factor));
    }

    /**
     * Adjust growth score for cross-chain comparison
     */
    private static adjustGrowthScore(rawScore: number, chainConfig: ChainConfig): number {
        // Ensure input is valid
        if (typeof rawScore !== 'number' || isNaN(rawScore)) {
            return 50; // Default score
        }
        
        let adjustedScore = rawScore;
        
        // Newer chains (lower maturity) get bonus points for growth
        const maturityBonus = (1.0 - chainConfig.maturityFactor) * 10;
        adjustedScore += maturityBonus;
        
        // High activity chains face more competition, so growth is more impressive
        switch (chainConfig.networkActivity) {
            case 'high':
                adjustedScore += 5;
                break;
            case 'medium':
                adjustedScore += 2;
                break;
            case 'low':
                adjustedScore -= 2;
                break;
        }
        
        // Ensure score stays within 0-100 range
        return Math.max(0, Math.min(100, Math.round(adjustedScore)));
    }

    /**
     * Adjust health score for cross-chain comparison
     */
    private static adjustHealthScore(rawScore: number, chainConfig: ChainConfig): number {
        // Ensure input is valid
        if (typeof rawScore !== 'number' || isNaN(rawScore)) {
            return 60; // Default score
        }
        
        let adjustedScore = rawScore;
        
        // More mature chains should have higher health expectations
        const maturityPenalty = chainConfig.maturityFactor * 5;
        adjustedScore -= maturityPenalty;
        
        // Faster chains with lower costs should have higher success rates
        if (chainConfig.avgBlockTime < 5 && chainConfig.avgGasPrice < 0.00001) {
            adjustedScore += 3;
        }
        
        // Ensure score stays within 0-100 range
        return Math.max(0, Math.min(100, Math.round(adjustedScore)));
    }

    /**
     * Adjust risk score for cross-chain comparison
     */
    private static adjustRiskScore(rawScore: number, chainConfig: ChainConfig): number {
        // Ensure input is valid
        if (typeof rawScore !== 'number' || isNaN(rawScore)) {
            return 50; // Default score
        }
        
        let adjustedScore = rawScore;
        
        // Less mature chains inherently have higher risk
        const maturityRisk = (1.0 - chainConfig.maturityFactor) * 15;
        adjustedScore += maturityRisk;
        
        // Lower activity chains have higher risk due to less battle-testing
        switch (chainConfig.networkActivity) {
            case 'high':
                adjustedScore -= 5;
                break;
            case 'medium':
                adjustedScore += 0;
                break;
            case 'low':
                adjustedScore += 10;
                break;
        }
        
        // Ensure score stays within 0-100 range
        return Math.max(0, Math.min(100, Math.round(adjustedScore)));
    }

    /**
     * Compare two projects with normalized metrics
     */
    static compareProjects(projectA: RawMetrics, projectB: RawMetrics): {
        projectA: NormalizedMetrics;
        projectB: NormalizedMetrics;
        comparison: {
            volume_winner: 'A' | 'B' | 'tie';
            customer_winner: 'A' | 'B' | 'tie';
            revenue_winner: 'A' | 'B' | 'tie';
            growth_winner: 'A' | 'B' | 'tie';
            health_winner: 'A' | 'B' | 'tie';
            risk_winner: 'A' | 'B' | 'tie'; // Lower risk wins
            overall_winner: 'A' | 'B' | 'tie';
        };
        cross_chain_context: {
            same_chain: boolean;
            normalization_applied: boolean;
            chain_a: string;
            chain_b: string;
        };
    } {
        const normalizedA = this.normalizeMetrics(projectA);
        const normalizedB = this.normalizeMetrics(projectB);
        
        const comparison = {
            volume_winner: this.determineWinner(
                normalizedA.normalized_transaction_volume, 
                normalizedB.normalized_transaction_volume
            ),
            customer_winner: this.determineWinner(
                normalizedA.normalized_customer_acquisition, 
                normalizedB.normalized_customer_acquisition
            ),
            revenue_winner: this.determineWinner(
                normalizedA.normalized_revenue_usd, 
                normalizedB.normalized_revenue_usd
            ),
            growth_winner: this.determineWinner(
                normalizedA.cross_chain_growth_score, 
                normalizedB.cross_chain_growth_score
            ),
            health_winner: this.determineWinner(
                normalizedA.cross_chain_health_score, 
                normalizedB.cross_chain_health_score
            ),
            risk_winner: this.determineWinner(
                normalizedB.cross_chain_risk_score, // Inverted - lower risk wins
                normalizedA.cross_chain_risk_score
            ),
            overall_winner: 'tie' as 'A' | 'B' | 'tie'
        };
        
        // Calculate overall winner based on weighted scores
        const scoreA = this.calculateOverallScore(normalizedA);
        const scoreB = this.calculateOverallScore(normalizedB);
        comparison.overall_winner = this.determineWinner(scoreA, scoreB);
        
        return {
            projectA: normalizedA,
            projectB: normalizedB,
            comparison,
            cross_chain_context: {
                same_chain: projectA.chain_id === projectB.chain_id,
                normalization_applied: projectA.chain_id !== projectB.chain_id,
                chain_a: CHAIN_CONFIGS[projectA.chain_id]?.name || projectA.chain_id,
                chain_b: CHAIN_CONFIGS[projectB.chain_id]?.name || projectB.chain_id
            }
        };
    }

    /**
     * Determine winner between two values
     */
    private static determineWinner(valueA: number, valueB: number): 'A' | 'B' | 'tie' {
        const threshold = 0.05; // 5% threshold for tie
        const diff = Math.abs(valueA - valueB);
        const avg = (valueA + valueB) / 2;
        
        if (avg === 0 || diff / avg < threshold) {
            return 'tie';
        }
        
        return valueA > valueB ? 'A' : 'B';
    }

    /**
     * Calculate overall score for comparison
     */
    private static calculateOverallScore(metrics: NormalizedMetrics): number {
        // Weighted scoring system
        const weights = {
            growth: 0.3,
            health: 0.25,
            risk: 0.2, // Lower risk is better
            volume: 0.15,
            revenue: 0.1
        };
        
        const normalizedVolume = Math.min(100, (metrics.normalized_transaction_volume / 1000) * 100);
        const normalizedRevenue = Math.min(100, (metrics.normalized_revenue_usd / 10000) * 100);
        
        return (
            metrics.cross_chain_growth_score * weights.growth +
            metrics.cross_chain_health_score * weights.health +
            (100 - metrics.cross_chain_risk_score) * weights.risk + // Invert risk
            normalizedVolume * weights.volume +
            normalizedRevenue * weights.revenue
        );
    }

    /**
     * Get chain information for display
     */
    static getChainInfo(chainId: string): ChainConfig | null {
        return CHAIN_CONFIGS[chainId] || null;
    }

    /**
     * Get all supported chains
     */
    static getSupportedChains(): ChainConfig[] {
        return Object.values(CHAIN_CONFIGS);
    }
}

export type { RawMetrics, NormalizedMetrics, ChainConfig };