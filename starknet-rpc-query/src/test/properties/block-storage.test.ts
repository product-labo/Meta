import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Block Storage Completeness Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 29: Block storage completeness
  test('should store and retrieve blocks with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          block_number: fc.bigInt({ min: 1n, max: 999999n }),
          block_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          parent_block_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          timestamp: fc.bigInt({ min: 1600000000n, max: 2000000000n }),
          finality_status: fc.constantFrom('PENDING', 'ACCEPTED_ON_L2', 'ACCEPTED_ON_L1')
        }),
        async (blockData) => {
          // Store block
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (block_number) DO UPDATE SET
              block_hash = EXCLUDED.block_hash,
              parent_block_hash = EXCLUDED.parent_block_hash,
              timestamp = EXCLUDED.timestamp,
              finality_status = EXCLUDED.finality_status
          `, [
            blockData.block_number.toString(),
            blockData.block_hash,
            blockData.parent_block_hash,
            blockData.timestamp.toString(),
            blockData.finality_status
          ]);

          // Retrieve block
          const retrieved = await db.query(`
            SELECT * FROM blocks WHERE block_number = $1
          `, [blockData.block_number.toString()]);

          // Verify completeness
          expect(retrieved).toHaveLength(1);
          const block = retrieved[0];
          
          expect(BigInt(block.block_number)).toBe(blockData.block_number);
          expect(block.block_hash).toBe(blockData.block_hash);
          expect(block.parent_block_hash).toBe(blockData.parent_block_hash);
          expect(BigInt(block.timestamp)).toBe(blockData.timestamp);
          expect(block.finality_status).toBe(blockData.finality_status);
          expect(block.created_at).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should maintain block hash uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            block_number: fc.bigInt({ min: 1n, max: 999999n }),
            block_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
            timestamp: fc.bigInt({ min: 1600000000n, max: 2000000000n })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (blocks) => {
          // Ensure unique block numbers and hashes
          const uniqueBlocks = blocks.filter((block, index, arr) => 
            arr.findIndex(b => b.block_number === block.block_number || b.block_hash === block.block_hash) === index
          );

          if (uniqueBlocks.length < 2) return;

          // Store all blocks
          for (const block of uniqueBlocks) {
            await db.query(`
              INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (block_number) DO NOTHING
            `, [
              block.block_number.toString(),
              block.block_hash,
              block.timestamp.toString(),
              'ACCEPTED_ON_L2'
            ]);
          }

          // Verify all blocks stored
          const stored = await db.query(`
            SELECT block_number, block_hash FROM blocks 
            WHERE block_number = ANY($1)
          `, [uniqueBlocks.map(b => b.block_number.toString())]);

          expect(stored.length).toBe(uniqueBlocks.length);
          
          // Verify hash uniqueness
          const hashes = stored.map(b => b.block_hash);
          const uniqueHashes = [...new Set(hashes)];
          expect(uniqueHashes.length).toBe(hashes.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});
