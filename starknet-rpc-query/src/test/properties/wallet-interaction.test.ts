import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Wallet Interaction Granularity Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 34: Wallet interaction granularity
  test('should track wallet interactions at function-level granularity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          wallet_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          interactions: fc.array(
            fc.record({
              tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              block_number: fc.bigInt({ min: 1n, max: 999999n }),
              function_name: fc.constantFrom('transfer', 'approve', 'mint', 'burn', 'swap'),
              function_selector: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              state_mutability: fc.constantFrom('view', 'external', 'internal')
            }),
            { minLength: 1, maxLength: 10 }
          )
        }),
        async (walletData) => {
          // Ensure unique transactions
          const uniqueInteractions = walletData.interactions.filter((interaction, index, arr) => 
            arr.findIndex(i => i.tx_hash === interaction.tx_hash) === index
          );

          // Setup contract and functions
          const classHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
          
          await db.query(`
            INSERT INTO contract_classes (class_hash, abi_json)
            VALUES ($1, $2)
            ON CONFLICT (class_hash) DO NOTHING
          `, [classHash, JSON.stringify({ functions: walletData.interactions.map(i => ({ name: i.function_name })) })]);

          await db.query(`
            INSERT INTO contracts (contract_address, class_hash, deployment_block)
            VALUES ($1, $2, $3)
            ON CONFLICT (contract_address) DO NOTHING
          `, [walletData.contract_address, classHash, '1']);

          // Store functions
          const functionIds: { [key: string]: number } = {};
          for (const interaction of uniqueInteractions) {
            if (!functionIds[interaction.function_name]) {
              const funcResult = await db.query(`
                INSERT INTO functions (class_hash, contract_address, function_name, state_mutability)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (class_hash, contract_address, function_name) DO UPDATE SET
                  state_mutability = EXCLUDED.state_mutability
                RETURNING function_id
              `, [classHash, walletData.contract_address, interaction.function_name, interaction.state_mutability]);
              
              functionIds[interaction.function_name] = funcResult[0].function_id;
            }
          }

          // Store interactions
          for (const interaction of uniqueInteractions) {
            // Setup block and transaction
            await db.query(`
              INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (block_number) DO NOTHING
            `, [
              interaction.block_number.toString(),
              '0x' + interaction.block_number.toString(16).padStart(64, '0'),
              Date.now().toString(),
              'ACCEPTED_ON_L2'
            ]);

            await db.query(`
              INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (tx_hash) DO NOTHING
            `, [
              interaction.tx_hash,
              interaction.block_number.toString(),
              'INVOKE',
              walletData.wallet_address,
              'ACCEPTED_ON_L2'
            ]);

            // Store wallet interaction
            await db.query(`
              INSERT INTO wallet_interactions (wallet_address, contract_address, function_id, tx_hash, block_number)
              VALUES ($1, $2, $3, $4, $5)
            `, [
              walletData.wallet_address,
              walletData.contract_address,
              functionIds[interaction.function_name],
              interaction.tx_hash,
              interaction.block_number.toString()
            ]);
          }

          // Verify granular tracking
          const interactions = await db.query(`
            SELECT 
              wi.wallet_address,
              wi.contract_address,
              f.function_name,
              f.state_mutability,
              wi.tx_hash,
              wi.block_number,
              t.sender_address
            FROM wallet_interactions wi
            JOIN functions f ON wi.function_id = f.function_id
            JOIN transactions t ON wi.tx_hash = t.tx_hash
            WHERE wi.wallet_address = $1 AND wi.contract_address = $2
            ORDER BY wi.block_number
          `, [walletData.wallet_address, walletData.contract_address]);

          expect(interactions.length).toBe(uniqueInteractions.length);

          // Verify function-level granularity
          for (let i = 0; i < interactions.length; i++) {
            const stored = interactions[i];
            const original = uniqueInteractions.find(ui => ui.tx_hash === stored.tx_hash);
            
            expect(stored.wallet_address).toBe(walletData.wallet_address);
            expect(stored.contract_address).toBe(walletData.contract_address);
            expect(stored.function_name).toBe(original?.function_name);
            expect(stored.state_mutability).toBe(original?.state_mutability);
            expect(stored.sender_address).toBe(walletData.wallet_address);
          }

          // Test function-specific analytics
          const functionStats = await db.query(`
            SELECT 
              f.function_name,
              f.state_mutability,
              COUNT(*) as interaction_count,
              COUNT(DISTINCT wi.block_number) as unique_blocks
            FROM wallet_interactions wi
            JOIN functions f ON wi.function_id = f.function_id
            WHERE wi.wallet_address = $1 AND wi.contract_address = $2
            GROUP BY f.function_name, f.state_mutability
            ORDER BY interaction_count DESC
          `, [walletData.wallet_address, walletData.contract_address]);

          const functionNames = [...new Set(uniqueInteractions.map(i => i.function_name))];
          expect(functionStats.length).toBe(functionNames.length);

          for (const stat of functionStats) {
            const expectedCount = uniqueInteractions.filter(i => i.function_name === stat.function_name).length;
            expect(parseInt(stat.interaction_count)).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('should distinguish between different interaction types and patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          wallet_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          contracts: fc.array(
            fc.record({
              contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              contract_type: fc.constantFrom('ERC20', 'ERC721', 'DEX', 'LENDING'),
              functions: fc.array(
                fc.constantFrom('transfer', 'approve', 'mint', 'burn', 'swap', 'deposit', 'withdraw'),
                { minLength: 1, maxLength: 4 }
              )
            }),
            { minLength: 2, maxLength: 4 }
          ),
          time_range: fc.record({
            start_block: fc.bigInt({ min: 1n, max: 100000n }),
            end_block: fc.bigInt({ min: 100001n, max: 999999n })
          })
        }),
        async (patternData) => {
          // Ensure unique contracts
          const uniqueContracts = patternData.contracts.filter((contract, index, arr) => 
            arr.findIndex(c => c.contract_address === contract.contract_address) === index
          );

          if (uniqueContracts.length < 2) return;

          // Setup contracts and interactions
          let totalInteractions = 0;
          for (const contract of uniqueContracts) {
            const classHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
            
            await db.query(`
              INSERT INTO contract_classes (class_hash, abi_json)
              VALUES ($1, $2)
              ON CONFLICT (class_hash) DO NOTHING
            `, [classHash, JSON.stringify({ type: contract.contract_type })]);

            await db.query(`
              INSERT INTO contracts (contract_address, class_hash, deployment_block)
              VALUES ($1, $2, $3)
              ON CONFLICT (contract_address) DO NOTHING
            `, [contract.contract_address, classHash, '1']);

            // Create interactions for each function
            for (const functionName of contract.functions) {
              const funcResult = await db.query(`
                INSERT INTO functions (class_hash, contract_address, function_name, state_mutability)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (class_hash, contract_address, function_name) DO UPDATE SET
                  state_mutability = EXCLUDED.state_mutability
                RETURNING function_id
              `, [classHash, contract.contract_address, functionName, 'external']);

              const functionId = funcResult[0].function_id;

              // Create multiple interactions across time range
              const numInteractions = Math.floor(Math.random() * 3) + 1;
              for (let i = 0; i < numInteractions; i++) {
                const blockNum = patternData.time_range.start_block + 
                  BigInt(Math.floor(Math.random() * Number(patternData.time_range.end_block - patternData.time_range.start_block)));
                const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');

                await db.query(`
                  INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
                  VALUES ($1, $2, $3, $4)
                  ON CONFLICT (block_number) DO NOTHING
                `, [blockNum.toString(), '0x' + blockNum.toString(16).padStart(64, '0'), Date.now().toString(), 'ACCEPTED_ON_L2']);

                await db.query(`
                  INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status)
                  VALUES ($1, $2, $3, $4, $5)
                  ON CONFLICT (tx_hash) DO NOTHING
                `, [txHash, blockNum.toString(), 'INVOKE', patternData.wallet_address, 'ACCEPTED_ON_L2']);

                await db.query(`
                  INSERT INTO wallet_interactions (wallet_address, contract_address, function_id, tx_hash, block_number)
                  VALUES ($1, $2, $3, $4, $5)
                `, [patternData.wallet_address, contract.contract_address, functionId, txHash, blockNum.toString()]);

                totalInteractions++;
              }
            }
          }

          // Test interaction pattern analysis
          const patternAnalysis = await db.query(`
            SELECT 
              wi.contract_address,
              f.function_name,
              COUNT(*) as frequency,
              MIN(wi.block_number) as first_interaction,
              MAX(wi.block_number) as last_interaction,
              COUNT(DISTINCT DATE_TRUNC('day', b.timestamp)) as active_days
            FROM wallet_interactions wi
            JOIN functions f ON wi.function_id = f.function_id
            JOIN blocks b ON wi.block_number = b.block_number
            WHERE wi.wallet_address = $1
              AND wi.block_number BETWEEN $2 AND $3
            GROUP BY wi.contract_address, f.function_name
            ORDER BY frequency DESC
          `, [
            patternData.wallet_address,
            patternData.time_range.start_block.toString(),
            patternData.time_range.end_block.toString()
          ]);

          expect(patternAnalysis.length).toBeGreaterThan(0);

          // Verify pattern diversity
          const contractCount = new Set(patternAnalysis.map(p => p.contract_address)).size;
          const functionCount = new Set(patternAnalysis.map(p => p.function_name)).size;
          
          expect(contractCount).toBe(uniqueContracts.length);
          expect(functionCount).toBeGreaterThan(0);

          // Test temporal analysis
          for (const pattern of patternAnalysis) {
            expect(BigInt(pattern.first_interaction)).toBeGreaterThanOrEqual(patternData.time_range.start_block);
            expect(BigInt(pattern.last_interaction)).toBeLessThanOrEqual(patternData.time_range.end_block);
            expect(parseInt(pattern.frequency)).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 15 }
    );
  });
});
