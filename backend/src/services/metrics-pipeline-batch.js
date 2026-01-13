/**
 * MetaGauge Metrics Data Pipeline - Batch Processing Methods
 * Additional methods for the metrics pipeline service
 */

/**
 * Upsert wallet metrics into real-time table
 * @param {Object} metrics - Wallet metrics object
 */
async function upsertWalletMetrics(metrics, pool) {
    const client = await pool.connect();
    
    try {
        const upsertQuery = `
            INSERT INTO wallet_metrics_realtime (
                wallet_address, chain_id, last_updated,
                total_interactions, unique_contracts_interacted, first_interaction_date, last_interaction_date, interaction_frequency,
                total_spent_eth, total_spent_usd, avg_transaction_size_eth, avg_transaction_size_usd,
                total_gas_spent_eth, total_gas_spent_usd,
                wallet_type, activity_pattern, preferred_categories, loyalty_score
            ) VALUES (
                $1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )
            ON CONFLICT (wallet_address) 
            DO UPDATE SET
                chain_id = EXCLUDED.chain_id,
                last_updated = NOW(),
                total_interactions = EXCLUDED.total_interactions,
                unique_contracts_interacted = EXCLUDED.unique_contracts_interacted,
                first_interaction_date = EXCLUDED.first_interaction_date,
                last_interaction_date = EXCLUDED.last_interaction_date,
                interaction_frequency = EXCLUDED.interaction_frequency,
                total_spent_eth = EXCLUDED.total_spent_eth,
                total_spent_usd = EXCLUDED.total_spent_usd,
                avg_transaction_size_eth = EXCLUDED.avg_transaction_size_eth,
                avg_transaction_size_usd = EXCLUDED.avg_transaction_size_usd,
                total_gas_spent_eth = EXCLUDED.total_gas_spent_eth,
                total_gas_spent_usd = EXCLUDED.total_gas_spent_usd,
                wallet_type = EXCLUDED.wallet_type,
                activity_pattern = EXCLUDED.activity_pattern,
                preferred_categories = EXCLUDED.preferred_categories,
                loyalty_score = EXCLUDED.loyalty_score
        `;

        const values = [
            metrics.wallet_address, metrics.chain_id,
            metrics.total_interactions, metrics.unique_contracts_interacted, 
            metrics.first_interaction_date, metrics.last_interaction_date, metrics.interaction_frequency,
            metrics.total_spent_eth, metrics.total_spent_usd, 
            metrics.avg_transaction_size_eth, metrics.avg_transaction_size_usd,
            metrics.total_gas_spent_eth, metrics.total_gas_spent_usd,
            metrics.wallet_type, metrics.activity_pattern, metrics.preferred_categories, metrics.loyalty_score
        ];

        await client.query(upsertQuery, values);

    } finally {
        client.release();
    }
}

/**
 * Recalculate historical metrics for data integrity
 */
async function recalculateHistoricalMetrics(pool, metricsCalculator) {
    console.log('🔄 Starting historical metrics recalculation...');
    
    const client = await pool.connect();
    
    try {
        // Get contracts that need recalculation (older than 7 days since last update)
        const contractsQuery = `
            SELECT contract_address, chain_id
            FROM project_metrics_realtime 
            WHERE last_updated < NOW() - INTERVAL '7 days'
            OR last_updated IS NULL
            LIMIT 500
        `;
        
        const contractsResult = await client.query(contractsQuery);
        const contracts = contractsResult.rows;

        console.log(`📊 Recalculating metrics for ${contracts.length} contracts`);

        let recalculatedCount = 0;
        for (const contract of contracts) {
            try {
                const metrics = await metricsCalculator.calculateProjectMetrics(contract.contract_address, contract.chain_id);
                await upsertProjectMetricsRealtime(metrics, pool);
                recalculatedCount++;
            } catch (error) {
                console.error(`❌ Failed to recalculate metrics for ${contract.contract_address}:`, error.message);
            }
        }

        console.log(`✅ Historical recalculation completed: ${recalculatedCount}/${contracts.length} contracts updated`);

    } finally {
        client.release();
    }
}

/**
 * Start data validation monitor
 */
