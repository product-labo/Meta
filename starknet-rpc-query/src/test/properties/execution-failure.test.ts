import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Execution Failure Recording Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 41: Execution failure recording
  test('should record execution call failures with detailed context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          block_number: fc.bigInt({ min: 1n, max: 999999n }),
          tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          execution_calls: fc.array(
            fc.record({
              entry_point_selector: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              call_status: fc.constantFrom('SUCCEEDED', 'REVERTED', 'FAILED'),
              failure_reason: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
              error_message: fc.option(fc.string({ minLength: 5, maxLength: 300 })),
              fee_charged: fc.bigInt({ min: 0n, max: 1000000000000000n })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (executionData) => {
          // Setup prerequisites
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            executionData.block_number.toString(),
            '0x' + '0'.repeat(64),
            Date.now().toString(),
            'ACCEPTED_ON_L2'
          ]);

          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tx_hash) DO NOTHING
          `, [
            executionData.tx_hash,
            executionData.block_number.toString(),
            'INVOKE',
            'ACCEPTED_ON_L2'
          ]);

          // Setup contract
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
          `, [executionData.contract_address, classHash, executionData.block_number.toString()]);

          // Store execution calls and failures
          const callIds: number[] = [];
          const failedCallIds: number[] = [];

          for (const call of executionData.execution_calls) {
            // Store execution call
            const callResult = await db.query(`
              INSERT INTO execution_calls (tx_hash, contract_address, entry_point_selector, call_status)
              VALUES ($1, $2, $3, $4)
              RETURNING call_id
            `, [
              executionData.tx_hash,
              executionData.contract_address,
              call.entry_point_selector,
              call.call_status
            ]);

            const callId = callResult[0].call_id;
            callIds.push(callId);

            // Store failure information if call failed
            if (call.call_status !== 'SUCCEEDED' && (call.failure_reason || call.error_message)) {
              await db.query(`
                INSERT INTO execution_failures (call_id, failure_reason, error_message, fee_charged)
                VALUES ($1, $2, $3, $4)
              `, [
                callId,
                call.failure_reason || 'Unknown failure',
                call.error_message || 'No error message',
                call.fee_charged.toString()
              ]);

              failedCallIds.push(callId);
            }
          }

          // Verify execution failure recording
          const failureResults = await db.query(`
            SELECT ef.*, ec.call_status, ec.contract_address, ec.entry_point_selector
            FROM execution_failures ef
            JOIN execution_calls ec ON ef.call_id = ec.call_id
            WHERE ec.tx_hash = $1
          `, [executionData.tx_hash]);

          expect(failureResults.length).toBe(failedCallIds.length);

          for (const failure of failureResults) {
            expect(failedCallIds).toContain(failure.call_id);
            expect(failure.call_status).not.toBe('SUCCEEDED');
            expect(failure.contract_address).toBe(executionData.contract_address);
            expect(failure.failure_reason).toBeDefined();
            expect(failure.error_message).toBeDefined();
            expect(BigInt(failure.fee_charged)).toBeGreaterThanOrEqual(0n);
          }

          // Verify successful calls have no failure records
          const successfulCalls = await db.query(`
            SELECT ec.call_id
            FROM execution_calls ec
            LEFT JOIN execution_failures ef ON ec.call_id = ef.call_id
            WHERE ec.tx_hash = $1 AND ec.call_status = 'SUCCEEDED'
          `, [executionData.tx_hash]);

          for (const successCall of successfulCalls) {
            const hasFailure = await db.query(`
              SELECT 1 FROM execution_failures WHERE call_id = $1
            `, [successCall.call_id]);
            
            expect(hasFailure.length).toBe(0);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should maintain execution failure hierarchy and context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          call_tree: fc.array(
            fc.record({
              contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              call_status: fc.constantFrom('SUCCEEDED', 'REVERTED', 'FAILED'),
              has_children: fc.boolean(),
              failure_reason: fc.option(fc.string({ minLength: 5, maxLength: 100 }))
            }),
            { minLength: 2, maxLength: 6 }
          )
        }),
        async (treeData) => {
          const blockNumber = Math.floor(Math.random() * 999999) + 1;

          // Setup prerequisites
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [blockNumber.toString(), '0x' + '0'.repeat(64), Date.now().toString(), 'ACCEPTED_ON_L2']);

          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tx_hash) DO NOTHING
          `, [treeData.tx_hash, blockNumber.toString(), 'INVOKE', 'ACCEPTED_ON_L2']);

          // Create call hierarchy with failures
          const callIds: number[] = [];
          const parentCallIds: number[] = [];

          for (let i = 0; i < treeData.call_tree.length; i++) {
            const call = treeData.call_tree[i];
            const parentCallId = call.has_children && parentCallIds.length > 0 ? 
              parentCallIds[Math.floor(Math.random() * parentCallIds.length)] : null;

            // Setup contract
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
            `, [call.contract_address, classHash, blockNumber.toString()]);

            // Create execution call
            const callResult = await db.query(`
              INSERT INTO execution_calls (tx_hash, parent_call_id, contract_address, entry_point_selector, call_status)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING call_id
            `, [
              treeData.tx_hash,
              parentCallId,
              call.contract_address,
              '0x' + Math.random().toString(16).substring(2).padStart(64, '0'),
              call.call_status
            ]);

            const callId = callResult[0].call_id;
            callIds.push(callId);
            
            if (!call.has_children) {
              parentCallIds.push(callId);
            }

            // Record failure if applicable
            if (call.call_status !== 'SUCCEEDED') {
              await db.query(`
                INSERT INTO execution_failures (call_id, failure_reason, error_message)
                VALUES ($1, $2, $3)
              `, [
                callId,
                call.failure_reason || `${call.call_status} failure`,
                `Call failed with status: ${call.call_status}`
              ]);
            }
          }

          // Test failure context queries
          const failureContext = await db.query(`
            SELECT 
              ef.call_id,
              ef.failure_reason,
              ec.call_status,
              ec.parent_call_id,
              ec.contract_address,
              parent_ec.call_status as parent_status
            FROM execution_failures ef
            JOIN execution_calls ec ON ef.call_id = ec.call_id
            LEFT JOIN execution_calls parent_ec ON ec.parent_call_id = parent_ec.call_id
            WHERE ec.tx_hash = $1
            ORDER BY ef.call_id
          `, [treeData.tx_hash]);

          const failedCalls = treeData.call_tree.filter(c => c.call_status !== 'SUCCEEDED');
          expect(failureContext.length).toBe(failedCalls.length);

          // Verify failure propagation doesn't affect parent-child relationships
          for (const failure of failureContext) {
            expect(failure.call_status).not.toBe('SUCCEEDED');
            expect(failure.failure_reason).toBeDefined();
            
            // If has parent, verify parent relationship is maintained
            if (failure.parent_call_id) {
              const parentExists = callIds.includes(failure.parent_call_id);
              expect(parentExists).toBe(true);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
