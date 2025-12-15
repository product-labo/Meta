/**
 * Property-based tests for Parameter Decoding Consistency
 * **Feature: universal-smart-contract-indexer, Property 2: Parameter Decoding Consistency**
 * 
 * Tests universal properties that should hold across all parameter decoding operations
 * **Validates: Requirements 1.2, 1.3**
 */

import fc from 'fast-check';
import { ethers } from 'ethers';
import {
  decodeParameters,
  validateDecodedParameters,
  getParameterValue,
  extractAddresses,
  extractAmounts,
  batchDecodeParameters
} from '../../indexer/utils/abiDecoder.js';

// Helper generators
const ethereumAddress = () => fc.hexaString().map(s => {
  const hex = s.padEnd(40, '0').substring(0, 40);
  return '0x' + hex;
});

const uint256Value = () => fc.bigInt({ min: 0n, max: 2n ** 256n - 1n }).map(n => n.toString());

describe('Parameter Decoding Consistency Properties', () => {
  /**
   * **Feature: universal-smart-contract-indexer, Property 2: Parameter Decoding Consistency**
   * **Validates: Requirements 1.2, 1.3**
   * 
   * For any known function signature and valid input data, decoding the parameters 
   * should produce the same result when decoded multiple times
   */
  test('Property 1: For any valid function call, decoding should be deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode parameters using ethers
          const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const encoded = iface.encodeFunctionData('transfer', [params.to, params.amount]);
          
          // Remove function selector (first 10 characters)
          const encodedParams = encoded.substring(10);
          
          // Decode multiple times
          const decoded1 = decodeParameters('transfer(address,uint256)', encodedParams);
          const decoded2 = decodeParameters('transfer(address,uint256)', encodedParams);
          const decoded3 = decodeParameters('transfer(address,uint256)', encodedParams);
          
          // Property 1.1: All decodings should succeed
          expect(decoded1).not.toBeNull();
          expect(decoded2).not.toBeNull();
          expect(decoded3).not.toBeNull();
          
          // Property 1.2: All decodings should be identical
          expect(JSON.stringify(decoded1)).toBe(JSON.stringify(decoded2));
          expect(JSON.stringify(decoded2)).toBe(JSON.stringify(decoded3));
          
          // Property 1.3: Decoded values should match original inputs
          expect(decoded1.parameters.to.toLowerCase()).toBe(params.to.toLowerCase());
          expect(decoded1.parameters.amount).toBe(params.amount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: For any ERC-20 transfer, decoded parameters should match encoded values
   */
  test('Property 2: For any ERC-20 transfer encoding, decoding should recover original values', () => {
    fc.assert(
      fc.property(
        fc.record({
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode
          const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const encoded = iface.encodeFunctionData('transfer', [params.to, params.amount]);
          const encodedParams = encoded.substring(10);
          
          // Decode
          const decoded = decodeParameters('transfer(address,uint256)', encodedParams);
          
          // Property 2.1: Decoding should succeed
          expect(decoded).not.toBeNull();
          
          // Property 2.2: Function name should be correct
          expect(decoded.functionName).toBe('transfer');
          
          // Property 2.3: Should have correct parameter types
          expect(decoded.parameterTypes).toHaveLength(2);
          expect(decoded.parameterTypes[0].type).toBe('address');
          expect(decoded.parameterTypes[1].type).toBe('uint256');
          
          // Property 2.4: Decoded address should match (case-insensitive)
          expect(decoded.parameters.to.toLowerCase()).toBe(params.to.toLowerCase());
          
          // Property 2.5: Decoded amount should match exactly
          expect(decoded.parameters.amount).toBe(params.amount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: For any ERC-20 approve, decoding should be consistent
   */
  test('Property 3: For any ERC-20 approve encoding, decoding should be consistent', () => {
    fc.assert(
      fc.property(
        fc.record({
          spender: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode
          const iface = new ethers.Interface(['function approve(address spender, uint256 amount)']);
          const encoded = iface.encodeFunctionData('approve', [params.spender, params.amount]);
          const encodedParams = encoded.substring(10);
          
          // Decode
          const decoded = decodeParameters('approve(address,uint256)', encodedParams);
          
          // Property 3.1: Should decode successfully
          expect(decoded).not.toBeNull();
          expect(decoded.functionName).toBe('approve');
          
          // Property 3.2: Parameters should match
          expect(decoded.parameters.spender.toLowerCase()).toBe(params.spender.toLowerCase());
          expect(decoded.parameters.amount).toBe(params.amount);
          
          // Property 3.3: Multiple decodings should be identical
          const decoded2 = decodeParameters('approve(address,uint256)', encodedParams);
          expect(JSON.stringify(decoded)).toBe(JSON.stringify(decoded2));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: For any ERC-20 transferFrom, three-parameter decoding should work
   */
  test('Property 4: For any ERC-20 transferFrom, all three parameters should decode correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          from: ethereumAddress(),
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode
          const iface = new ethers.Interface([
            'function transferFrom(address from, address to, uint256 amount)'
          ]);
          const encoded = iface.encodeFunctionData('transferFrom', [
            params.from,
            params.to,
            params.amount
          ]);
          const encodedParams = encoded.substring(10);
          
          // Decode
          const decoded = decodeParameters('transferFrom(address,address,uint256)', encodedParams);
          
          // Property 4.1: Should decode successfully
          expect(decoded).not.toBeNull();
          expect(decoded.functionName).toBe('transferFrom');
          
          // Property 4.2: Should have three parameters
          expect(decoded.parameterTypes).toHaveLength(3);
          
          // Property 4.3: All parameters should match
          expect(decoded.parameters.from.toLowerCase()).toBe(params.from.toLowerCase());
          expect(decoded.parameters.to.toLowerCase()).toBe(params.to.toLowerCase());
          expect(decoded.parameters.amount).toBe(params.amount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: For any decoded parameters, validation should be consistent
   */
  test('Property 5: For any successfully decoded parameters, validation should pass', () => {
    fc.assert(
      fc.property(
        fc.record({
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode and decode
          const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const encoded = iface.encodeFunctionData('transfer', [params.to, params.amount]);
          const encodedParams = encoded.substring(10);
          const decoded = decodeParameters('transfer(address,uint256)', encodedParams);
          
          // Property 5.1: Validation should pass for successfully decoded params
          const expectedTypes = [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ];
          expect(validateDecodedParameters(decoded, expectedTypes)).toBe(true);
          
          // Property 5.2: Validation should be idempotent
          expect(validateDecodedParameters(decoded, expectedTypes)).toBe(
            validateDecodedParameters(decoded, expectedTypes)
          );
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: For any decoded parameters, extracting by name should work
   */
  test('Property 6: For any decoded parameters, parameter extraction by name should be consistent', () => {
    fc.assert(
      fc.property(
        fc.record({
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode and decode
          const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const encoded = iface.encodeFunctionData('transfer', [params.to, params.amount]);
          const encodedParams = encoded.substring(10);
          const decoded = decodeParameters('transfer(address,uint256)', encodedParams);
          
          // Property 6.1: Should extract correct values by name
          const toValue = getParameterValue(decoded, 'to');
          const amountValue = getParameterValue(decoded, 'amount');
          
          expect(toValue.toLowerCase()).toBe(params.to.toLowerCase());
          expect(amountValue).toBe(params.amount);
          
          // Property 6.2: Multiple extractions should be identical
          expect(getParameterValue(decoded, 'to')).toBe(getParameterValue(decoded, 'to'));
          expect(getParameterValue(decoded, 'amount')).toBe(getParameterValue(decoded, 'amount'));
          
          // Property 6.3: Non-existent parameters should return null
          expect(getParameterValue(decoded, 'nonexistent')).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: For any decoded parameters, address extraction should find all addresses
   */
  test('Property 7: For any decoded parameters, address extraction should be complete', () => {
    fc.assert(
      fc.property(
        fc.record({
          from: ethereumAddress(),
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode and decode transferFrom (has 2 addresses)
          const iface = new ethers.Interface([
            'function transferFrom(address from, address to, uint256 amount)'
          ]);
          const encoded = iface.encodeFunctionData('transferFrom', [
            params.from,
            params.to,
            params.amount
          ]);
          const encodedParams = encoded.substring(10);
          const decoded = decodeParameters('transferFrom(address,address,uint256)', encodedParams);
          
          // Property 7.1: Should extract all addresses
          const addresses = extractAddresses(decoded);
          expect(addresses).toHaveLength(2);
          
          // Property 7.2: Extracted addresses should match parameters
          expect(addresses).toContain(params.from.toLowerCase());
          expect(addresses).toContain(params.to.toLowerCase());
          
          // Property 7.3: Multiple extractions should be identical
          const addresses2 = extractAddresses(decoded);
          expect(addresses.sort()).toEqual(addresses2.sort());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: For any decoded parameters, amount extraction should find amounts
   */
  test('Property 8: For any decoded parameters with amounts, extraction should work', () => {
    fc.assert(
      fc.property(
        fc.record({
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Encode and decode
          const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const encoded = iface.encodeFunctionData('transfer', [params.to, params.amount]);
          const encodedParams = encoded.substring(10);
          const decoded = decodeParameters('transfer(address,uint256)', encodedParams);
          
          // Property 8.1: Should extract amount
          const amounts = extractAmounts(decoded);
          expect(amounts).toHaveLength(1);
          expect(amounts[0]).toBe(params.amount);
          
          // Property 8.2: Multiple extractions should be identical
          const amounts2 = extractAmounts(decoded);
          expect(amounts).toEqual(amounts2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: For any batch of function calls, batch decoding should match individual decoding
   */
  test('Property 9: For any batch of calls, batch decoding should equal individual decoding', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            to: ethereumAddress(),
            amount: uint256Value()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (callsData) => {
          // Encode all calls
          const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const calls = callsData.map(params => {
            const encoded = iface.encodeFunctionData('transfer', [params.to, params.amount]);
            return {
              signature: 'transfer(address,uint256)',
              data: encoded.substring(10),
              originalParams: params
            };
          });
          
          // Batch decode
          const batchResults = batchDecodeParameters(calls);
          
          // Property 9.1: Batch should decode all calls
          expect(batchResults).toHaveLength(calls.length);
          
          // Property 9.2: Each batch result should match individual decoding
          batchResults.forEach((result, index) => {
            const individual = decodeParameters(calls[index].signature, calls[index].data);
            expect(JSON.stringify(result.decoded)).toBe(JSON.stringify(individual));
            expect(result.success).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: For any function with boolean parameters, decoding should preserve boolean values
   */
  test('Property 10: For any function with boolean parameters, values should be preserved', () => {
    fc.assert(
      fc.property(
        fc.record({
          spender: ethereumAddress(),
          approved: fc.boolean()
        }),
        (params) => {
          // Encode a function with boolean parameter
          const iface = new ethers.Interface([
            'function setApprovalForAll(address spender, bool approved)'
          ]);
          const encoded = iface.encodeFunctionData('setApprovalForAll', [
            params.spender,
            params.approved
          ]);
          const encodedParams = encoded.substring(10);
          
          // Decode
          const decoded = decodeParameters('setApprovalForAll(address,bool)', encodedParams);
          
          // Property 10.1: Should decode successfully
          expect(decoded).not.toBeNull();
          
          // Property 10.2: Boolean value should be preserved
          expect(decoded.parameters.approved).toBe(params.approved);
          expect(typeof decoded.parameters.approved).toBe('boolean');
          
          // Property 10.3: Address should also be correct
          expect(decoded.parameters.spender.toLowerCase()).toBe(params.spender.toLowerCase());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: For any invalid encoded data, decoding should fail gracefully
   */
  test('Property 11: For any invalid data, decoding should return null without throwing', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('invalid'),
          fc.hexaString().filter(s => s.length < 64), // Too short
          fc.string() // Random string
        ),
        (invalidData) => {
          // Property 11.1: Should not throw
          expect(() => {
            const result = decodeParameters('transfer(address,uint256)', invalidData);
            // Property 11.2: Should return null for invalid data
            expect(result).toBeNull();
          }).not.toThrow();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: For any valid encoding, re-encoding decoded values should match original
   */
  test('Property 12: For any valid encoding, decode-then-encode should be identity', () => {
    fc.assert(
      fc.property(
        fc.record({
          to: ethereumAddress(),
          amount: uint256Value()
        }),
        (params) => {
          // Original encoding
          const iface = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const originalEncoded = iface.encodeFunctionData('transfer', [params.to, params.amount]);
          const originalParams = originalEncoded.substring(10);
          
          // Decode
          const decoded = decodeParameters('transfer(address,uint256)', originalParams);
          
          // Re-encode using decoded values
          const reEncoded = iface.encodeFunctionData('transfer', [
            decoded.parameters.to,
            decoded.parameters.amount
          ]);
          const reEncodedParams = reEncoded.substring(10);
          
          // Property 12.1: Re-encoded should match original (case-insensitive)
          expect(reEncodedParams.toLowerCase()).toBe(originalParams.toLowerCase());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