function startValidationMonitor(pipeline) {
    console.log('🔍 Starting data validation monitor...');

    // Run validation every hour
    pipeline.validationJob = cron.schedule('0 * * * *', async () => {
        try {
            await runDataValidation(pipeline.pool);
        } catch (error) {
            console.error('❌ Data validation failed:', error);
        }
    }, { scheduled: false });

    pipeline.validationJob.start();
    console.log('✅ Data validation monitor started (hourly checks)');
}

/**
 * Run comprehensive data validation checks
 */
async function runDataValidation(pool) {
    console.log('🔍 Running data validation checks...');
    
    const client = await pool.connect();
    
    try {
        const validationResults = {
            project_metrics: await validateProjectMetricsTable(pool),
            wallet_metrics: await validateWalletMetricsTable(pool),
            data_integrity: await validateDataIntegrity(pool)
        };

        // Log validation results
        const totalIssues = Object.values(validationResults).reduce((sum, result) => sum + result.issues.length, 0);
        
        if (totalIssues > 0) {
            console.warn(`⚠️  Data validation found ${totalIssues} issues:`);
            Object.entries(validationResults).forEach(([table, result]) => {
                if (result.issues.length > 0) {
                    console.warn(`  ${table}: ${result.issues.length} issues`);
                    result.issues.forEach(issue => console.warn(`    - ${issue}`));
                }
            });
        } else {
            console.log('✅ Data validation passed - no issues found');
        }

        return validationResults;

    } finally {
        client.release();
    }
}

/**
 * Validate project metrics table data
 * @returns {Object} Validation results
 */
async function validateProjectMetricsTable(pool) {
    const client = await pool.connect();
    const issues = [];
    
    try {
        // Check for invalid score ranges
        const invalidScoresQuery = `
            SELECT contract_address, growth_score, health_score, risk_score
            FROM project_metrics_realtime 
            WHERE growth_score < 0 OR growth_score > 100
               OR health_score < 0 OR health_score > 100
               OR risk_score < 0 OR risk_score > 100
            LIMIT 10
        `;
        
        const invalidScoresResult = await client.query(invalidScoresQuery);
        if (invalidScoresResult.rows.length > 0) {
            issues.push(`${invalidScoresResult.rows.length} contracts have invalid score ranges`);
        }

        // Check for negative customer counts
        const negativeCustomersQuery = `
            SELECT COUNT(*) as count
            FROM project_metrics_realtime 
            WHERE total_customers < 0 OR daily_active_customers < 0
        `;
        
        const negativeCustomersResult = await client.query(negativeCustomersQuery);
        if (parseInt(negativeCustomersResult.rows[0].count) > 0) {
            issues.push(`${negativeCustomersResult.rows[0].count} contracts have negative customer counts`);
        }

        // Check for impossible success rates
        const invalidSuccessRateQuery = `
            SELECT COUNT(*) as count
            FROM project_metrics_realtime 
            WHERE success_rate_percent < 0 OR success_rate_percent > 100
        `;
        
        const invalidSuccessRateResult = await client.query(invalidSuccessRateQuery);
        if (parseInt(invalidSuccessRateResult.rows[0].count) > 0) {
            issues.push(`${invalidSuccessRateResult.rows[0].count} contracts have invalid success rates`);
        }

    } finally {
        client.release();
    }

    return { table: 'project_metrics_realtime', issues };
}

/**
 * Validate wallet metrics table data
 * @returns {Object} Validation results
 */
async function validateWalletMetricsTable(pool) {
    const client = await pool.connect();
    const issues = [];
    
    try {
        // Check for invalid wallet types
        const invalidTypesQuery = `
            SELECT COUNT(*) as count
            FROM wallet_metrics_realtime 
            WHERE wallet_type NOT IN ('whale', 'premium', 'regular', 'small')
        `;
        
        const invalidTypesResult = await client.query(invalidTypesQuery);
        if (parseInt(invalidTypesResult.rows[0].count) > 0) {
            issues.push(`${invalidTypesResult.rows[0].count} wallets have invalid wallet types`);
        }

        // Check for negative spending amounts
        const negativeSpendingQuery = `
            SELECT COUNT(*) as count
            FROM wallet_metrics_realtime 
            WHERE total_spent_eth < 0 OR total_gas_spent_eth < 0
        `;
        
        const negativeSpendingResult = await client.query(negativeSpendingQuery);
        if (parseInt(negativeSpendingResult.rows[0].count) > 0) {
            issues.push(`${negativeSpendingResult.rows[0].count} wallets have negative spending amounts`);
        }

    } finally {
        client.release();
    }

    return { table: 'wallet_metrics_realtime', issues };
}

