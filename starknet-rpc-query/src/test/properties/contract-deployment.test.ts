import * as fc from 'fast-check';
import { Database } from '../../database/Database';
import { loadConfig } from '../../utils/config';

describe('Contract Deployment Storage Properties', () => {
  let db: Database;

  beforeAll(async () => {
    const config = loadConfig();
    db = new Database(config.database);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  // Property 31: Contract deployment storage
  test('should store contract deployments with class relationships', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          class_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          deployer_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          deployment_block: fc.bigInt({ min: 1n, max: 999999n }),
          deployment_tx_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          is_proxy: fc.boolean(),
          abi_json: fc.record({
            type: fc.constantFrom('function', 'event', 'struct'),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            inputs: fc.array(fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.constantFrom('felt', 'Uint256', 'bool')
            }), { maxLength: 3 })
          })
        }),
        async (deploymentData) => {
          // Setup prerequisites
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            deploymentData.deployment_block.toString(),
            '0x' + '0'.repeat(64),
            Date.now().toString(),
            'ACCEPTED_ON_L2'
          ]);

          await db.query(`
            INSERT INTO transactions (tx_hash, block_number, tx_type, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tx_hash) DO NOTHING
          `, [
            deploymentData.deployment_tx_hash,
            deploymentData.deployment_block.toString(),
            'DEPLOY',
            'ACCEPTED_ON_L2'
          ]);

          // Store contract class
          await db.query(`
            INSERT INTO contract_classes (class_hash, abi_json, declared_tx_hash, declared_block)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (class_hash) DO NOTHING
          `, [
            deploymentData.class_hash,
            JSON.stringify(deploymentData.abi_json),
            deploymentData.deployment_tx_hash,
            deploymentData.deployment_block.toString()
          ]);

          // Store contract deployment
          await db.query(`
            INSERT INTO contracts (contract_address, class_hash, deployer_address, deployment_tx_hash, deployment_block, is_proxy)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (contract_address) DO UPDATE SET
              class_hash = EXCLUDED.class_hash,
              deployer_address = EXCLUDED.deployer_address,
              deployment_tx_hash = EXCLUDED.deployment_tx_hash,
              deployment_block = EXCLUDED.deployment_block,
              is_proxy = EXCLUDED.is_proxy
          `, [
            deploymentData.contract_address,
            deploymentData.class_hash,
            deploymentData.deployer_address,
            deploymentData.deployment_tx_hash,
            deploymentData.deployment_block.toString(),
            deploymentData.is_proxy
          ]);

          // Verify deployment storage
          const deploymentResult = await db.query(`
            SELECT c.*, cc.abi_json 
            FROM contracts c
            JOIN contract_classes cc ON c.class_hash = cc.class_hash
            WHERE c.contract_address = $1
          `, [deploymentData.contract_address]);

          expect(deploymentResult).toHaveLength(1);
          const deployment = deploymentResult[0];
          
          expect(deployment.contract_address).toBe(deploymentData.contract_address);
          expect(deployment.class_hash).toBe(deploymentData.class_hash);
          expect(deployment.deployer_address).toBe(deploymentData.deployer_address);
          expect(deployment.deployment_tx_hash).toBe(deploymentData.deployment_tx_hash);
          expect(BigInt(deployment.deployment_block)).toBe(deploymentData.deployment_block);
          expect(deployment.is_proxy).toBe(deploymentData.is_proxy);
          expect(JSON.parse(deployment.abi_json)).toEqual(deploymentData.abi_json);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should maintain contract-class relationship integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          class_hash: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
          contracts: fc.array(
            fc.record({
              contract_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              deployer_address: fc.hexaString({ minLength: 66, maxLength: 66 }).map(s => s.startsWith('0x') ? s : '0x' + s),
              is_proxy: fc.boolean()
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (classData) => {
          // Ensure unique contract addresses
          const uniqueContracts = classData.contracts.filter((contract, index, arr) => 
            arr.findIndex(c => c.contract_address === contract.contract_address) === index
          );

          // Setup prerequisites
          const blockNumber = Math.floor(Math.random() * 999999) + 1;
          await db.query(`
            INSERT INTO blocks (block_number, block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (block_number) DO NOTHING
          `, [blockNumber.toString(), '0x' + '0'.repeat(64), Date.now().toString(), 'ACCEPTED_ON_L2']);

          // Store contract class
          await db.query(`
            INSERT INTO contract_classes (class_hash, abi_json, declared_block)
            VALUES ($1, $2, $3)
            ON CONFLICT (class_hash) DO NOTHING
          `, [classData.class_hash, '{}', blockNumber.toString()]);

          // Deploy multiple contracts from same class
          for (const contract of uniqueContracts) {
            const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
            
            await db.query(`
              INSERT INTO transactions (tx_hash, block_number, tx_type, status)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (tx_hash) DO NOTHING
            `, [txHash, blockNumber.toString(), 'DEPLOY', 'ACCEPTED_ON_L2']);

            await db.query(`
              INSERT INTO contracts (contract_address, class_hash, deployer_address, deployment_tx_hash, deployment_block, is_proxy)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (contract_address) DO NOTHING
            `, [
              contract.contract_address,
              classData.class_hash,
              contract.deployer_address,
              txHash,
              blockNumber.toString(),
              contract.is_proxy
            ]);
          }

          // Verify all contracts reference the same class
          const deployedContracts = await db.query(`
            SELECT contract_address, class_hash, is_proxy
            FROM contracts 
            WHERE class_hash = $1
          `, [classData.class_hash]);

          expect(deployedContracts.length).toBeGreaterThanOrEqual(uniqueContracts.length);
          
          for (const deployed of deployedContracts) {
            expect(deployed.class_hash).toBe(classData.class_hash);
          }

          // Test proxy vs implementation distinction
          const proxyContracts = deployedContracts.filter(c => c.is_proxy);
          const implementationContracts = deployedContracts.filter(c => !c.is_proxy);
          
          expect(proxyContracts.length + implementationContracts.length).toBe(deployedContracts.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});
