import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Event Storage and Indexing Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 33: Event storage and indexing
  test('should store and index events efficiently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          block_number: fc.bigInt({ min: 1n, max: 999999n }),
          tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          events: fc.array(
            fc.record({
              event_selector: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              event_data: fc.array(fc.hexaString({ minLength: 1, maxLength: 64 }), { maxLength: 5 }),
              event_keys: fc.array(fc.hexaString({ minLength: 1, maxLength: 64 }), { maxLength: 3 })
            }),
            { minLength: 1, maxLength: 10 }
          )
        }),
        async (eventData) => {
          // Setup prerequisites
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            eventData.block_number.toString(),
            '0x' + '0'.repeat(64),
            Date.now().toString(),
            'ACCEPTED_ON_L2'
          ]);

          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tx_hash) DO NOTHING
          `, [
            eventData.tx_hash,
            eventData.block_number.toString(),
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
          `, [eventData.contract_address, classHash, eventData.block_number.toString()]);

          // Store events
          const eventIds: number[] = [];
          for (const event of eventData.events) {
            const result = await db.query(`
              INSERT INTO events (tx_hash, contract_address, block_number)
              VALUES ($1, $2, $3)
              RETURNING event_id
            `, [
              eventData.tx_hash,
              eventData.contract_address,
              eventData.block_number.toString()
            ]);
            
            eventIds.push(result[0].event_id);
          }

          // Verify event storage
          const storedEvents = await db.query(`
            SELECT * FROM events 
            WHERE tx_hash = $1 AND contract_address = $2
            ORDER BY event_id
          `, [eventData.tx_hash, eventData.contract_address]);

          expect(storedEvents.length).toBe(eventData.events.length);

          for (let i = 0; i < storedEvents.length; i++) {
            const stored = storedEvents[i];
            expect(stored.tx_hash).toBe(eventData.tx_hash);
            expect(stored.contract_address).toBe(eventData.contract_address);
            expect(BigInt(stored.block_number)).toBe(eventData.block_number);
            expect(stored.created_at).toBeDefined();
          }

          // Test indexing performance - contract address index
          const contractEvents = await db.query(`
            SELECT COUNT(*) as count FROM events 
            WHERE contract_address = $1
          `, [eventData.contract_address]);

          expect(parseInt(contractEvents[0].count)).toBeGreaterThanOrEqual(eventData.events.length);

          // Test indexing performance - block number index
          const blockEvents = await db.query(`
            SELECT COUNT(*) as count FROM events 
            WHERE block_number = $1
          `, [eventData.block_number.toString()]);

          expect(parseInt(blockEvents[0].count)).toBeGreaterThanOrEqual(eventData.events.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should handle event filtering and search efficiently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contracts: fc.array(
            fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
            { minLength: 2, maxLength: 5 }
          ),
          blocks: fc.array(
            fc.bigInt({ min: 1n, max: 999999n }),
            { minLength: 2, maxLength: 5 }
          ),
          eventsPerContract: fc.integer({ min: 1, max: 5 })
        }),
        async (filterData) => {
          // Ensure unique contracts and blocks
          const uniqueContracts = [...new Set(filterData.contracts)];
          const uniqueBlocks = [...new Set(filterData.blocks.map(b => b.toString()))];

          if (uniqueContracts.length < 2 || uniqueBlocks.length < 2) return;

          // Setup blocks and transactions
          for (const blockNum of uniqueBlocks) {
            await db.query(`
              INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (block_number) DO NOTHING
            `, [blockNum, '0x' + blockNum.padStart(64, '0'), Date.now().toString(), 'ACCEPTED_ON_L2']);

            const txHash = '0x' + blockNum.padStart(64, '0');
            await db.query(`
              INSERT INTO transactions (tx_hash, block_number, tx_type, status)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (tx_hash) DO NOTHING
            `, [txHash, blockNum, 'INVOKE', 'ACCEPTED_ON_L2']);
          }

          // Setup contracts and events
          let totalEvents = 0;
          for (const contractAddr of uniqueContracts) {
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
            `, [contractAddr, classHash, uniqueBlocks[0]]);

            // Create events for this contract across different blocks
            for (let i = 0; i < filterData.eventsPerContract; i++) {
              const blockNum = uniqueBlocks[i % uniqueBlocks.length];
              const txHash = '0x' + blockNum.padStart(64, '0');

              await db.query(`
                INSERT INTO events (tx_hash, contract_address, block_number)
                VALUES ($1, $2, $3)
              `, [txHash, contractAddr, blockNum]);
              
              totalEvents++;
            }
          }

          // Test contract-based filtering
          const contractFilter = uniqueContracts[0];
          const contractEvents = await db.query(`
            SELECT COUNT(*) as count FROM events 
            WHERE contract_address = $1
          `, [contractFilter]);

          expect(parseInt(contractEvents[0].count)).toBe(filterData.eventsPerContract);

          // Test block range filtering
          const minBlock = Math.min(...uniqueBlocks.map(b => parseInt(b)));
          const maxBlock = Math.max(...uniqueBlocks.map(b => parseInt(b)));
          
          const rangeEvents = await db.query(`
            SELECT COUNT(*) as count FROM events 
            WHERE block_number BETWEEN $1 AND $2
          `, [minBlock.toString(), maxBlock.toString()]);

          expect(parseInt(rangeEvents[0].count)).toBeGreaterThanOrEqual(totalEvents);

          // Test combined filtering (contract + block range)
          const combinedEvents = await db.query(`
            SELECT COUNT(*) as count FROM events 
            WHERE contract_address = $1 AND block_number BETWEEN $2 AND $3
          `, [contractFilter, minBlock.toString(), maxBlock.toString()]);

          expect(parseInt(combinedEvents[0].count)).toBe(filterData.eventsPerContract);
        }
      ),
      { numRuns: 20 }
    );
  });
});
