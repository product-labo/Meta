# Complete Metrics Generated from RPC Data

## Overview
The analytics engine generates **50+ comprehensive metrics** from RPC transaction data across multiple categories. Here's the complete list of all available metrics:

## 1. DeFi Metrics (20 metrics from DeFiMetricsCalculator.js)

### User Lifecycle Metrics (5)
- `activationRate` - Users who made >1 transaction (%)
- `adoptionRate` - New users in period (%)
- `retentionRate` - Users active in both periods (%)
- `churnRate` - User churn rate (%)
- `lifecycleDistribution` - User stage distribution (new, active, established, veteran, dormant)

### Activity Metrics (5)
- `dau` - Daily Active Users
- `wau` - Weekly Active Users  
- `mau` - Monthly Active Users
- `transactionVolume` - Total transaction value
- `averageTransactionSize` - Average transaction value

### Financial Metrics (7)
- `tvl` - Total Value Locked
- `netInflow` - Total inflow value
- `netOutflow` - Total outflow value
- `netFlow` - Net flow (inflow - outflow)
- `revenuePerUser` - Revenue per user
- `protocolRevenue` - Total protocol revenue (gas fees)
- `whaleActivityRatio` - Whale transaction ratio (%)

### Performance Metrics (5)
- `functionSuccessRate` - Transaction success rate (%)
- `averageGasCost` - Average gas cost per transaction
- `contractUtilizationRate` - Transactions per day
- `crossContractInteractionRate` - Unique contracts interacted with
- `protocolStickiness` - Repeat users ratio (%)

## 2. User Behavior Metrics (20 metrics from UserBehaviorAnalyzer.js)

### Transaction Behavior Metrics (5)
- `transactionFrequencyScore` - Transaction frequency score (0-100)
- `transactionTimingPatterns` - Peak hours and consistency score
- `transactionSizeConsistency` - Transaction size consistency (%)
- `gasPriceSensitivity` - Gas price variation sensitivity (%)
- `functionDiversityScore` - Function diversity score

### Risk & Value Behavior Metrics (5)
- `riskToleranceLevel` - Risk tolerance based on transaction variance
- `valueAccumulationPattern` - Value pattern (accumulating/distributing/stable)
- `whaleBehaviorScore` - Whale behavior score (%)
- `arbitrageActivityLevel` - Arbitrage activity level (%)
- `liquidityProviderBehavior` - LP behavior score (%)

### Engagement & Loyalty Metrics (5)
- `protocolLoyaltyScore` - Protocol loyalty score (0-100)
- `earlyAdopterTendency` - Early adopter tendency (%)
- `socialTradingBehavior` - Social trading behavior (%)
- `seasonalActivityPattern` - Seasonal activity pattern
- `retryBehaviorScore` - Retry behavior score (%)

### Advanced Behavioral Patterns (5)
- `botLikeActivityScore` - Bot-like activity score (%)
- `crossChainBehavior` - Cross-chain behavior score (%)
- `defiStrategyComplexity` - DeFi strategy complexity score
- `marketTimingBehavior` - Market timing behavior score
- `communityParticipationScore` - Community participation score (%)

## 3. Additional Comprehensive Metrics (10+ from AnalyticsEngine)

### Gas Analysis Metrics
- `averageGasPrice` - Average gas price
- `averageGasUsed` - Average gas used
- `totalGasCost` - Total gas cost
- `gasEfficiencyScore` - Gas efficiency score (0-100)
- `failedTransactions` - Number of failed transactions
- `failureRate` - Transaction failure rate (%)
- `gasOptimizationOpportunities` - List of optimization opportunities

### User Classification Metrics
- `whale` - Whale users (%)
- `retail` - Retail users (%)
- `bot` - Bot users (%)
- `arbitrageur` - Arbitrageur users (%)
- `hodler` - HODLer users (%)
- `trader` - Trader users (%)
- `liquidity_provider` - LP users (%)
- `early_adopter` - Early adopter users (%)
- `casual` - Casual users (%)
- `power_user` - Power users (%)

### Extended DeFi Metrics
- `borrowingRate` - Current borrowing rate (%)
- `lendingRate` - Current lending rate (%)
- `impermanentLoss` - Impermanent loss (%)
- `slippageTolerance` - Slippage tolerance (%)
- `volumeToTvlRatio` - Volume to TVL ratio
- `feeToVolumeRatio` - Fee to volume ratio
- `activePoolsCount` - Number of active pools
- `crossChainVolume` - Cross-chain volume
- `bridgeUtilization` - Bridge utilization (%)
- `governanceParticipation` - Governance participation (%)
- `yieldGenerated` - Yield generated
- `protocolFees` - Protocol fees collected
- `stakingRewards` - Staking rewards distributed
- `liquidityUtilization` - Liquidity utilization (%)

### Extended User Behavior Metrics
- `crossChainUsers` - Cross-chain users count
- `multiProtocolUsers` - Multi-protocol users count
- `gasOptimizationScore` - Gas optimization score
- `frontRunningDetection` - Front-running detection score
- `mevExposure` - MEV exposure score
- `sandwichAttacks` - Sandwich attacks detected
- `arbitrageOpportunities` - Arbitrage opportunities count
- `liquidationEvents` - Liquidation events count

### Transaction & Event Data
- `transactions` - Detailed transaction array (up to 100)
- `users` - Detailed user profiles (up to 50)
- `events` - Contract events array (up to 100)
- `locks` - Token locks information
- `competitive` - Competitive analysis data
- `recommendations` - Actionable recommendations array
- `alerts` - Critical alerts array

## 4. Summary Metrics
- `totalTransactions` - Total transaction count
- `uniqueUsers` - Unique users count
- `totalValue` - Total value processed
- `avgGasUsed` - Average gas used
- `successRate` - Overall success rate (%)
- `timeRange` - Analysis time range

## Frontend Access Path
All metrics are available in the frontend via:
```javascript
const fullReport = analysisResults?.results?.target?.fullReport || {};
const defiMetrics = fullReport.defiMetrics || {};
const userBehavior = fullReport.userBehavior || {};
const summary = fullReport.summary || {};
const gasAnalysis = fullReport.gasAnalysis || {};
const competitive = fullReport.competitive || {};
const recommendations = fullReport.recommendations || [];
const alerts = fullReport.alerts || [];
```

## Current Status
✅ **All metrics are generated** by the AnalyticsEngine when RPC data is successfully fetched
✅ **Provider initialization fixed** - all chains now have working RPC providers
✅ **Interaction-based fetching implemented** - efficient event-first approach for all chains
⚠️ **Frontend display** - needs to be updated to show all available metrics

## Next Steps
1. Update frontend components to display all 50+ metrics
2. Organize metrics into logical tabs/sections
3. Add visualizations for key metrics
4. Ensure proper error handling for missing metrics