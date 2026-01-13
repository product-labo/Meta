import * as fc from 'fast-check';
import { RequestFormatter } from '../../services/rpc/RequestFormatter';

describe('Request Formatting Compliance Properties', () => {
  
  // Property 2: Request formatting compliance
  test('should format requests according to Starknet RPC specification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: fc.constantFrom(
            'starknet_blockNumber',
            'starknet_getBlockWithTxs',
            'starknet_getTransactionByHash',
            'starknet_getTransactionReceipt',
            'starknet_traceTransaction',
            'starknet_getClass',
            'starknet_getStorageAt'
          ),
          blockId: fc.oneof(
            fc.constant('latest'),
            fc.constant('pending'),
            fc.hexaString({ minLength: 2, maxLength: 16 }).map(s => '0x' + s),
            fc.bigInt({ min: 0n, max: 999999n })
          ),
          txHash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
          classHash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
          contractAddress: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
          storageKey: fc.hexaString({ minLength: 1, maxLength: 64 }).map(s => '0x' + s)
        }),
        async (testData) => {
          let params: any[] = [];
          
          // Set up parameters based on method
          switch (testData.method) {
            case 'starknet_blockNumber':
              params = [];
              break;
            case 'starknet_getBlockWithTxs':
              params = [testData.blockId];
              break;
            case 'starknet_getTransactionByHash':
            case 'starknet_getTransactionReceipt':
            case 'starknet_traceTransaction':
              params = [testData.txHash];
              break;
            case 'starknet_getClass':
              params = [testData.classHash];
              break;
            case 'starknet_getStorageAt':
              params = [testData.contractAddress, testData.storageKey];
              break;
          }

          const request = RequestFormatter.formatRequest(testData.method, params);

          // Verify JSON-RPC 2.0 compliance
          expect(request.jsonrpc).toBe('2.0');
          expect(typeof request.method).toBe('string');
          expect(request.method).toBe(testData.method);
          expect(Array.isArray(request.params)).toBe(true);
          expect(typeof request.id).toBe('number');

          // Verify method-specific parameter formatting
          switch (testData.method) {
            case 'starknet_blockNumber':
              expect(request.params).toHaveLength(0);
              break;
              
            case 'starknet_getBlockWithTxs':
              expect(request.params).toHaveLength(1);
              if (typeof testData.blockId === 'string' && (testData.blockId === 'latest' || testData.blockId === 'pending')) {
                expect(request.params[0]).toBe(testData.blockId);
              } else {
                expect(request.params[0]).toMatch(/^0x[0-9a-f]+$/i);
              }
              break;
              
            case 'starknet_getTransactionByHash':
            case 'starknet_getTransactionReceipt':
            case 'starknet_traceTransaction':
              expect(request.params).toHaveLength(1);
              expect(request.params[0]).toBe(testData.txHash);
              expect(request.params[0]).toMatch(/^0x[0-9a-f]{64}$/i);
              break;
              
            case 'starknet_getClass':
              expect(request.params).toHaveLength(1);
              expect(request.params[0]).toBe(testData.classHash);
              expect(request.params[0]).toMatch(/^0x[0-9a-f]{64}$/i);
              break;
              
            case 'starknet_getStorageAt':
              expect(request.params).toHaveLength(2);
              expect(request.params[0]).toBe(testData.contractAddress);
              expect(request.params[0]).toMatch(/^0x[0-9a-f]{64}$/i);
              expect(request.params[1]).toMatch(/^0x[0-9a-f]+$/i);
              break;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should validate parameters correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          validCases: fc.array(
            fc.record({
              method: fc.constantFrom('starknet_blockNumber', 'starknet_getBlockWithTxs', 'starknet_getTransactionByHash'),
              params: fc.oneof(
                fc.constant([]), // for blockNumber
                fc.array(fc.constant('latest'), { minLength: 1, maxLength: 1 }), // for getBlock
                fc.array(fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s), { minLength: 1, maxLength: 1 }) // for getTx
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          invalidCases: fc.array(
            fc.record({
              method: fc.oneof(
                fc.constant(''), // empty method
                fc.constant('invalid_method'), // wrong prefix
                fc.string().filter(s => !s.startsWith('starknet_')) // invalid method
              ),
              params: fc.array(fc.anything(), { maxLength: 5 })
            }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        async (testData) => {
          // Test valid cases
          for (const validCase of testData.validCases) {
            if (validCase.method === 'starknet_blockNumber' && validCase.params.length === 0) {
              expect(RequestFormatter.validateParams(validCase.method, validCase.params)).toBe(true);
            } else if (validCase.method === 'starknet_getBlockWithTxs' && validCase.params.length === 1) {
              expect(RequestFormatter.validateParams(validCase.method, validCase.params)).toBe(true);
            } else if (validCase.method === 'starknet_getTransactionByHash' && validCase.params.length === 1) {
              expect(RequestFormatter.validateParams(validCase.method, validCase.params)).toBe(true);
            }
          }

          // Test invalid cases
          for (const invalidCase of testData.invalidCases) {
            expect(RequestFormatter.validateParams(invalidCase.method, invalidCase.params)).toBe(false);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should handle edge cases and malformed inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          malformedInputs: fc.array(
            fc.record({
              method: fc.oneof(
                fc.constant(null),
                fc.constant(undefined),
                fc.constant(123),
                fc.constant({}),
                fc.constant([])
              ),
              params: fc.oneof(
                fc.constant(null),
                fc.constant(undefined),
                fc.constant('not-an-array'),
                fc.constant(123)
              )
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (testData) => {
          for (const input of testData.malformedInputs) {
            expect(() => {
              RequestFormatter.formatRequest(input.method as any, input.params as any);
            }).toThrow();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
