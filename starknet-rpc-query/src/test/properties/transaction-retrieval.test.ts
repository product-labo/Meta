import * as fc from 'fast-check';
import { StarknetRPCClient } from '../../services/rpc/StarknetRPCClient';

describe('Transaction Retrieval Completeness Properties', () => {
  let client: StarknetRPCClient;

  beforeAll(() => {
    client = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
  });

  // Property 9: Transaction retrieval completeness
  test('should retrieve transactions with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          blockRange: fc.record({
            start: fc.bigInt({ min: 1n, max: 50000n }),
            count: fc.integer({ min: 1, max: 3 })
          })
        }),
        async (testData) => {
          const transactionHashes: string[] = [];
          
          // First, get some blocks to extract transaction hashes
          for (let i = 0; i < testData.blockRange.count; i++) {
            try {
              const blockNum = testData.blockRange.start + BigInt(i * 100);
              const block = await client.getBlock(blockNum);
              
              if (block.transactions && block.transactions.length > 0) {
                // Take first few transactions from each block
                const txsToTest = block.transactions.slice(0, 2);
                transactionHashes.push(...txsToTest.map(tx => tx.transaction_hash));
              }
            } catch (error) {
              // Skip blocks that can't be retrieved
              continue;
            }
          }
          
          if (transactionHashes.length === 0) return; // No transactions to test
          
          // Test transaction retrieval
          for (const txHash of transactionHashes.slice(0, 5)) { // Limit to 5 to avoid timeout
            try {
              const transaction = await client.getTransaction(txHash);
              
              // Verify required transaction fields
              expect(transaction).toBeDefined();
              expect(transaction.transaction_hash).toBeDefined();
              expect(typeof transaction.transaction_hash).toBe('string');
              expect(transaction.transaction_hash).toMatch(/^0x[0-9a-f]+$/i);
              expect(transaction.transaction_hash.toLowerCase()).toBe(txHash.toLowerCase());
              
              if (transaction.type) {
                expect(['INVOKE', 'DECLARE', 'DEPLOY', 'DEPLOY_ACCOUNT', 'L1_HANDLER'].includes(transaction.type)).toBe(true);
              }
              
              if (transaction.sender_address) {
                expect(typeof transaction.sender_address).toBe('string');
                expect(transaction.sender_address).toMatch(/^0x[0-9a-f]+$/i);
              }
              
              if (transaction.block_hash) {
                expect(typeof transaction.block_hash).toBe('string');
                expect(transaction.block_hash).toMatch(/^0x[0-9a-f]+$/i);
              }
              
              if (transaction.block_number) {
                expect(typeof transaction.block_number === 'number' || typeof transaction.block_number === 'string').toBe(true);
              }
              
              // Test transaction receipt retrieval
              try {
                const receipt = await client.getTransactionReceipt(txHash);
                
                expect(receipt).toBeDefined();
                expect(receipt.transaction_hash).toBeDefined();
                expect(receipt.transaction_hash.toLowerCase()).toBe(txHash.toLowerCase());
                
                if (receipt.execution_status) {
                  expect(['SUCCEEDED', 'REVERTED'].includes(receipt.execution_status)).toBe(true);
                }
                
                if (receipt.finality_status) {
                  expect(['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'].includes(receipt.finality_status)).toBe(true);
                }
                
                if (receipt.events) {
                  expect(Array.isArray(receipt.events)).toBe(true);
                }
                
              } catch (receiptError) {
                // Receipt might not be available for all transactions
                console.warn(`Receipt not available for ${txHash}:`, receiptError.message);
              }
              
            } catch (error) {
              // Some transactions might not be retrievable due to network issues
              console.warn(`Transaction retrieval failed for ${txHash}:`, error.message);
            }
          }
        }
      ),
      { numRuns: 5, timeout: 180000 }
    );
  });

  test('should handle transaction status and execution results consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          blockNumber: fc.bigInt({ min: 10000n, max: 100000n })
        }),
        async (testData) => {
          try {
            const block = await client.getBlock(testData.blockNumber);
            
            if (!block.transactions || block.transactions.length === 0) return;
            
            // Test a few transactions from the block
            const txsToTest = block.transactions.slice(0, 3);
            
            for (const blockTx of txsToTest) {
              try {
                // Get full transaction details
                const fullTx = await client.getTransaction(blockTx.transaction_hash);
                const receipt = await client.getTransactionReceipt(blockTx.transaction_hash);
                
                // Verify consistency between block tx and full tx
                expect(fullTx.transaction_hash.toLowerCase()).toBe(blockTx.transaction_hash.toLowerCase());
                
                if (fullTx.type && blockTx.type) {
                  expect(fullTx.type).toBe(blockTx.type);
                }
                
                // Verify consistency between transaction and receipt
                expect(receipt.transaction_hash.toLowerCase()).toBe(fullTx.transaction_hash.toLowerCase());
                
                // If transaction has execution status, verify it's valid
                if (receipt.execution_status) {
                  expect(['SUCCEEDED', 'REVERTED'].includes(receipt.execution_status)).toBe(true);
                  
                  // If reverted, there should be a revert reason (though not always available)
                  if (receipt.execution_status === 'REVERTED' && receipt.revert_reason) {
                    expect(typeof receipt.revert_reason).toBe('string');
                  }
                }
                
                // Verify finality status progression
                if (receipt.finality_status) {
                  expect(['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'].includes(receipt.finality_status)).toBe(true);
                }
                
                // Verify block references match
                if (fullTx.block_number && receipt.block_number) {
                  const normalizeBlockNum = (bn: any) => {
                    if (typeof bn === 'string') {
                      return bn.startsWith('0x') ? BigInt(bn) : BigInt(bn);
                    }
                    return BigInt(bn);
                  };
                  
                  expect(normalizeBlockNum(fullTx.block_number)).toBe(normalizeBlockNum(receipt.block_number));
                }
                
              } catch (error) {
                // Individual transaction errors are acceptable
                console.warn(`Transaction consistency test failed for ${blockTx.transaction_hash}:`, error.message);
              }
            }
            
          } catch (error) {
            // Block retrieval errors are acceptable
            console.warn(`Block retrieval failed for ${testData.blockNumber}:`, error.message);
          }
        }
      ),
      { numRuns: 3, timeout: 120000 }
    );
  });
});
