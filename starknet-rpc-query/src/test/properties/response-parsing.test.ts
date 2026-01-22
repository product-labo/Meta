import * as fc from 'fast-check';
import { ResponseParser } from '../../services/rpc/ResponseParser';

describe('Response Parsing Completeness Properties', () => {
  
  // Property 3: Response parsing completeness
  test('should parse all valid JSON-RPC responses completely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          validResponses: fc.array(
            fc.record({
              jsonrpc: fc.constant('2.0'),
              id: fc.integer(),
              result: fc.oneof(
                fc.string(),
                fc.integer(),
                fc.record({
                  block_number: fc.hexaString({ minLength: 1, maxLength: 16 }).map(s => '0x' + s),
                  block_hash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
                  parent_hash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
                  timestamp: fc.integer({ min: 1600000000, max: 2000000000 }),
                  transactions: fc.array(fc.record({
                    transaction_hash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
                    type: fc.constantFrom('INVOKE', 'DECLARE', 'DEPLOY')
                  }), { maxLength: 5 })
                }),
                fc.record({
                  transaction_hash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
                  block_hash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
                  block_number: fc.hexaString({ minLength: 1, maxLength: 16 }).map(s => '0x' + s),
                  sender_address: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
                  type: fc.constantFrom('INVOKE', 'DECLARE', 'DEPLOY'),
                  status: fc.constantFrom('ACCEPTED_ON_L2', 'ACCEPTED_ON_L1', 'PENDING')
                })
              )
            }),
            { minLength: 1, maxLength: 10 }
          )
        }),
        async (testData) => {
          for (const response of testData.validResponses) {
            const parsed = ResponseParser.parseResponse(response);
            
            // Verify parsing completeness
            expect(parsed).toEqual(response.result);
            
            // Verify response validation
            expect(ResponseParser.validateResponse(response)).toBe(true);
            
            // Test specific parsers based on result type
            if (typeof response.result === 'object' && response.result !== null) {
              if ('block_number' in response.result && 'block_hash' in response.result) {
                // Test block response parsing
                const blockParsed = ResponseParser.parseBlockResponse(response);
                expect(blockParsed.block_number).toBeDefined();
                expect(blockParsed.block_hash).toBeDefined();
                expect(blockParsed.block_hash).toMatch(/^0x[0-9a-f]{64}$/i);
              }
              
              if ('transaction_hash' in response.result) {
                // Test transaction response parsing
                const txParsed = ResponseParser.parseTransactionResponse(response);
                expect(txParsed.transaction_hash).toBeDefined();
                expect(txParsed.transaction_hash).toMatch(/^0x[0-9a-f]{64}$/i);
              }
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should handle error responses correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorResponses: fc.array(
            fc.record({
              jsonrpc: fc.constant('2.0'),
              id: fc.integer(),
              error: fc.record({
                code: fc.integer({ min: -32999, max: -32000 }),
                message: fc.string({ minLength: 1, maxLength: 200 }),
                data: fc.option(fc.anything())
              })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (testData) => {
          for (const errorResponse of testData.errorResponses) {
            expect(() => {
              ResponseParser.parseResponse(errorResponse);
            }).toThrow();
            
            expect(() => {
              ResponseParser.parseResponse(errorResponse);
            }).toThrow(/RPC Error:/);
            
            // Should still validate as proper JSON-RPC structure
            expect(ResponseParser.validateResponse(errorResponse)).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should parse blockchain formats correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hexValues: fc.array(
            fc.hexaString({ minLength: 1, maxLength: 64 }).map(s => '0x' + s),
            { minLength: 1, maxLength: 10 }
          ),
          addresses: fc.array(
            fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
            { minLength: 1, maxLength: 5 }
          ),
          hashes: fc.array(
            fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (testData) => {
          // Test hex parsing
          for (const hex of testData.hexValues) {
            const parsed = ResponseParser.parseBlockchainFormat(hex, 'hex');
            expect(parsed).toBe(hex.toLowerCase());
            expect(parsed).toMatch(/^0x[0-9a-f]+$/);
          }
          
          // Test address parsing
          for (const address of testData.addresses) {
            const parsed = ResponseParser.parseBlockchainFormat(address, 'address');
            expect(parsed).toBe(address.toLowerCase());
            expect(parsed).toMatch(/^0x[0-9a-f]{64}$/);
            expect(parsed.length).toBe(66);
          }
          
          // Test hash parsing
          for (const hash of testData.hashes) {
            const parsed = ResponseParser.parseBlockchainFormat(hash, 'hash');
            expect(parsed).toBe(hash.toLowerCase());
            expect(parsed).toMatch(/^0x[0-9a-f]{64}$/);
            expect(parsed.length).toBe(66);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('should reject malformed responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          malformedResponses: fc.array(
            fc.oneof(
              fc.constant(null),
              fc.constant(undefined),
              fc.constant('not-an-object'),
              fc.constant(123),
              fc.record({ jsonrpc: fc.constant('1.0') }), // wrong version
              fc.record({ jsonrpc: fc.constant('2.0') }), // missing result and error
              fc.record({ 
                jsonrpc: fc.constant('2.0'),
                result: fc.string(),
                error: fc.record({ code: fc.integer(), message: fc.string() })
              }) // both result and error
            ),
            { minLength: 1, maxLength: 8 }
          ),
          invalidFormats: fc.array(
            fc.record({
              value: fc.oneof(
                fc.constant('not-hex'),
                fc.constant('0xGGGG'),
                fc.constant('0x123'), // wrong length for address/hash
                fc.integer()
              ),
              type: fc.constantFrom('hex', 'address', 'hash')
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (testData) => {
          // Test malformed responses
          for (const malformed of testData.malformedResponses) {
            expect(() => {
              ResponseParser.parseResponse(malformed);
            }).toThrow();
            
            expect(ResponseParser.validateResponse(malformed)).toBe(false);
          }
          
          // Test invalid blockchain formats
          for (const invalid of testData.invalidFormats) {
            expect(() => {
              ResponseParser.parseBlockchainFormat(invalid.value as string, invalid.type);
            }).toThrow();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
