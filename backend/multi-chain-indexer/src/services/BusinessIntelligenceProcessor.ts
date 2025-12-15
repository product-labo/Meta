import { dbService } from './DbService';

export class BusinessIntelligenceProcessor {
    
    /**
     * Process and categorize contracts based on their activity patterns
     */
    async categorizeContracts(): Promise<void> {
        console.log('🔍 Starting contract categorization...');
        
        // Get all contracts with their transaction patterns
        const contracts = await dbService.query(`
            SELECT DISTINCT
                r.address,
                r.chain_id,
                r.name,
                COUNT(td.id) as tx_count,
                COUNT(DISTINCT td.from_address) as unique_users,
                SUM(td.value::numeric) as total_volume,
                array_agg(DISTINCT td.function_name) FILTER (WHERE td.function_name IS NOT NULL) as functions,
                array_agg(DISTINCT de.event_name) FILTER (WHERE de.event_name IS NOT NULL) as events
            FROM mc_registry r
            LEFT JOIN mc_transaction_details td ON td.to_address = r.address
            LEFT JOIN mc_decoded_events de ON de.registry_id = r.id
            GROUP BY r.address, r.chain_id, r.name
        `);

        for (const contract of contracts.rows) {
            const category = await this.detectContractCategory(contract);
            await this.indexContract(contract, category);
        }
        
        console.log(`✅ Categorized ${contracts.rows.length} contracts`);
    }

    /**
     * Detect contract category based on function signatures and events
     */
    private async detectContractCategory(contract: any): Promise<{categoryId: number, subcategory: string, protocolName: string}> {
        const functions = contract.functions || [];
        const events = contract.events || [];
        
        // DeFi Detection Patterns
        if (this.isDEXContract(functions, events)) {
            const categoryId = await this.getCategoryId('defi', 'dex');
            return { categoryId, subcategory: 'dex', protocolName: this.detectDEXProtocol(functions) };
        }
        
        if (this.isLendingContract(functions, events)) {
            const categoryId = await this.getCategoryId('defi', 'lending');
            return { categoryId, subcategory: 'lending', protocolName: this.detectLendingProtocol(functions) };
        }
        
        if (this.isYieldFarmingContract(functions, events)) {
            const categoryId = await this.getCategoryId('defi', 'yield-farming');
            return { categoryId, subcategory: 'yield-farming', protocolName: 'Unknown Yield Farm' };
        }
        
        // NFT Detection Patterns
        if (this.isNFTMarketplace(functions, events)) {
            const categoryId = await this.getCategoryId('nft', 'marketplace');
            return { categoryId, subcategory: 'marketplace', protocolName: this.detectNFTMarketplace(functions) };
        }
        
        if (this.isNFTContract(functions, events)) {
            const categoryId = await this.getCategoryId('nft', 'art');
            return { categoryId, subcategory: 'art', protocolName: 'NFT Collection' };
        }
        
        // DAO Detection
        if (this.isDAOContract(functions, events)) {
            const categoryId = await this.getCategoryId('dao', 'governance');
            return { categoryId, subcategory: 'governance', protocolName: 'DAO Contract' };
        }
        
        // Gaming Detection
        if (this.isGamingContract(functions, events)) {
            const categoryId = await this.getCategoryId('gaming', 'play-to-earn');
            return { categoryId, subcategory: 'play-to-earn', protocolName: 'Gaming Protocol' };
        }
        
        // Infrastructure Detection
        if (this.isBridgeContract(functions, events)) {
            const categoryId = await this.getCategoryId('infrastructure', 'bridge');
            return { categoryId, subcategory: 'bridge', protocolName: 'Cross-chain Bridge' };
        }
        
        // Default to infrastructure if we can't categorize
        const categoryId = await this.getCategoryId('infrastructure', 'oracle');
        return { categoryId, subcategory: 'unknown', protocolName: 'Unknown Protocol' };
    }

    /**
     * DEX Detection Logic
     */
    private isDEXContract(functions: string[], events: string[]): boolean {
        const dexFunctions = ['swap', 'swapExactTokensForTokens', 'swapTokensForExactTokens', 'addLiquidity', 'removeLiquidity'];
        const dexEvents = ['Swap', 'Mint', 'Burn', 'Sync'];
        
        return functions.some(f => dexFunctions.some(df => f?.toLowerCase().includes(df.toLowerCase()))) ||
               events.some(e => dexEvents.includes(e));
    }

