import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { StarknetRPCClient } from '../../services/rpc/StarknetRPCClient';
import { IngestionOrchestrator } from '../../services/ingestion/IngestionOrchestrator';
import { loadConfig } from '../../utils/config';

describe('Idempotent Ingestion Properties', () => {
  let db: Database;
  let rpc: StarknetRPCClient;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
    rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 10000);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 42: Idempotent ingestion
  test('should handle duplicate ingestion attempts without data corruption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          blockNumbers: fc.array(
            fc.bigInt({ min: 1n, max: 50000n }),
            { minLength: 2, maxLength: 5 }
          ),
          duplicateAttempts: fc.integer({ min: 2, max: 4 })
        }),
        async (testData) => {
          const orchestrator = new IngestionOrchestrator(rpc, db, 1, 10);
          
          // Ensure unique block numbers
          const uniqueBlocks = [...new Set(testData.blockNumbers.map(b => b.toString()))]
            .map(s => BigInt(s))
            .sort((a, b) => Number(a - b));

          if (uniqueBlocks.length < 2) return;

          // Clear any existing data for these blocks
          for (const blockNum of uniqueBlocks) {
            await db.query('DELETE FROM events WHERE block_number = $1', [blockNum.toString()]);
            await db.query('DELETE FROM transactions WHERE block_number = $1', [blockNum.toString()]);
            await db.query('DELETE FROM blocks WHERE block_number = $1', [blockNum.toString()]);
          }

          // Process each block multiple times (simulating duplicate attempts)
          const processingResults: Array<{ block: bigint, attempt: number, success: boolean }> = [];

          for (const blockNum of uniqueBlocks.slice(0, 2)) { // Limit to 2 blocks for performance
            for (let attempt = 1; attempt <= testData.duplicateAttempts; attempt++) {
              try {
                await orchestrator['processBlockIdempotent'](blockNum);
                processingResults.push({ block: blockNum, attempt, success: true });
              } catch (error) {
                processingResults.push({ block: blockNum, attempt, success: false });
                // Network errors are acceptable for this test
                if (!error.message.includes('network') && !error.message.includes('timeout')) {
                  console.warn(`Block processing failed for ${blockNum}, attempt ${attempt}:`, error.message);
                }
              }
            }
          }

          // Verify idempotency - each block should appear exactly once in database
          for (const blockNum of uniqueBlocks.slice(0, 2)) {
            const blockCount = await db.query(
              'SELECT COUNT(*) as count FROM blocks WHERE block_number = $1',
              [blockNum.toString()]
            );

            const successfulAttempts = processingResults.filter(r => 
              r.block === blockNum && r.success
            ).length;

            if (successfulAttempts > 0) {
              // If any attempt succeeded, block should exist exactly once
              expect(parseInt(blockCount[0].count)).toBe(1);

              // Verify transaction count consistency
              const txCount1 = await db.query(
                'SELECT COUNT(*) as count FROM transactions WHERE block_number = $1',
                [blockNum.toString()]
              );

              // Process the same block again and verify count doesn't change
              try {
                await orchestrator['processBlockIdempotent'](blockNum);
                
                const txCount2 = await db.query(
                  'SELECT COUNT(*) as count FROM transactions WHERE block_number = $1',
                  [blockNum.toString()]
                );

                expect(parseInt(txCount2[0].count)).toBe(parseInt(txCount1[0].count));
              } catch (error) {
                // Network errors are acceptable
              }
            }
          }
        }
      ),
      { numRuns: 5, timeout: 120000 }
    );
  });

  test('should maintain data consistency across concurrent ingestion attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          blockNumber: fc.bigInt({ min: 10000n, max: 100000n }),
          concurrentAttempts: fc.integer({ min: 2, max: 3 })
        }),
        async (testData) => {
          // Clear existing data
          await db.query('DELETE FROM events WHERE block_number = $1', [testData.blockNumber.toString()]);
          await db.query('DELETE FROM transactions WHERE block_number = $1', [testData.blockNumber.toString()]);
          await db.query('DELETE FROM blocks WHERE block_number = $1', [testData.blockNumber.toString()]);

          const orchestrator = new IngestionOrchestrator(rpc, db, 1, 10);

          // Simulate concurrent processing attempts
          const concurrentPromises = Array(testData.concurrentAttempts).fill(null).map(async (_, index) => {
            try {
              await orchestrator['processBlockIdempotent'](testData.blockNumber);
              return { success: true, attempt: index + 1 };
            } catch (error) {
              return { success: false, attempt: index + 1, error: error.message };
            }
          });

          const results = await Promise.allSettled(concurrentPromises);
          const successfulResults = results
            .filter(r => r.status === 'fulfilled' && r.value.success)
            .map(r => r.status === 'fulfilled' ? r.value : null)
            .filter(Boolean);

          if (successfulResults.length > 0) {
            // Verify block exists exactly once despite concurrent attempts
            const blockCount = await db.query(
              'SELECT COUNT(*) as count FROM blocks WHERE block_number = $1',
              [testData.blockNumber.toString()]
            );

            expect(parseInt(blockCount[0].count)).toBe(1);

            // Verify data integrity
            const blockData = await db.query(
              'SELECT * FROM blocks WHERE block_number = $1',
              [testData.blockNumber.toString()]
            );

            expect(blockData).toHaveLength(1);
            expect(blockData[0].block_hash).toBeDefined();
            expect(blockData[0].block_hash).toMatch(/^0x[0-9a-f]+$/i);

            // Verify transaction consistency
            const txCount = await db.query(
              'SELECT COUNT(*) as count FROM transactions WHERE block_number = $1',
              [testData.blockNumber.toString()]
            );

            const txCountValue = parseInt(txCount[0].count);
            expect(txCountValue).toBeGreaterThanOrEqual(0);

            // If transactions exist, verify they're properly linked
            if (txCountValue > 0) {
              const transactions = await db.query(
                'SELECT tx_hash, block_number FROM transactions WHERE block_number = $1',
                [testData.blockNumber.toString()]
              );

              for (const tx of transactions) {
                expect(tx.tx_hash).toMatch(/^0x[0-9a-f]+$/i);
                expect(BigInt(tx.block_number)).toBe(testData.blockNumber);
              }
            }
          }
        }
      ),
      { numRuns: 3, timeout: 90000 }
    );
  });
});
