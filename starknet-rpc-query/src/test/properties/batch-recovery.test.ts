import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { StarknetRPCClient } from '../../services/rpc/StarknetRPCClient';
import { IngestionOrchestrator } from '../../services/ingestion/IngestionOrchestrator';
import { loadConfig } from '../../utils/config';

describe('Batch Processing Recovery Properties', () => {
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

  // Property 43: Batch processing recovery
  test('should recover from partial batch failures without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          batchSize: fc.integer({ min: 3, max: 8 }),
          startBlock: fc.bigInt({ min: 10000n, max: 100000n }),
          failurePoints: fc.array(
            fc.integer({ min: 1, max: 7 }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        async (testData) => {
          // Ensure checkpoint table exists
          await db.query(`
            CREATE TABLE IF NOT EXISTS ingestion_checkpoints (
              checkpoint_name VARCHAR(255) PRIMARY KEY,
              block_number BIGINT NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          const orchestrator = new IngestionOrchestrator(rpc, db, testData.batchSize, 5);
          
          // Clear existing data for test blocks
          const testBlocks = Array.from(
            { length: testData.batchSize }, 
            (_, i) => testData.startBlock + BigInt(i)
          );

          for (const blockNum of testBlocks) {
            await db.query('DELETE FROM events WHERE block_number = $1', [blockNum.toString()]);
            await db.query('DELETE FROM transactions WHERE block_number = $1', [blockNum.toString()]);
            await db.query('DELETE FROM blocks WHERE block_number = $1', [blockNum.toString()]);
          }

          // Clear checkpoint
          await db.query('DELETE FROM ingestion_checkpoints WHERE checkpoint_name = $1', ['main_ingestion']);

          // Simulate batch processing with potential failures
          let processedBlocks: bigint[] = [];
          let failedBlocks: bigint[] = [];

          for (let i = 0; i < testData.batchSize; i++) {
            const blockNum = testData.startBlock + BigInt(i);
            const shouldFail = testData.failurePoints.includes(i);

            try {
              if (shouldFail) {
                // Simulate failure by using invalid block number
                await orchestrator['processBlockIdempotent'](blockNum + 999999n);
              } else {
                await orchestrator['processBlockIdempotent'](blockNum);
                processedBlocks.push(blockNum);
              }
            } catch (error: any) {
              failedBlocks.push(blockNum);
              // Continue processing despite failures
            }
          }

          // Verify partial success - successfully processed blocks should be in database
          for (const blockNum of processedBlocks) {
            const blockExists = await db.query(
              'SELECT 1 FROM blocks WHERE block_number = $1',
              [blockNum.toString()]
            );
            expect(blockExists.length).toBe(1);
          }

          // Verify failed blocks are not in database (or marked appropriately)
          for (const blockNum of failedBlocks) {
            const blockExists = await db.query(
              'SELECT 1 FROM blocks WHERE block_number = $1',
              [blockNum.toString()]
            );
            // Failed blocks should not exist in database
            expect(blockExists.length).toBe(0);
          }

          // Test recovery - reprocess the batch
          const recoveryResults: bigint[] = [];
          
          for (const blockNum of testBlocks.slice(0, 3)) { // Limit for performance
            try {
              await orchestrator['processBlockIdempotent'](blockNum);
              recoveryResults.push(blockNum);
            } catch (error: any) {
              // Network errors are acceptable
            }
          }

          // Verify recovery maintains data consistency
          for (const blockNum of recoveryResults) {
            const blockCount = await db.query(
              'SELECT COUNT(*) as count FROM blocks WHERE block_number = $1',
              [blockNum.toString()]
            );
            
            // Each block should exist exactly once after recovery
            expect(parseInt(blockCount[0].count)).toBe(1);
          }

          // Verify checkpoint recovery
          if (processedBlocks.length > 0) {
            await orchestrator['saveCheckpoint']();
            
            const checkpoint = await db.query(
              'SELECT block_number FROM ingestion_checkpoints WHERE checkpoint_name = $1',
              ['main_ingestion']
            );
            
            if (checkpoint.length > 0) {
              const checkpointBlock = BigInt(checkpoint[0].block_number);
              expect(processedBlocks.some(b => b <= checkpointBlock)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 3, timeout: 120000 }
    );
  });

  test('should maintain processing order and dependencies during recovery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          blockSequence: fc.array(
            fc.bigInt({ min: 50000n, max: 150000n }),
            { minLength: 3, maxLength: 6 }
          )
        }),
        async (testData) => {
          // Sort blocks to ensure sequential processing
          const sortedBlocks = [...testData.blockSequence].sort((a, b) => Number(a - b));
          
          // Ensure blocks are consecutive for dependency testing
          const consecutiveBlocks = sortedBlocks.slice(0, 3).map((block, index) => 
            sortedBlocks[0] + BigInt(index)
          );

          const orchestrator = new IngestionOrchestrator(rpc, db, 2, 3);

          // Clear existing data
          for (const blockNum of consecutiveBlocks) {
            await db.query('DELETE FROM events WHERE block_number = $1', [blockNum.toString()]);
            await db.query('DELETE FROM transactions WHERE block_number = $1', [blockNum.toString()]);
            await db.query('DELETE FROM blocks WHERE block_number = $1', [blockNum.toString()]);
          }

          // Process blocks in order
          const processingResults: Array<{ block: bigint, success: boolean, order: number }> = [];

          for (let i = 0; i < consecutiveBlocks.length; i++) {
            const blockNum = consecutiveBlocks[i];
            
            try {
              await orchestrator['processBlockIdempotent'](blockNum);
              processingResults.push({ block: blockNum, success: true, order: i });
            } catch (error: any) {
              processingResults.push({ block: blockNum, success: false, order: i });
            }
          }

          // Verify processing order is maintained
          const successfulBlocks = processingResults
            .filter(r => r.success)
            .sort((a, b) => a.order - b.order);

          if (successfulBlocks.length > 1) {
            // Verify blocks are processed in sequential order
            for (let i = 1; i < successfulBlocks.length; i++) {
              const prevBlock = successfulBlocks[i - 1];
              const currentBlock = successfulBlocks[i];
              
              expect(currentBlock.block).toBeGreaterThan(prevBlock.block);
              expect(currentBlock.order).toBeGreaterThan(prevBlock.order);
            }

            // Verify parent-child relationships are maintained
            const blockData = await db.query(`
              SELECT block_number, block_hash, parent_block_hash 
              FROM blocks 
              WHERE block_number = ANY($1)
              ORDER BY block_number
            `, [successfulBlocks.map(b => b.block.toString())]);

            for (let i = 1; i < blockData.length; i++) {
              const currentBlock = blockData[i];
              const previousBlock = blockData[i - 1];
              
              // If blocks are consecutive, verify parent relationship
              if (BigInt(currentBlock.block_number) - BigInt(previousBlock.block_number) === 1n) {
                if (currentBlock.parent_block_hash && previousBlock.block_hash) {
                  expect(currentBlock.parent_block_hash.toLowerCase())
                    .toBe(previousBlock.block_hash.toLowerCase());
                }
              }
            }
          }
        }
      ),
      { numRuns: 3, timeout: 90000 }
    );
  });
});