    private detectDEXProtocol(functions: string[]): string {
        if (functions.some(f => f?.includes('swapExactTokensForTokens'))) return 'Uniswap V2';
        if (functions.some(f => f?.includes('exactInputSingle'))) return 'Uniswap V3';
        if (functions.some(f => f?.includes('swap'))) return 'Generic DEX';
        return 'Unknown DEX';
    }

    /**
     * Lending Protocol Detection
     */
    private isLendingContract(functions: string[], events: string[]): boolean {
        const lendingFunctions = ['mint', 'redeem', 'borrow', 'repayBorrow', 'liquidate'];
        const lendingEvents = ['Mint', 'Redeem', 'Borrow', 'RepayBorrow', 'LiquidateBorrow'];
        
        return functions.some(f => lendingFunctions.some(lf => f?.toLowerCase().includes(lf.toLowerCase()))) ||
               events.some(e => lendingEvents.includes(e));
    }

    private detectLendingProtocol(functions: string[]): string {
        if (functions.some(f => f?.includes('mint') && f?.includes('redeem'))) return 'Compound-like';
        if (functions.some(f => f?.includes('deposit') && f?.includes('withdraw'))) return 'Aave-like';
        return 'Generic Lending';
    }

    /**
     * Yield Farming Detection
     */
    private isYieldFarmingContract(functions: string[], events: string[]): boolean {
        const yieldFunctions = ['stake', 'unstake', 'harvest', 'claim', 'deposit', 'withdraw'];
        const yieldEvents = ['Staked', 'Unstaked', 'RewardPaid', 'Harvested'];
        
        return functions.some(f => yieldFunctions.some(yf => f?.toLowerCase().includes(yf.toLowerCase()))) ||
               events.some(e => yieldEvents.includes(e));
    }

    /**
     * NFT Marketplace Detection
     */
    private isNFTMarketplace(functions: string[], events: string[]): boolean {
        const marketplaceFunctions = ['matchOrders', 'fulfillOrder', 'cancelOrder', 'atomicMatch'];
        const marketplaceEvents = ['OrdersMatched', 'OrderFulfilled', 'OrderCancelled'];
        
        return functions.some(f => marketplaceFunctions.some(mf => f?.toLowerCase().includes(mf.toLowerCase()))) ||
               events.some(e => marketplaceEvents.includes(e));
    }

    private detectNFTMarketplace(functions: string[]): string {
        if (functions.some(f => f?.includes('matchOrders'))) return 'OpenSea';
        if (functions.some(f => f?.includes('fulfillOrder'))) return 'Seaport';
        return 'Generic NFT Marketplace';
    }

    /**
     * NFT Contract Detection
     */
    private isNFTContract(functions: string[], events: string[]): boolean {
        const nftFunctions = ['mint', 'tokenURI', 'ownerOf', 'transferFrom', 'safeTransferFrom'];
        const nftEvents = ['Transfer', 'Approval', 'ApprovalForAll'];
        
        // Must have Transfer event and NFT-specific functions
        return events.includes('Transfer') && 
               functions.some(f => ['tokenURI', 'ownerOf'].some(nf => f?.includes(nf)));
    }

    /**
     * DAO Contract Detection
     */
    private isDAOContract(functions: string[], events: string[]): boolean {
        const daoFunctions = ['propose', 'vote', 'execute', 'queue', 'cancel'];
        const daoEvents = ['ProposalCreated', 'VoteCast', 'ProposalExecuted'];
        
        return functions.some(f => daoFunctions.some(df => f?.toLowerCase().includes(df.toLowerCase()))) ||
               events.some(e => daoEvents.includes(e));
    }

    /**
     * Gaming Contract Detection
     */
    private isGamingContract(functions: string[], events: string[]): boolean {
        const gamingFunctions = ['play', 'battle', 'claim', 'breed', 'level', 'upgrade'];
        const gamingEvents = ['GamePlayed', 'RewardClaimed', 'LevelUp'];
        
        return functions.some(f => gamingFunctions.some(gf => f?.toLowerCase().includes(gf.toLowerCase()))) ||
               events.some(e => gamingEvents.includes(e));
    }

    /**
     * Bridge Contract Detection
     */
    private isBridgeContract(functions: string[], events: string[]): boolean {
        const bridgeFunctions = ['bridge', 'relay', 'deposit', 'withdraw', 'lock', 'unlock'];
        const bridgeEvents = ['Deposit', 'Withdrawal', 'RelayedMessage'];
        
        return functions.some(f => bridgeFunctions.some(bf => f?.toLowerCase().includes(bf.toLowerCase()))) ||
               events.some(e => bridgeEvents.includes(e));
    }

