import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Transaction Storage Completeness Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 30: Transaction storage completeness
  test('should store and retrieve transactions with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          block_number: fc.bigInt({ min: 1n, max: 999999n }),
          tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          tx_type: fc.constantFrom('INVOKE', 'DECLARE', 'DEPLOY', 'DEPLOY_ACCOUNT'),
          sender_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          status: fc.constantFrom('PENDING', 'ACCEPTED_ON_L2', 'ACCEPTED_ON_L1', 'REJECTED'),
          actual_fee: fc.bigInt({ min: 0n, max: 1000000000000000000n })
        }),
        async (txData) => {
          // First ensure block exists
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            txData.block_number.toString(),
            '0x' + '0'.repeat(64),
            Date.now().toString(),
            'ACCEPTED_ON_L2'
          ]);

          // Store transaction
          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status, actual_fee)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (tx_hash) DO UPDATE SET
              block_number = EXCLUDED.block_number,
              tx_type = EXCLUDED.tx_type,
              sender_address = EXCLUDED.sender_address,
              status = EXCLUDED.status,
              actual_fee = EXCLUDED.actual_fee
          `, [
            txData.tx_hash,
            txData.block_number.toString(),
            txData.tx_type,
            txData.sender_address,
            txData.status,
            txData.actual_fee.toString()
          ]);

          // Retrieve transaction
          const retrieved = await db.query(`
            SELECT * FROM transactions WHERE tx_hash = $1
          `, [txData.tx_hash]);

          // Verify completeness
          expect(retrieved).toHaveLength(1);
          const tx = retrieved[0];
          
          expect(tx.tx_hash).toBe(txData.tx_hash);
          expect(BigInt(tx.block_number)).toBe(txData.block_number);
          expect(tx.tx_type).toBe(txData.tx_type);
          expect(tx.sender_address).toBe(txData.sender_address);
          expect(tx.status).toBe(txData.status);
          expect(BigInt(tx.actual_fee || 0)).toBe(txData.actual_fee);
          expect(tx.created_at).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should maintain transaction-block relationship integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          block_number: fc.bigInt({ min: 1n, max: 999999n }),
          transactions: fc.array(
            fc.record({
              tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              tx_type: fc.constantFrom('INVOKE', 'DECLARE', 'DEPLOY'),
              status: fc.constantFrom('ACCEPTED_ON_L2', 'ACCEPTED_ON_L1')
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (blockData) => {
          // Ensure unique transaction hashes
          const uniqueTxs = blockData.transactions.filter((tx, index, arr) => 
            arr.findIndex(t => t.tx_hash === tx.tx_hash) === index
          );

          // Create block
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            blockData.block_number.toString(),
            '0x' + blockData.block_number.toString(16).padStart(64, '0'),
            Date.now().toString(),
            'ACCEPTED_ON_L2'
          ]);

          // Store transactions
          for (const tx of uniqueTxs) {
            await db.query(`
              INSERT INTO transactions (tx_hash, block_number, tx_type, status)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (tx_hash) DO NOTHING
            `, [
              tx.tx_hash,
              blockData.block_number.toString(),
              tx.tx_type,
              tx.status
            ]);
          }

          // Verify all transactions belong to correct block
          const storedTxs = await db.query(`
            SELECT tx_hash, block_number FROM transactions 
            WHERE block_number = $1
          `, [blockData.block_number.toString()]);

          expect(storedTxs.length).toBeGreaterThanOrEqual(uniqueTxs.length);
          
          for (const storedTx of storedTxs) {
            expect(BigInt(storedTx.block_number)).toBe(blockData.block_number);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
