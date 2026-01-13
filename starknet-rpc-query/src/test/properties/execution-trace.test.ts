import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Execution Trace Storage Hierarchy Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 32: Execution trace storage hierarchy
  test('should maintain execution call hierarchy integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          block_number: fc.bigInt({ min: 1n, max: 999999n }),
          tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          calls: fc.array(
            fc.record({
              contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              entry_point_selector: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              call_status: fc.constantFrom('SUCCEEDED', 'REVERTED', 'FAILED'),
              depth: fc.integer({ min: 0, max: 3 })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (traceData) => {
          // Setup block and transaction
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            traceData.block_number.toString(),
            '0x' + '0'.repeat(64),
            Date.now().toString(),
            'ACCEPTED_ON_L2'
          ]);

          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tx_hash) DO NOTHING
          `, [
            traceData.tx_hash,
            traceData.block_number.toString(),
            'INVOKE',
            'ACCEPTED_ON_L2'
          ]);

          // Store execution calls with hierarchy
          const callIds: number[] = [];
          
          for (let i = 0; i < traceData.calls.length; i++) {
            const call = traceData.calls[i];
            const parentCallId = call.depth > 0 && callIds.length > 0 ? 
              callIds[Math.floor(Math.random() * callIds.length)] : null;

            const result = await db.query(`
              INSERT INTO execution_calls (tx_hash, parent_call_id, contract_address, entry_point_selector, call_status)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING call_id
            `, [
              traceData.tx_hash,
              parentCallId,
              call.contract_address,
              call.entry_point_selector,
              call.call_status
            ]);

            callIds.push(result[0].call_id);
          }

          // Verify hierarchy integrity
          const storedCalls = await db.query(`
            SELECT call_id, parent_call_id, contract_address, call_status
            FROM execution_calls 
            WHERE tx_hash = $1
            ORDER BY call_id
          `, [traceData.tx_hash]);

          expect(storedCalls.length).toBe(traceData.calls.length);

          // Verify parent-child relationships
          for (const call of storedCalls) {
            if (call.parent_call_id) {
              const parentExists = storedCalls.some(c => c.call_id === call.parent_call_id);
              expect(parentExists).toBe(true);
            }
          }

          // Verify no circular references
          const visited = new Set<number>();
          const checkCircular = (callId: number, path: Set<number>): boolean => {
            if (path.has(callId)) return false; // Circular reference found
            if (visited.has(callId)) return true;
            
            visited.add(callId);
            path.add(callId);
            
            const call = storedCalls.find(c => c.call_id === callId);
            if (call?.parent_call_id) {
              const result = checkCircular(call.parent_call_id, path);
              path.delete(callId);
              return result;
            }
            
            path.delete(callId);
            return true;
          };

          for (const call of storedCalls) {
            expect(checkCircular(call.call_id, new Set())).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should handle execution call tree queries efficiently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          rootCalls: fc.integer({ min: 1, max: 3 }),
          maxDepth: fc.integer({ min: 1, max: 4 })
        }),
        async (treeData) => {
          // Setup prerequisites
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, ['999999', '0x' + '0'.repeat(64), Date.now().toString(), 'ACCEPTED_ON_L2']);

          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tx_hash) DO NOTHING
          `, [treeData.tx_hash, '999999', 'INVOKE', 'ACCEPTED_ON_L2']);

          // Create call tree
          const createCallTree = async (parentId: number | null, depth: number): Promise<number[]> => {
            if (depth >= treeData.maxDepth) return [];
            
            const callIds: number[] = [];
            const numCalls = depth === 0 ? treeData.rootCalls : Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < numCalls; i++) {
              const result = await db.query(`
                INSERT INTO execution_calls (tx_hash, parent_call_id, contract_address, entry_point_selector, call_status)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING call_id
              `, [
                treeData.tx_hash,
                parentId,
                '0x' + Math.random().toString(16).substring(2).padStart(64, '0'),
                '0x' + Math.random().toString(16).substring(2).padStart(64, '0'),
                'SUCCEEDED'
              ]);
              
              const callId = result[0].call_id;
              callIds.push(callId);
              
              // Recursively create children
              const childIds = await createCallTree(callId, depth + 1);
              callIds.push(...childIds);
            }
            
            return callIds;
          };

          const allCallIds = await createCallTree(null, 0);

          // Test tree traversal query
          const treeQuery = `
            WITH RECURSIVE call_tree AS (
              SELECT call_id, parent_call_id, contract_address, 0 as depth
              FROM execution_calls 
              WHERE tx_hash = $1 AND parent_call_id IS NULL
              
              UNION ALL
              
              SELECT ec.call_id, ec.parent_call_id, ec.contract_address, ct.depth + 1
              FROM execution_calls ec
              JOIN call_tree ct ON ec.parent_call_id = ct.call_id
            )
            SELECT * FROM call_tree ORDER BY depth, call_id
          `;

          const treeResult = await db.query(treeQuery, [treeData.tx_hash]);
          
          // Verify tree structure
          expect(treeResult.length).toBe(allCallIds.length);
          
          // Verify depth ordering
          let lastDepth = -1;
          for (const node of treeResult) {
            expect(node.depth).toBeGreaterThanOrEqual(lastDepth);
            lastDepth = node.depth;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
