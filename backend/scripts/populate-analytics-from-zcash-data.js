import pool from './src/db/db.js';
import { initializeWalletAdoption, updateWalletAdoptionStages } from './src/services/adoptionStageService.js';
import { saveProcessedTransaction } from './src/models/analytics.js';

async function populateAnalyticsFromZcashData() {
  console.log('🚀 Populating Analytics from Real Zcash Data...\n');

  try {
    // Step 1: Analyze the existing Zcash transaction data
    console.log('📊 Step 1: Analyzing Zcash Transaction Data');
    
    const transactionStats = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        MIN(block_height) as min_block,
        MAX(block_height) as max_block,
        MIN(timestamp) as earliest_tx,
        MAX(timestamp) as latest_tx,
        COUNT(DISTINCT CASE WHEN is_shielded = true THEN txid END) as shielded_count,
        AVG(total_value) as avg_value,
        SUM(total_value) as total_value
      FROM transactions
    `);

    const stats = transactionStats.rows[0];
    console.log('  Transaction Statistics:');
    console.log(`    Total transactions: ${stats.total_transactions}`);
    console.log(`    Block range: ${stats.min_block} - ${stats.max_block}`);
    console.log(`    Time range: ${stats.earliest_tx} to ${stats.latest_tx}`);
    console.log(`    Shielded transactions: ${stats.shielded_count}`);
    console.log(`    Average value: ${parseFloat(stats.avg_value).toFixed(6)} ZEC`);
    console.log(`    Total value: ${parseFloat(stats.total_value).toFixed(6)} ZEC`);
    console.log();

    // Step 2: Get address activity patterns
    console.log('📈 Step 2: Analyzing Address Activity Patterns');
    
    const addressStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.address) as unique_addresses,
        COUNT(*) as total_outputs
      FROM outputs o
      WHERE o.address IS NOT NULL
    `);

    console.log(`  Unique addresses with activity: ${addressStats.rows[0].unique_addresses}`);
    console.log(`  Total outputs: ${addressStats.rows[0].total_outputs}`);

    // Get top active addresses
    const topAddresses = await pool.query(`
      SELECT 
        o.address,
        COUNT(*) as tx_count,
        SUM(o.value) as total_value,
        MIN(t.timestamp) as first_seen,
        MAX(t.timestamp) as last_seen
      FROM outputs o
      JOIN transactions t ON o.txid = t.txid
      WHERE o.address IS NOT NULL
      GROUP BY o.address
      HAVING COUNT(*) >= 5
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);

    console.log(`  Found ${topAddresses.rows.length} addresses with 5+ transactions`);
    console.log('  Top 5 most active addresses:');
    topAddresses.rows.slice(0, 5).forEach((addr, index) => {
      console.log(`    ${index + 1}. ${addr.address}: ${addr.tx_count} txs, ${parseFloat(addr.total_value).toFixed(6)} ZEC`);
    });
    console.log();

    // Step 3: Create wallets from active addresses
    console.log('🏦 Step 3: Creating Wallets from Active Addresses');
    
    // Get existing project
    const projectResult = await pool.query('SELECT id FROM projects LIMIT 1');
    if (projectResult.rows.length === 0) {
      console.log('  ❌ No project found. Creating a test project...');
      
      // Get or create a user
      let userResult = await pool.query('SELECT id FROM users LIMIT 1');
      if (userResult.rows.length === 0) {
        userResult = await pool.query(`
          INSERT INTO users (name, email, password_hash) 
          VALUES ('Test User', 'test@example.com', 'hashed_password')
          RETURNING id
        `);
      }
      
      const userId = userResult.rows[0].id;
      const newProject = await pool.query(`
        INSERT INTO projects (user_id, name, description, category)
        VALUES ($1, 'Zcash Analytics Test', 'Test project for analytics with real Zcash data', 'defi')
        RETURNING id
      `, [userId]);
      
      console.log(`  ✅ Created test project: ${newProject.rows[0].id}`);
    }

    const projectId = projectResult.rows.length > 0 ? 
      projectResult.rows[0].id : 
      (await pool.query('SELECT id FROM projects LIMIT 1')).rows[0].id;

    // Create wallets for top active addresses
    const walletsToCreate = topAddresses.rows.slice(0, 15); // Create 15 wallets for good sample size
    const createdWallets = [];

    for (const addr of walletsToCreate) {
      try {
        // Check if wallet already exists
        const existingWallet = await pool.query(
          'SELECT id FROM wallets WHERE address = $1',
          [addr.address]
        );

        let walletId;
        if (existingWallet.rows.length > 0) {
          walletId = existingWallet.rows[0].id;
          console.log(`  ♻️  Using existing wallet: ${addr.address}`);
        } else {
          // Determine wallet type based on address prefix
          let walletType = 't'; // default to transparent
          if (addr.address.startsWith('z')) {
            walletType = 'z';
          } else if (addr.address.startsWith('u')) {
            walletType = 'u';
          }

          const newWallet = await pool.query(`
            INSERT INTO wallets (project_id, address, type, description, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `, [
            projectId, 
            addr.address, 
            walletType,
            `Active address with ${addr.tx_count} transactions`,
            addr.first_seen
          ]);
          
          walletId = newWallet.rows[0].id;
          console.log(`  ✅ Created wallet: ${addr.address} (${addr.tx_count} txs)`);
        }

        createdWallets.push({
          id: walletId,
          address: addr.address,
          tx_count: addr.tx_count,
          first_seen: addr.first_seen,
          last_seen: addr.last_seen,
          total_value: addr.total_value
        });

      } catch (error) {
        console.log(`  ❌ Error creating wallet for ${addr.address}: ${error.message}`);
      }
    }

    console.log(`  📊 Created/found ${createdWallets.length} wallets for analytics`);
    console.log();

    // Step 4: Process transactions for these wallets
    console.log('⚙️  Step 4: Processing Transactions for Analytics');
    
    let totalProcessed = 0;
    for (const wallet of createdWallets) {
      console.log(`  Processing transactions for ${wallet.address}...`);
      
      // Get transactions for this address
      const walletTxs = await pool.query(`
        SELECT DISTINCT
          t.txid,
          t.block_height,
          t.timestamp,
          t.total_value,
          t.fee,
          t.is_shielded,
          o.value as output_value,
          'transparent' as tx_type
        FROM transactions t
        JOIN outputs o ON t.txid = o.txid
        WHERE o.address = $1
        ORDER BY t.timestamp ASC
        LIMIT 50
      `, [wallet.address]);

      // Initialize adoption tracking
      try {
        await initializeWalletAdoption(wallet.id);
      } catch (error) {
        // Already initialized
      }

      // Process each transaction
      let processedCount = 0;
      for (const tx of walletTxs.rows) {
        try {
          const txData = {
            wallet_id: wallet.id,
            txid: tx.txid,
            block_height: tx.block_height,
            block_timestamp: tx.timestamp,
            tx_type: tx.is_shielded ? 'shielded' : 'transfer',
            tx_subtype: tx.output_value > 0 ? 'incoming' : 'outgoing',
            value_zatoshi: Math.round((tx.output_value || 0) * 100000000), // Convert to zatoshi
            fee_zatoshi: Math.round((tx.fee || 0) * 100000000),
            counterparty_type: 'wallet',
            feature_used: tx.is_shielded ? 'shielded_transfer' : 'transparent_transfer',
            sequence_position: processedCount + 1,
            is_shielded: tx.is_shielded || false
          };

          await saveProcessedTransaction(txData);
          processedCount++;
          totalProcessed++;

        } catch (error) {
          // Transaction might already exist, continue
        }
      }

      // Update adoption stages
      try {
        const result = await updateWalletAdoptionStages(wallet.id);
        console.log(`    ✅ Processed ${processedCount} txs, updated ${result.updates.length} stages`);
      } catch (error) {
        console.log(`    ⚠️  Processed ${processedCount} txs, stage update failed: ${error.message}`);
      }
    }

    console.log(`  📊 Total transactions processed: ${totalProcessed}`);
    console.log();

    // Step 5: Generate analytics summary
    console.log('📈 Step 5: Analytics Summary');
    
    const analyticsSummary = await pool.query(`
      SELECT 
        COUNT(DISTINCT w.id) as total_wallets,
        COUNT(DISTINCT pt.wallet_id) as wallets_with_transactions,
        COUNT(DISTINCT was.wallet_id) as wallets_with_stages,
        COUNT(*) as total_processed_transactions,
        COUNT(CASE WHEN was.achieved_at IS NOT NULL THEN 1 END) as achieved_stages
      FROM wallets w
      LEFT JOIN processed_transactions pt ON w.id = pt.wallet_id
      LEFT JOIN wallet_adoption_stages was ON w.id = was.wallet_id
      WHERE w.project_id = $1
    `, [projectId]);

    const summary = analyticsSummary.rows[0];
    console.log('  Analytics Summary:');
    console.log(`    Total wallets: ${summary.total_wallets}`);
    console.log(`    Wallets with transactions: ${summary.wallets_with_transactions}`);
    console.log(`    Wallets with adoption stages: ${summary.wallets_with_stages}`);
    console.log(`    Total processed transactions: ${summary.total_processed_transactions}`);
    console.log(`    Achieved adoption stages: ${summary.achieved_stages}`);
    console.log();

    // Step 6: Show adoption funnel with real data
    console.log('🎯 Step 6: Adoption Funnel Analysis');
    
    const funnelAnalysis = await pool.query(`
      SELECT 
        was.stage_name,
        COUNT(*) as total_wallets,
        COUNT(CASE WHEN was.achieved_at IS NOT NULL THEN 1 END) as achieved_wallets,
        ROUND(100.0 * COUNT(CASE WHEN was.achieved_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as conversion_rate
      FROM wallets w
      JOIN wallet_adoption_stages was ON w.id = was.wallet_id
      WHERE w.project_id = $1
      GROUP BY was.stage_name
      ORDER BY 
        CASE was.stage_name
          WHEN 'created' THEN 1
          WHEN 'first_tx' THEN 2
          WHEN 'feature_usage' THEN 3
          WHEN 'recurring' THEN 4
          WHEN 'high_value' THEN 5
          ELSE 6
        END
    `, [projectId]);

    console.log('  Adoption Funnel:');
    funnelAnalysis.rows.forEach(stage => {
      console.log(`    ${stage.stage_name}: ${stage.achieved_wallets}/${stage.total_wallets} (${stage.conversion_rate}%)`);
    });
    console.log();

    console.log('✅ Analytics population completed!');
    console.log('🎉 You now have real Zcash data in your analytics system!');
    console.log();
    console.log('Next steps:');
    console.log('  - Run conversion analysis tests to see real drop-off patterns');
    console.log('  - Test cohort analysis with time-based groupings');
    console.log('  - Explore productivity scoring with actual transaction data');

  } catch (error) {
    console.error('❌ Analytics population failed:', error);
  } finally {
    await pool.end();
  }
}

// Run population
populateAnalyticsFromZcashData();