    /**
     * Get category ID from database
     */
    private async getCategoryId(categoryName: string, subcategory: string): Promise<number> {
        const result = await dbService.query(
            'SELECT id FROM bi_contract_categories WHERE category_name = $1 AND subcategory = $2',
            [categoryName, subcategory]
        );
        
        if (result.rows.length > 0) {
            return result.rows[0].id;
        }
        
        // Create new category if not exists
        const insertResult = await dbService.query(
            'INSERT INTO bi_contract_categories (category_name, subcategory) VALUES ($1, $2) RETURNING id',
            [categoryName, subcategory]
        );
        
        return insertResult.rows[0].id;
    }

    /**
     * Index contract in business intelligence database
     */
    private async indexContract(contract: any, category: any): Promise<void> {
        const riskScore = this.calculateContractRiskScore(contract);
        
        await dbService.query(`
            INSERT INTO bi_contract_index (
                contract_address, chain_id, category_id, contract_name, protocol_name,
                risk_score, is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (contract_address, chain_id) 
            DO UPDATE SET 
                category_id = $3,
                protocol_name = $5,
                risk_score = $6,
                updated_at = NOW()
        `, [
            contract.address,
            contract.chain_id,
            category.categoryId,
            contract.name || 'Unknown Contract',
            category.protocolName,
            riskScore,
            contract.tx_count > 100 // Consider verified if has significant activity
        ]);
    }

    /**
     * Calculate contract risk score based on activity patterns
     */
    private calculateContractRiskScore(contract: any): number {
        let riskScore = 50; // Start with medium risk
        
        // Lower risk for high activity contracts
        if (contract.tx_count > 1000) riskScore -= 20;
        else if (contract.tx_count > 100) riskScore -= 10;
        
        // Lower risk for contracts with many unique users
        if (contract.unique_users > 500) riskScore -= 15;
        else if (contract.unique_users > 50) riskScore -= 5;
        
        // Higher risk for very new contracts with low activity
        if (contract.tx_count < 10) riskScore += 30;
        
        // Ensure score is within bounds
        return Math.max(0, Math.min(100, riskScore));
    }

    /**
     * Generate weekly cohort analysis
     */
    async generateWeeklyCohorts(): Promise<void> {
        console.log('📊 Generating weekly cohort analysis...');
        
        const query = `
            WITH weekly_user_activity AS (
                SELECT 
                    td.from_address as user_address,
                    bci.chain_id,
                    bci.category_id,
                    bci.contract_address,
                    DATE_TRUNC('week', td.captured_at) as week_start,
                    COUNT(*) as transactions,
                    SUM(td.value::numeric) as volume,
                    SUM(td.gas_used * td.gas_price) as gas_fees
                FROM mc_transaction_details td
                JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                WHERE td.captured_at >= NOW() - INTERVAL '12 weeks'
                GROUP BY td.from_address, bci.chain_id, bci.category_id, bci.contract_address, DATE_TRUNC('week', td.captured_at)
            ),
            user_first_week AS (
                SELECT 
                    user_address,
                    chain_id,
                    category_id,
                    contract_address,
                    MIN(week_start) as first_week
                FROM weekly_user_activity
                GROUP BY user_address, chain_id, category_id, contract_address
            ),
            cohort_data AS (
                SELECT 
                    wua.chain_id,
                    wua.category_id,
                    wua.contract_address,
                    wua.week_start,
                    COUNT(DISTINCT wua.user_address) as total_active_users,
                    COUNT(DISTINCT CASE WHEN ufw.first_week = wua.week_start THEN wua.user_address END) as new_users,
                    COUNT(DISTINCT CASE WHEN ufw.first_week < wua.week_start THEN wua.user_address END) as returning_users,
                    COUNT(DISTINCT wua.user_address) as total_transactions,
                    SUM(wua.volume) as total_volume_usd,
                    SUM(wua.gas_fees) as total_gas_fees_usd
                FROM weekly_user_activity wua
                JOIN user_first_week ufw ON wua.user_address = ufw.user_address 
                    AND wua.chain_id = ufw.chain_id 
                    AND wua.category_id = ufw.category_id
                    AND wua.contract_address = ufw.contract_address
                GROUP BY wua.chain_id, wua.category_id, wua.contract_address, wua.week_start
            )
            INSERT INTO bi_weekly_cohorts (
                chain_id, category_id, contract_address, week_start,
                new_users, returning_users, total_active_users,
                total_transactions, total_volume_usd, total_fees_usd
            )
            SELECT 
                chain_id, category_id, contract_address, week_start,
                new_users, returning_users, total_active_users,
                total_transactions, total_volume_usd / 1e18, total_gas_fees_usd / 1e18
            FROM cohort_data
            ON CONFLICT (chain_id, category_id, contract_address, week_start)
            DO UPDATE SET
                new_users = EXCLUDED.new_users,
                returning_users = EXCLUDED.returning_users,
                total_active_users = EXCLUDED.total_active_users,
                total_transactions = EXCLUDED.total_transactions,
                total_volume_usd = EXCLUDED.total_volume_usd,
                total_fees_usd = EXCLUDED.total_fees_usd
        `;
        
        await dbService.query(query);
        console.log('✅ Weekly cohort analysis completed');
    }

