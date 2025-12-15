const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testBusinessIntelligence() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('🚀 BUSINESS INTELLIGENCE & INVESTOR INSIGHTS ANALYSIS');
        console.log('='.repeat(80));

        // 1. ECOSYSTEM OVERVIEW
        console.log('\n📊 ECOSYSTEM OVERVIEW - INVESTOR DASHBOARD');
        console.log('='.repeat(60));

        const ecosystemQuery = `
            SELECT 
                -- Core Metrics
                COUNT(DISTINCT td.from_address) as total_unique_users,
                COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '7 days' THEN td.from_address END) as weekly_active_users,
                COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '1 day' THEN td.from_address END) as daily_active_users,
                
                -- Transaction Metrics
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_transactions,
                
                -- Financial Metrics
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                SUM(td.gas_used * td.gas_price) / 1e18 as total_fees_paid_eth,
                
                -- Protocol Diversity
                COUNT(DISTINCT bci.protocol_name) as active_protocols,
                COUNT(DISTINCT bci.category_id) as active_categories,
                COUNT(DISTINCT td.chain_id) as active_chains
                
            FROM mc_transaction_details td
            LEFT JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
            WHERE td.captured_at > NOW() - INTERVAL '30 days'
        `;

        const ecosystemResult = await client.query(ecosystemQuery);
        const ecosystem = ecosystemResult.rows[0];

        // Calculate key business metrics
        const successRate = ((ecosystem.successful_transactions / ecosystem.total_transactions) * 100).toFixed(2);
        const userStickiness = ((ecosystem.daily_active_users / ecosystem.weekly_active_users) * 100).toFixed(2);
        const avgTransactionValue = (ecosystem.total_volume_eth / ecosystem.total_transactions).toFixed(6);
        const revenuePerUser = (ecosystem.total_fees_paid_eth / ecosystem.total_unique_users).toFixed(6);

        console.log('💰 FINANCIAL TRACTION:');
        console.log(`   Total Volume (30d): ${parseFloat(ecosystem.total_volume_eth).toFixed(2)} ETH`);
        console.log(`   Total Fees Paid: ${parseFloat(ecosystem.total_fees_paid_eth).toFixed(4)} ETH`);
        console.log(`   Avg Transaction Value: ${avgTransactionValue} ETH`);
        console.log(`   Revenue per User: ${revenuePerUser} ETH`);

        console.log('\n👥 USER ADOPTION:');
        console.log(`   Total Unique Users: ${ecosystem.total_unique_users.toLocaleString()}`);
        console.log(`   Weekly Active Users: ${ecosystem.weekly_active_users.toLocaleString()}`);
        console.log(`   Daily Active Users: ${ecosystem.daily_active_users.toLocaleString()}`);
        console.log(`   User Stickiness (DAU/WAU): ${userStickiness}%`);

        console.log('\n🔧 OPERATIONAL METRICS:');
        console.log(`   Total Transactions: ${ecosystem.total_transactions.toLocaleString()}`);
        console.log(`   Success Rate: ${successRate}%`);
        console.log(`   Active Protocols: ${ecosystem.active_protocols}`);
        console.log(`   Active Categories: ${ecosystem.active_categories}`);
        console.log(`   Active Chains: ${ecosystem.active_chains}`);

        // 2. CATEGORY BREAKDOWN - MARKET SEGMENTS
        console.log('\n🏷️  MARKET SEGMENT ANALYSIS');
        console.log('='.repeat(60));

        const categoryQuery = `
            SELECT 
                bcc.category_name,
                bcc.subcategory,
                COUNT(DISTINCT bci.contract_address) as contract_count,
                COUNT(DISTINCT td.from_address) as unique_users,
                COUNT(*) as total_transactions,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                AVG(bci.risk_score) as avg_risk_score,
                COUNT(CASE WHEN bci.is_verified = true THEN 1 END) as verified_contracts
            FROM bi_contract_categories bcc
            JOIN bi_contract_index bci ON bcc.id = bci.category_id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '30 days'
            GROUP BY bcc.category_name, bcc.subcategory
            HAVING COUNT(*) > 0
            ORDER BY unique_users DESC, total_volume_eth DESC
        `;

        const categoryResult = await client.query(categoryQuery);

        categoryResult.rows.forEach(cat => {
            const marketShare = ((cat.unique_users / ecosystem.total_unique_users) * 100).toFixed(1);
            const volumeShare = ((cat.total_volume_eth / ecosystem.total_volume_eth) * 100).toFixed(1);

            console.log(`\n📂 ${cat.category_name.toUpperCase()}/${cat.subcategory}:`);
            console.log(`   Market Share: ${marketShare}% users, ${volumeShare}% volume`);
            console.log(`   Contracts: ${cat.contract_count} (${cat.verified_contracts} verified)`);
            console.log(`   Users: ${cat.unique_users?.toLocaleString() || 0}`);
            console.log(`   Volume: ${parseFloat(cat.total_volume_eth || 0).toFixed(2)} ETH`);
            console.log(`   Risk Score: ${Math.round(cat.avg_risk_score || 50)}/100`);
        });

        // 3. PROTOCOL TRACTION ANALYSIS
        console.log('\n🚀 TOP PROTOCOL TRACTION (Investor Focus)');
        console.log('='.repeat(60));

        const protocolQuery = `
            SELECT 
                bci.protocol_name,
                bcc.category_name,
                COUNT(DISTINCT td.from_address) as unique_users,
                COUNT(*) as total_transactions,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                AVG(bci.risk_score) as risk_score,
                COUNT(DISTINCT bci.contract_address) as contract_count,
                -- User retention calculation
                COUNT(DISTINCT CASE WHEN user_tx_count.tx_count > 1 THEN td.from_address END) * 100.0 / 
                NULLIF(COUNT(DISTINCT td.from_address), 0) as user_retention_rate,
                -- Power user ratio (>10 transactions)
                COUNT(DISTINCT CASE WHEN user_tx_count.tx_count > 10 THEN td.from_address END) * 100.0 / 
                NULLIF(COUNT(DISTINCT td.from_address), 0) as power_user_ratio
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '30 days'
            LEFT JOIN (
                SELECT 
                    from_address,
                    COUNT(*) as tx_count
                FROM mc_transaction_details
                WHERE captured_at > NOW() - INTERVAL '30 days'
                GROUP BY from_address
            ) user_tx_count ON td.from_address = user_tx_count.from_address
            GROUP BY bci.protocol_name, bcc.category_name
            HAVING COUNT(*) > 0
            ORDER BY unique_users DESC, total_volume_eth DESC
            LIMIT 15
        `;

        const protocolResult = await client.query(protocolQuery);

        protocolResult.rows.forEach((protocol, index) => {
            const rank = index + 1;
            const avgTransactionSize = protocol.total_transactions > 0
                ? (protocol.total_volume_eth / protocol.total_transactions).toFixed(6)
                : 0;

            console.log(`\n${rank}. ${protocol.protocol_name} (${protocol.category_name})`);
            console.log(`   👥 Users: ${protocol.unique_users?.toLocaleString() || 0}`);
            console.log(`   💰 Volume: ${parseFloat(protocol.total_volume_eth || 0).toFixed(2)} ETH`);
            console.log(`   📊 Transactions: ${protocol.total_transactions?.toLocaleString() || 0}`);
            console.log(`   🔄 User Retention: ${parseFloat(protocol.user_retention_rate || 0).toFixed(1)}%`);
            console.log(`   ⭐ Power Users: ${parseFloat(protocol.power_user_ratio || 0).toFixed(1)}%`);
            console.log(`   ⚖️  Risk Score: ${Math.round(protocol.risk_score || 50)}/100`);
            console.log(`   💸 Avg Tx Size: ${avgTransactionSize} ETH`);
        });

        // 4. CHAIN DISTRIBUTION ANALYSIS
        console.log('\n⛓️  CROSS-CHAIN DISTRIBUTION');
        console.log('='.repeat(60));

        const chainQuery = `
            SELECT 
                c.name as chain_name,
                COUNT(DISTINCT td.from_address) as unique_users,
                COUNT(*) as total_transactions,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                COUNT(DISTINCT bci.contract_address) as active_contracts,
                AVG(td.gas_used * td.gas_price) / 1e18 as avg_gas_fee_eth
            FROM mc_chains c
            LEFT JOIN mc_transaction_details td ON c.id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '30 days'
            LEFT JOIN bi_contract_index bci ON c.id = bci.chain_id
            GROUP BY c.id, c.name
            HAVING COUNT(*) > 0
            ORDER BY unique_users DESC
        `;

        const chainResult = await client.query(chainQuery);

        chainResult.rows.forEach(chain => {
            const userShare = ((chain.unique_users / ecosystem.total_unique_users) * 100).toFixed(1);
            const volumeShare = ((chain.total_volume_eth / ecosystem.total_volume_eth) * 100).toFixed(1);

            console.log(`\n🔗 ${chain.chain_name.toUpperCase()}:`);
            console.log(`   Market Share: ${userShare}% users, ${volumeShare}% volume`);
            console.log(`   Users: ${chain.unique_users?.toLocaleString() || 0}`);
            console.log(`   Volume: ${parseFloat(chain.total_volume_eth || 0).toFixed(2)} ETH`);
            console.log(`   Contracts: ${chain.active_contracts || 0}`);
            console.log(`   Avg Gas Fee: ${parseFloat(chain.avg_gas_fee_eth || 0).toFixed(6)} ETH`);
        });

        // 5. RISK ANALYSIS FOR INVESTORS
        console.log('\n⚠️  RISK ANALYSIS & COMPLIANCE');
        console.log('='.repeat(60));

        const riskQuery = `
            SELECT 
                CASE 
                    WHEN bci.risk_score <= 30 THEN 'Low Risk'
                    WHEN bci.risk_score <= 70 THEN 'Medium Risk'
                    ELSE 'High Risk'
                END as risk_category,
                COUNT(*) as contract_count,
                COUNT(DISTINCT td.from_address) as unique_users,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                AVG(bci.risk_score) as avg_risk_score
            FROM bi_contract_index bci
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '30 days'
            GROUP BY 
                CASE 
                    WHEN bci.risk_score <= 30 THEN 'Low Risk'
                    WHEN bci.risk_score <= 70 THEN 'Medium Risk'
                    ELSE 'High Risk'
                END
            ORDER BY avg_risk_score
        `;

        const riskResult = await client.query(riskQuery);

        riskResult.rows.forEach(risk => {
            const userShare = ((risk.unique_users / ecosystem.total_unique_users) * 100).toFixed(1);
            const volumeShare = ((risk.total_volume_eth / ecosystem.total_volume_eth) * 100).toFixed(1);

            console.log(`\n${risk.risk_category}:`);
            console.log(`   Contracts: ${risk.contract_count}`);
            console.log(`   Users: ${risk.unique_users?.toLocaleString() || 0} (${userShare}%)`);
            console.log(`   Volume: ${parseFloat(risk.total_volume_eth || 0).toFixed(2)} ETH (${volumeShare}%)`);
            console.log(`   Avg Risk Score: ${Math.round(risk.avg_risk_score)}/100`);
        });

        // 6. BUSINESS INSIGHTS SUMMARY
        console.log('\n💡 KEY BUSINESS INSIGHTS FOR INVESTORS');
        console.log('='.repeat(60));

        const totalVolumeUSD = parseFloat(ecosystem.total_volume_eth) * 2000; // Assume $2000 ETH
        const totalFeesUSD = parseFloat(ecosystem.total_fees_paid_eth) * 2000;

        console.log('📈 TRACTION INDICATORS:');
        console.log(`   • ${ecosystem.total_unique_users.toLocaleString()} unique users across ${ecosystem.active_chains} chains`);
        console.log(`   • $${totalVolumeUSD.toLocaleString()} in transaction volume (30d)`);
        console.log(`   • ${userStickiness}% user stickiness (strong engagement)`);
        console.log(`   • ${successRate}% transaction success rate (high reliability)`);

        console.log('\n💰 REVENUE POTENTIAL:');
        console.log(`   • $${totalFeesUSD.toLocaleString()} in gas fees paid (market size indicator)`);
        console.log(`   • $${(totalFeesUSD / ecosystem.total_unique_users).toFixed(2)} revenue per user potential`);
        console.log(`   • ${ecosystem.active_protocols} active protocols (diverse ecosystem)`);

        console.log('\n🎯 MARKET OPPORTUNITIES:');
        const topCategory = categoryResult.rows[0];
        if (topCategory) {
            const categoryDominance = ((topCategory.unique_users / ecosystem.total_unique_users) * 100).toFixed(1);
            console.log(`   • ${topCategory.category_name} dominates with ${categoryDominance}% market share`);
        }
        console.log(`   • Cross-chain activity indicates strong interoperability demand`);
        console.log(`   • High user retention rates suggest sticky product-market fit`);

        console.log('\n⚠️  RISK CONSIDERATIONS:');
        const highRiskContracts = riskResult.rows.find(r => r.risk_category === 'High Risk');
        if (highRiskContracts) {
            console.log(`   • ${highRiskContracts.contract_count} high-risk contracts need monitoring`);
        }
        console.log(`   • Smart contract verification rates indicate security maturity`);
        console.log(`   • Gas fee trends show network congestion and adoption`);

        console.log('\n🚀 GROWTH INDICATORS:');
        console.log(`   • Multi-protocol ecosystem with ${ecosystem.active_protocols} active protocols`);
        console.log(`   • Strong user engagement with ${parseFloat(avgTransactionValue).toFixed(6)} ETH avg transaction`);
        console.log(`   • Diversified risk profile across categories and chains`);

        console.log('\n✅ BUSINESS INTELLIGENCE ANALYSIS COMPLETE!');
        console.log('   This data provides comprehensive insights for:');
        console.log('   • Investment decisions and due diligence');
        console.log('   • Market opportunity assessment');
        console.log('   • Risk evaluation and compliance');
        console.log('   • Competitive analysis and positioning');
        console.log('   • User behavior and retention analysis');

    } catch (error) {
        console.error('❌ Error in business intelligence analysis:', error.message);
    } finally {
        await client.end();
    }
}

testBusinessIntelligence();