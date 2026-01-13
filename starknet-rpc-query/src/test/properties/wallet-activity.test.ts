import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Wallet Activity Tracking Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 36: Wallet activity tracking
  test('should comprehensively track wallet activity across time and contracts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          wallet_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          activity_period: fc.record({
            start_block: fc.bigInt({ min: 1n, max: 100000n }),
            end_block: fc.bigInt({ min: 100001n, max: 999999n }),
            total_days: fc.integer({ min: 7, max: 90 })
          }),
          contracts_interacted: fc.array(
            fc.record({
              contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              interaction_frequency: fc.integer({ min: 1, max: 20 }),
              functions_used: fc.array(
                fc.constantFrom('transfer', 'approve', 'mint', 'burn', 'swap', 'deposit', 'withdraw', 'stake'),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 8 }
          )
        }),
        async (activityData) => {
          // Ensure unique contracts
          const uniqueContracts = activityData.contracts_interacted.filter((contract, index, arr) => 
            arr.findIndex(c => c.contract_address === contract.contract_address) === index
          );

          let totalInteractions = 0;
          const blockRange = activityData.activity_period.end_block - activityData.activity_period.start_block;
          const blocksPerDay = blockRange / BigInt(activityData.activity_period.total_days);

          // Setup contracts and create activity
          for (const contract of uniqueContracts) {
            const classHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
            
            await db.query(`
              INSERT INTO contract_classes (class_hash, abi_json)
              VALUES ($1, $2)
              ON CONFLICT (class_hash) DO NOTHING
            `, [classHash, '{}']);

            await db.query(`
              INSERT INTO contracts (contract_address, class_hash, deployment_block)
              VALUES ($1, $2, $3)
              ON CONFLICT (contract_address) DO NOTHING
            `, [contract.contract_address, classHash, '1']);

            // Create functions
            const functionIds: { [key: string]: number } = {};
            for (const functionName of contract.functions_used) {
              const funcResult = await db.query(`
                INSERT INTO functions (class_hash, contract_address, function_name, state_mutability)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (class_hash, contract_address, function_name) DO UPDATE SET
                  state_mutability = EXCLUDED.state_mutability
                RETURNING function_id
              `, [classHash, contract.contract_address, functionName, 'external']);
              
              functionIds[functionName] = funcResult[0].function_id;
            }

            // Distribute interactions across time period
            for (let i = 0; i < contract.interaction_frequency; i++) {
              const dayOffset = Math.floor(Math.random() * activityData.activity_period.total_days);
              const blockNumber = activityData.activity_period.start_block + (BigInt(dayOffset) * blocksPerDay) + 
                BigInt(Math.floor(Math.random() * Number(blocksPerDay)));
              
              const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
              const functionName = contract.functions_used[Math.floor(Math.random() * contract.functions_used.length)];

              // Setup block and transaction
              await db.query(`
                INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (block_number) DO NOTHING
              `, [
                blockNumber.toString(),
                '0x' + blockNumber.toString(16).padStart(64, '0'),
                (Date.now() + dayOffset * 24 * 60 * 60 * 1000).toString(),
                'ACCEPTED_ON_L2'
              ]);

              await db.query(`
                INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (tx_hash) DO NOTHING
              `, [txHash, blockNumber.toString(), 'INVOKE', activityData.wallet_address, 'ACCEPTED_ON_L2']);

              // Record wallet interaction
              await db.query(`
                INSERT INTO wallet_interactions (wallet_address, contract_address, function_id, tx_hash, block_number)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                activityData.wallet_address,
                contract.contract_address,
                functionIds[functionName],
                txHash,
                blockNumber.toString()
              ]);

              totalInteractions++;
            }
          }

          // Test comprehensive activity tracking
          const activitySummary = await db.query(`
            SELECT 
              COUNT(*) as total_interactions,
              COUNT(DISTINCT wi.contract_address) as unique_contracts,
              COUNT(DISTINCT f.function_name) as unique_functions,
              COUNT(DISTINCT wi.block_number) as unique_blocks,
              MIN(wi.block_number) as first_activity,
              MAX(wi.block_number) as last_activity,
              COUNT(DISTINCT DATE_TRUNC('day', b.timestamp)) as active_days
            FROM wallet_interactions wi
            JOIN functions f ON wi.function_id = f.function_id
            JOIN blocks b ON wi.block_number = b.block_number
            WHERE wi.wallet_address = $1
              AND wi.block_number BETWEEN $2 AND $3
          `, [
            activityData.wallet_address,
            activityData.activity_period.start_block.toString(),
            activityData.activity_period.end_block.toString()
          ]);

          expect(activitySummary).toHaveLength(1);
          const summary = activitySummary[0];

          expect(parseInt(summary.total_interactions)).toBe(totalInteractions);
          expect(parseInt(summary.unique_contracts)).toBe(uniqueContracts.length);
          expect(BigInt(summary.first_activity)).toBeGreaterThanOrEqual(activityData.activity_period.start_block);
          expect(BigInt(summary.last_activity)).toBeLessThanOrEqual(activityData.activity_period.end_block);

          // Test activity distribution analysis
          const dailyActivity = await db.query(`
            SELECT 
              DATE_TRUNC('day', b.timestamp) as activity_date,
              COUNT(*) as daily_interactions,
              COUNT(DISTINCT wi.contract_address) as daily_contracts,
              COUNT(DISTINCT f.function_name) as daily_functions
            FROM wallet_interactions wi
            JOIN functions f ON wi.function_id = f.function_id
            JOIN blocks b ON wi.block_number = b.block_number
            WHERE wi.wallet_address = $1
              AND wi.block_number BETWEEN $2 AND $3
            GROUP BY DATE_TRUNC('day', b.timestamp)
            ORDER BY activity_date
          `, [
            activityData.wallet_address,
            activityData.activity_period.start_block.toString(),
            activityData.activity_period.end_block.toString()
          ]);

          expect(dailyActivity.length).toBeGreaterThan(0);
          expect(dailyActivity.length).toBeLessThanOrEqual(activityData.activity_period.total_days);

          // Verify daily activity consistency
          let totalDailyInteractions = 0;
          for (const day of dailyActivity) {
            expect(parseInt(day.daily_interactions)).toBeGreaterThan(0);
            expect(parseInt(day.daily_contracts)).toBeGreaterThan(0);
            expect(parseInt(day.daily_functions)).toBeGreaterThan(0);
            totalDailyInteractions += parseInt(day.daily_interactions);
          }

          expect(totalDailyInteractions).toBe(totalInteractions);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should track wallet behavior patterns and trends', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          wallet_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          behavior_pattern: fc.constantFrom('ACTIVE_TRADER', 'HODLER', 'DEFI_USER', 'NFT_COLLECTOR'),
          time_periods: fc.array(
            fc.record({
              start_block: fc.bigInt({ min: 1n, max: 999999n }),
              activity_level: fc.constantFrom('HIGH', 'MEDIUM', 'LOW'),
              dominant_function: fc.constantFrom('transfer', 'swap', 'stake', 'mint')
            }),
            { minLength: 3, maxLength: 6 }
          )
        }),
        async (behaviorData) => {
          // Sort periods by block number
          const sortedPeriods = behaviorData.time_periods.sort((a, b) => 
            Number(a.start_block - b.start_block)
          );

          // Setup contract for interactions
          const contractAddress = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
          const classHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
          
          await db.query(`
            INSERT INTO contract_classes (class_hash, abi_json)
            VALUES ($1, $2)
            ON CONFLICT (class_hash) DO NOTHING
          `, [classHash, JSON.stringify({ pattern: behaviorData.behavior_pattern })]);

          await db.query(`
            INSERT INTO contracts (contract_address, class_hash, deployment_block)
            VALUES ($1, $2, $3)
            ON CONFLICT (contract_address) DO NOTHING
          `, [contractAddress, classHash, '1']);

          // Create behavior-specific activity patterns
          const periodData: Array<{ period: any, interactions: number, functionId: number }> = [];
          
          for (const period of sortedPeriods) {
            // Setup function for this period
            const funcResult = await db.query(`
              INSERT INTO functions (class_hash, contract_address, function_name, state_mutability)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (class_hash, contract_address, function_name) DO UPDATE SET
                state_mutability = EXCLUDED.state_mutability
              RETURNING function_id
            `, [classHash, contractAddress, period.dominant_function, 'external']);

            const functionId = funcResult[0].function_id;

            // Generate interactions based on activity level
            const interactionCount = period.activity_level === 'HIGH' ? 10 : 
                                   period.activity_level === 'MEDIUM' ? 5 : 2;

            for (let i = 0; i < interactionCount; i++) {
              const blockNumber = period.start_block + BigInt(i * 100);
              const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');

              await db.query(`
                INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (block_number) DO NOTHING
              `, [
                blockNumber.toString(),
                '0x' + blockNumber.toString(16).padStart(64, '0'),
                Date.now().toString(),
                'ACCEPTED_ON_L2'
              ]);

              await db.query(`
                INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (tx_hash) DO NOTHING
              `, [txHash, blockNumber.toString(), 'INVOKE', behaviorData.wallet_address, 'ACCEPTED_ON_L2']);

              await db.query(`
                INSERT INTO wallet_interactions (wallet_address, contract_address, function_id, tx_hash, block_number)
                VALUES ($1, $2, $3, $4, $5)
              `, [behaviorData.wallet_address, contractAddress, functionId, txHash, blockNumber.toString()]);
            }

            periodData.push({ period, interactions: interactionCount, functionId });
          }

          // Test behavior pattern analysis
          const behaviorAnalysis = await db.query(`
            SELECT 
              f.function_name,
              COUNT(*) as usage_count,
              AVG(wi.block_number::numeric) as avg_block,
              MIN(wi.block_number) as first_use,
              MAX(wi.block_number) as last_use,
              STDDEV(wi.block_number::numeric) as block_variance
            FROM wallet_interactions wi
            JOIN functions f ON wi.function_id = f.function_id
            WHERE wi.wallet_address = $1 AND wi.contract_address = $2
            GROUP BY f.function_name
            ORDER BY usage_count DESC
          `, [behaviorData.wallet_address, contractAddress]);

          expect(behaviorAnalysis.length).toBeGreaterThan(0);

          // Test trend analysis
          const trendAnalysis = await db.query(`
            WITH period_stats AS (
              SELECT 
                NTILE(3) OVER (ORDER BY wi.block_number) as period_tercile,
                COUNT(*) as interactions,
                f.function_name
              FROM wallet_interactions wi
              JOIN functions f ON wi.function_id = f.function_id
              WHERE wi.wallet_address = $1 AND wi.contract_address = $2
              GROUP BY NTILE(3) OVER (ORDER BY wi.block_number), f.function_name
            )
            SELECT 
              period_tercile,
              function_name,
              interactions,
              LAG(interactions) OVER (PARTITION BY function_name ORDER BY period_tercile) as prev_interactions
            FROM period_stats
            ORDER BY period_tercile, interactions DESC
          `, [behaviorData.wallet_address, contractAddress]);

          // Verify trend consistency with behavior pattern
          for (const trend of trendAnalysis) {
            expect(parseInt(trend.interactions)).toBeGreaterThan(0);
            expect(trend.period_tercile).toBeGreaterThanOrEqual(1);
            expect(trend.period_tercile).toBeLessThanOrEqual(3);
          }

          // Test activity consistency over time
          const totalExpectedInteractions = periodData.reduce((sum, p) => sum + p.interactions, 0);
          const actualInteractions = await db.query(`
            SELECT COUNT(*) as count FROM wallet_interactions 
            WHERE wallet_address = $1 AND contract_address = $2
          `, [behaviorData.wallet_address, contractAddress]);

          expect(parseInt(actualInteractions[0].count)).toBe(totalExpectedInteractions);
        }
      ),
      { numRuns: 15 }
    );
  });
});
