import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Failure Data Storage Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 40: Failure data storage
  test('should store transaction failures with complete error information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          block_number: fc.bigInt({ min: 1n, max: 999999n }),
          tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          failure_type: fc.constantFrom('VALIDATION_FAILURE', 'EXECUTION_ERROR', 'INSUFFICIENT_BALANCE', 'NONCE_ERROR'),
          failure_reason: fc.string({ minLength: 10, maxLength: 200 }),
          error_message: fc.string({ minLength: 5, maxLength: 500 }),
          fee_charged: fc.bigInt({ min: 0n, max: 1000000000000000000n })
        }),
        async (failureData) => {
          // Setup prerequisites
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            failureData.block_number.toString(),
            '0x' + '0'.repeat(64),
            Date.now().toString(),
            'ACCEPTED_ON_L2'
          ]);

          // Create failed transaction
          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, status, actual_fee)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tx_hash) DO UPDATE SET
              status = EXCLUDED.status,
              actual_fee = EXCLUDED.actual_fee
          `, [
            failureData.tx_hash,
            failureData.block_number.toString(),
            'INVOKE',
            'REJECTED',
            failureData.fee_charged.toString()
          ]);

          // Store failure information
          await db.query(`
            INSERT INTO transaction_failures (tx_hash, failure_type, failure_reason, error_message, fee_charged)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tx_hash) DO UPDATE SET
              failure_type = EXCLUDED.failure_type,
              failure_reason = EXCLUDED.failure_reason,
              error_message = EXCLUDED.error_message,
              fee_charged = EXCLUDED.fee_charged
          `, [
            failureData.tx_hash,
            failureData.failure_type,
            failureData.failure_reason,
            failureData.error_message,
            failureData.fee_charged.toString()
          ]);

          // Verify failure storage
          const failureResult = await db.query(`
            SELECT tf.*, t.status, t.actual_fee
            FROM transaction_failures tf
            JOIN transactions t ON tf.tx_hash = t.tx_hash
            WHERE tf.tx_hash = $1
          `, [failureData.tx_hash]);

          expect(failureResult).toHaveLength(1);
          const failure = failureResult[0];
          
          expect(failure.tx_hash).toBe(failureData.tx_hash);
          expect(failure.failure_type).toBe(failureData.failure_type);
          expect(failure.failure_reason).toBe(failureData.failure_reason);
          expect(failure.error_message).toBe(failureData.error_message);
          expect(BigInt(failure.fee_charged)).toBe(failureData.fee_charged);
          expect(failure.status).toBe('REJECTED');
          expect(BigInt(failure.actual_fee)).toBe(failureData.fee_charged);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should categorize and analyze failure patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          failures: fc.array(
            fc.record({
              tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              failure_type: fc.constantFrom('VALIDATION_FAILURE', 'EXECUTION_ERROR', 'INSUFFICIENT_BALANCE', 'NONCE_ERROR'),
              failure_reason: fc.string({ minLength: 10, maxLength: 100 }),
              fee_charged: fc.bigInt({ min: 0n, max: 1000000000000000n })
            }),
            { minLength: 5, maxLength: 20 }
          )
        }),
        async (failureData) => {
          // Ensure unique transaction hashes
          const uniqueFailures = failureData.failures.filter((failure, index, arr) => 
            arr.findIndex(f => f.tx_hash === failure.tx_hash) === index
          );

          if (uniqueFailures.length < 3) return;

          const blockNumber = Math.floor(Math.random() * 999999) + 1;

          // Setup block
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [blockNumber.toString(), '0x' + '0'.repeat(64), Date.now().toString(), 'ACCEPTED_ON_L2']);

          // Store all failures
          for (const failure of uniqueFailures) {
            // Create transaction
            await db.query(`
              INSERT INTO transactions (tx_hash, block_number, tx_type, status, actual_fee)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (tx_hash) DO NOTHING
            `, [
              failure.tx_hash,
              blockNumber.toString(),
              'INVOKE',
              'REJECTED',
              failure.fee_charged.toString()
            ]);

            // Store failure
            await db.query(`
              INSERT INTO transaction_failures (tx_hash, failure_type, failure_reason, fee_charged)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (tx_hash) DO NOTHING
            `, [
              failure.tx_hash,
              failure.failure_type,
              failure.failure_reason,
              failure.fee_charged.toString()
            ]);
          }

          // Test failure pattern analysis
          const failureStats = await db.query(`
            SELECT 
              failure_type,
              COUNT(*) as count,
              AVG(fee_charged::numeric) as avg_fee,
              SUM(fee_charged::numeric) as total_fee
            FROM transaction_failures 
            WHERE tx_hash = ANY($1)
            GROUP BY failure_type
            ORDER BY count DESC
          `, [uniqueFailures.map(f => f.tx_hash)]);

          expect(failureStats.length).toBeGreaterThan(0);

          // Verify statistics accuracy
          const failureTypes = [...new Set(uniqueFailures.map(f => f.failure_type))];
          expect(failureStats.length).toBeLessThanOrEqual(failureTypes.length);

          for (const stat of failureStats) {
            const typeFailures = uniqueFailures.filter(f => f.failure_type === stat.failure_type);
            expect(parseInt(stat.count)).toBe(typeFailures.length);
            
            const expectedTotalFee = typeFailures.reduce((sum, f) => sum + f.fee_charged, 0n);
            expect(BigInt(stat.total_fee)).toBe(expectedTotalFee);
          }

          // Test failure rate calculation
          const totalTransactions = await db.query(`
            SELECT COUNT(*) as count FROM transactions 
            WHERE block_number = $1
          `, [blockNumber.toString()]);

          const failedTransactions = await db.query(`
            SELECT COUNT(*) as count FROM transactions 
            WHERE block_number = $1 AND status = 'REJECTED'
          `, [blockNumber.toString()]);

          const failureRate = parseInt(failedTransactions[0].count) / parseInt(totalTransactions[0].count);
          expect(failureRate).toBeGreaterThan(0);
          expect(failureRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 20 }
    );
  });
});