    /**
     * Generate daily business metrics
     */
    async generateDailyMetrics(): Promise<void> {
        console.log('📈 Generating daily business metrics...');
        
        const query = `
            WITH daily_stats AS (
                SELECT 
                    DATE(td.captured_at) as date,
                    bci.chain_id,
                    bci.category_id,
                    bci.contract_address,
                    COUNT(DISTINCT td.from_address) as daily_active_users,
                    COUNT(*) as total_transactions,
                    SUM(td.value::numeric) as daily_volume_usd,
                    SUM(td.gas_used * td.gas_price) as daily_fees_paid_usd,
                    AVG(td.gas_used * td.gas_price) as avg_transaction_fee
                FROM mc_transaction_details td
                JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                WHERE td.captured_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(td.captured_at), bci.chain_id, bci.category_id, bci.contract_address
            ),
            new_users_daily AS (
                SELECT 
                    DATE(td.captured_at) as date,
                    bci.chain_id,
                    bci.category_id,
                    bci.contract_address,
                    COUNT(DISTINCT td.from_address) as new_user_signups
                FROM mc_transaction_details td
                JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                WHERE td.captured_at >= CURRENT_DATE - INTERVAL '30 days'
                AND td.from_address IN (
                    SELECT DISTINCT from_address 
                    FROM mc_transaction_details td2 
                    WHERE DATE(td2.captured_at) = DATE(td.captured_at)
                    AND td2.to_address = td.to_address
                    GROUP BY from_address 
                    HAVING MIN(td2.captured_at) = DATE(td.captured_at)
                )
                GROUP BY DATE(td.captured_at), bci.chain_id, bci.category_id, bci.contract_address
            )
            INSERT INTO bi_daily_metrics (
                date, chain_id, category_id, contract_address,
                daily_active_users, new_user_signups, total_transactions,
                daily_volume_usd, daily_fees_paid_usd, transactions_per_user
            )
            SELECT 
                ds.date, ds.chain_id, ds.category_id, ds.contract_address,
                ds.daily_active_users, 
                COALESCE(nud.new_user_signups, 0),
                ds.total_transactions,
                ds.daily_volume_usd / 1e18,
                ds.daily_fees_paid_usd / 1e18,
                CASE WHEN ds.daily_active_users > 0 THEN ds.total_transactions::decimal / ds.daily_active_users ELSE 0 END
            FROM daily_stats ds
            LEFT JOIN new_users_daily nud ON ds.date = nud.date 
                AND ds.chain_id = nud.chain_id 
                AND ds.category_id = nud.category_id
                AND ds.contract_address = nud.contract_address
            ON CONFLICT (date, chain_id, category_id, contract_address)
            DO UPDATE SET
                daily_active_users = EXCLUDED.daily_active_users,
                new_user_signups = EXCLUDED.new_user_signups,
                total_transactions = EXCLUDED.total_transactions,
                daily_volume_usd = EXCLUDED.daily_volume_usd,
                daily_fees_paid_usd = EXCLUDED.daily_fees_paid_usd,
                transactions_per_user = EXCLUDED.transactions_per_user
        `;
        
        await dbService.query(query);
        console.log('✅ Daily business metrics completed');
    }

    /**
     * Run complete business intelligence processing
     */
    async processBusinessIntelligence(): Promise<void> {
        console.log('🚀 Starting Business Intelligence Processing...');
        
        try {
            await this.categorizeContracts();
            await this.generateWeeklyCohorts();
            await this.generateDailyMetrics();
            
            console.log('🎉 Business Intelligence Processing completed successfully!');
        } catch (error) {
            console.error('❌ Business Intelligence Processing failed:', error);
            throw error;
        }
    }
}

export const businessIntelligenceProcessor = new BusinessIntelligenceProcessor();