/**
 * Validate data integrity across tables
 * @returns {Object} Validation results
 */
async function validateDataIntegrity(pool) {
    const client = await pool.connect();
    const issues = [];
    
    try {
        // Check for orphaned metrics (metrics without corresponding contracts)
        const orphanedMetricsQuery = `
            SELECT COUNT(*) as count
            FROM project_metrics_realtime pmr
            LEFT JOIN bi_contract_index bci ON pmr.contract_address = bci.contract_address
            WHERE bci.contract_address IS NULL
        `;
        
        const orphanedMetricsResult = await client.query(orphanedMetricsQuery);
        if (parseInt(orphanedMetricsResult.rows[0].count) > 0) {
            issues.push(`${orphanedMetricsResult.rows[0].count} metrics records have no corresponding contract`);
        }

        // Check for missing metrics (contracts without metrics)
        const missingMetricsQuery = `
            SELECT COUNT(*) as count
            FROM bi_contract_index bci
            LEFT JOIN project_metrics_realtime pmr ON bci.contract_address = pmr.contract_address
            WHERE pmr.contract_address IS NULL
        `;
        
        const missingMetricsResult = await client.query(missingMetricsQuery);
        if (parseInt(missingMetricsResult.rows[0].count) > 0) {
            issues.push(`${missingMetricsResult.rows[0].count} contracts have no metrics calculated`);
        }

    } finally {
        client.release();
    }

    return { table: 'data_integrity', issues };
}

/**
 * Manual trigger for immediate metrics update
 * @param {string} contractAddress - Contract address to update
 * @param {bigint} chainId - Chain ID
 */
async function triggerManualUpdate(contractAddress, chainId, pipeline) {
    console.log(`🔄 Manual metrics update triggered for ${contractAddress}`);
    
    try {
        await pipeline.updateProjectMetricsRealtime(contractAddress, chainId);
        console.log(`✅ Manual update completed for ${contractAddress}`);
        return { success: true, message: 'Metrics updated successfully' };
    } catch (error) {
        console.error(`❌ Manual update failed for ${contractAddress}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get metrics pipeline statistics
 */
async function getPipelineStatistics(pool) {
    const client = await pool.connect();
    
    try {
        const stats = {};

        // Project metrics statistics
        const projectStatsQuery = `
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '1 hour' THEN 1 END) as updated_last_hour,
                COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '1 day' THEN 1 END) as updated_last_day,
                AVG(growth_score) as avg_growth_score,
                AVG(health_score) as avg_health_score,
                AVG(risk_score) as avg_risk_score
            FROM project_metrics_realtime
        `;
        
        const projectStatsResult = await client.query(projectStatsQuery);
        stats.projects = projectStatsResult.rows[0];

        // Wallet metrics statistics
        const walletStatsQuery = `
            SELECT 
                COUNT(*) as total_wallets,
                COUNT(CASE WHEN wallet_type = 'whale' THEN 1 END) as whale_wallets,
                COUNT(CASE WHEN wallet_type = 'premium' THEN 1 END) as premium_wallets,
                COUNT(CASE WHEN wallet_type = 'regular' THEN 1 END) as regular_wallets,
                COUNT(CASE WHEN wallet_type = 'small' THEN 1 END) as small_wallets,
                AVG(loyalty_score) as avg_loyalty_score
            FROM wallet_metrics_realtime
        `;
        
        const walletStatsResult = await client.query(walletStatsQuery);
        stats.wallets = walletStatsResult.rows[0];

        // Daily metrics statistics
        const dailyStatsQuery = `
            SELECT 
                COUNT(*) as total_daily_records,
                COUNT(DISTINCT contract_address) as contracts_with_daily_data,
                MAX(date) as latest_daily_date,
                AVG(daily_growth_score) as avg_daily_growth_score
            FROM project_metrics_daily
        `;
        
        const dailyStatsResult = await client.query(dailyStatsQuery);
        stats.daily = dailyStatsResult.rows[0];

        return stats;

    } finally {
        client.release();
    }
}

export {
    upsertWalletMetrics,
    recalculateHistoricalMetrics,
    startValidationMonitor,
    runDataValidation,
    validateProjectMetricsTable,
    validateWalletMetricsTable,
    validateDataIntegrity,
    triggerManualUpdate,
    getPipelineStatistics
};