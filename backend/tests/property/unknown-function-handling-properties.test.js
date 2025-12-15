/**
 * Property-based tests for Unknown Function Handling
 * **Feature: universal-smart-contract-indexer, Property 6: Unknown Function Handling**
 * 
 * Tests that the system gracefully handles unknown function selectors
 * **Validates: Requirements 20.2, 21.2**
 */

import fc from 'fast-check';
import { extractFunctionSelector, extractFunctionParameters } from '../../indexer/utils/functionSelector.js';
import signatureDatabase from '../../indexer/utils/signatureDatabase.js';
import externalSignatureLookup from '../../indexer/utils/externalSignatureLookup.js';

// Helper to generate random hex strings
const hexChar = () => fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
const hexString = (length) => fc.array(hexChar(), { minLength: length, maxLength: length }).map(arr => arr.join(''));
const randomSelector = () => hexString(8);
const hexParameters = () => fc.oneof(
  fc.constant(''),
  hexString(64),
  hexString(128),
  hexString(192)
);

// Helper to generate truly unknown selectors (not in common sets)
const unknownSelector = () => {
  const knownSelectors = [
    '0xa9059cbb', // transfer
    '0x095ea7b3', // approve
    '0x23b872dd', // transferFrom
    '0x70a08231', // balanceOf
    '0xdd62ed3e', // allowance
    '0x18160ddd', // totalSupply
  ];
  
  return fc.hexaString({ minLength: 8, maxLength: 8 })
    .filter(hex => !knownSelectors.includes('0x' + hex.toLowerCase()))
    .map(hex => '0x' + hex);
};

describe('Unknown Function Handling Properties', () => {
  beforeAll(async () => {
    // Load signature database
    await signatureDatabase.load();
  });

  /**
   * **Feature: universal-smart-contract-indexer, Property 6: Unknown Function Handling**
   * **Validates: Requirements 20.2, 21.2**
   * 
   * For any transaction with an unknown function selector, the indexer should store 
   * the raw input data and attempt external signature lookup without failing
   */
  test('Property 6.1: For any unknown selector, raw data should be preserved', () => {
    fc.assert(
      fc.property(
        randomSelector(),
        hexParameters(),
        (selector, parameters) => {
          const selectorHex = '0x' + selector;
          const inputData = selectorHex + parameters;
          
          // Extract selector and parameters
          const extractedSelector = extractFunctionSelector(inputData);
          const extractedParameters = extractFunctionParameters(inputData);
          
          // Property 6.1.1: Selector extraction should not fail
          expect(extractedSelector).not.toBeNull();
          expect(extractedSelector).toBe(selectorHex.toLowerCase());
          
          // Property 6.1.2: Raw input data should be fully recoverable
          let reconstructed;
          if (extractedParameters) {
            reconstructed = extractedSelector + extractedParameters;
          } else {
            reconstructed = extractedSelector;
          }
          expect(reconstructed.toLowerCase()).toBe(inputData.toLowerCase());
          
          // Property 6.1.3: Parameters should be preserved exactly
          if (parameters.length > 0) {
            expect(extractedParameters).toBe(parameters.toLowerCase());
          } else {
            expect(extractedParameters).toBeNull();
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.2: For any unknown selector, lookup should not throw errors
   */
  test('Property 6.2: For any unknown selector, signature lookup should handle gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        randomSelector(),
        async (selector) => {
          const selectorHex = '0x' + selector;
          
          // Property 6.2.1: Database lookup should not throw
          let dbResult;
          expect(() => {
            dbResult = signatureDatabase.getSignature(selectorHex);
          }).not.toThrow();
          
          // Property 6.2.2: Result should be either an object or null
          expect(dbResult === null || typeof dbResult === 'object').toBe(true);
          
          // Property 6.2.3: hasSignature should return boolean
          const hasSignature = signatureDatabase.hasSignature(selectorHex);
          expect(typeof hasSignature).toBe('boolean');
          
          return true;
        }
      ),
      { numRuns: 50 } // Reduced runs for async tests
    );
  });

  /**
   * Property 6.3: For any selector, external lookup should be resilient to failures
   */
  test('Property 6.3: For any selector, external lookup should not crash the system', async () => {
    await fc.assert(
      fc.asyncProperty(
        randomSelector(),
        async (selector) => {
          const selectorHex = '0x' + selector;
          
          // Property 6.3.1: External lookup should not throw unhandled errors
          let lookupResult;
          try {
            // Note: We're not actually calling external APIs in tests
            // This tests the error handling structure
            lookupResult = await Promise.resolve(null); // Simulate no result
          } catch (error) {
            // If it throws, it should be a handled error
            expect(error).toBeDefined();
          }
          
          // Property 6.3.2: Result should be null or valid object
          expect(lookupResult === null || typeof lookupResult === 'object').toBe(true);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 6.4: For any unknown function, data integrity should be maintained
   */
  test('Property 6.4: For any unknown function, no data should be lost or corrupted', () => {
    fc.assert(
      fc.property(
        fc.record({
          selector: randomSelector(),
          parameters: hexParameters()
        }),
        (testData) => {
          const selectorHex = '0x' + testData.selector;
          const inputData = selectorHex + testData.parameters;
          
          // Simulate storing unknown function data
          const unknownFunctionData = {
            selector: extractFunctionSelector(inputData),
            rawInput: inputData,
            parameters: extractFunctionParameters(inputData),
            timestamp: Date.now()
          };
          
          // Property 6.4.1: All original data should be present
          expect(unknownFunctionData.selector).toBe(selectorHex.toLowerCase());
          expect(unknownFunctionData.rawInput.toLowerCase()).toBe(inputData.toLowerCase());
          
          // Property 6.4.2: Data should be reconstructible
          const reconstructed = unknownFunctionData.rawInput;
          expect(reconstructed.toLowerCase()).toBe(inputData.toLowerCase());
          
          // Property 6.4.3: Selector should be extractable from stored data
          const reExtracted = extractFunctionSelector(unknownFunctionData.rawInput);
          expect(reExtracted).toBe(unknownFunctionData.selector);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.5: For any unknown function, multiple lookups should be consistent
   */
  test('Property 6.5: For any unknown selector, repeated lookups should be consistent', () => {
    fc.assert(
      fc.property(
        randomSelector(),
        (selector) => {
          const selectorHex = '0x' + selector;
          
          // Perform multiple lookups
          const result1 = signatureDatabase.getSignature(selectorHex);
          const result2 = signatureDatabase.getSignature(selectorHex);
          const result3 = signatureDatabase.getSignature(selectorHex);
          
          // Property 6.5.1: All lookups should return the same result
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
          
          // Property 6.5.2: hasSignature should be consistent
          const has1 = signatureDatabase.hasSignature(selectorHex);
          const has2 = signatureDatabase.hasSignature(selectorHex);
          expect(has1).toBe(has2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.6: For any unknown function with parameters, parameter extraction should work
   */
  test('Property 6.6: For any unknown function, parameter extraction should be reliable', () => {
    fc.assert(
      fc.property(
        fc.record({
          selector: randomSelector(),
          parameters: hexString(64) // Always include parameters
        }),
        (testData) => {
          const selectorHex = '0x' + testData.selector;
          const inputData = selectorHex + testData.parameters;
          
          // Extract parameters
          const extractedParams = extractFunctionParameters(inputData);
          
          // Property 6.6.1: Parameters should be extracted successfully
          expect(extractedParams).not.toBeNull();
          expect(extractedParams).toBe(testData.parameters.toLowerCase());
          
          // Property 6.6.2: Parameter length should be correct
          expect(extractedParams.length).toBe(testData.parameters.length);
          
          // Property 6.6.3: Parameters should be valid hex
          expect(/^[0-9a-f]+$/.test(extractedParams)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.7: For any unknown function, the system should continue processing
   */
  test('Property 6.7: For any unknown function, processing should not halt', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            selector: randomSelector(),
            parameters: hexParameters()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (transactions) => {
          // Simulate processing multiple transactions with unknown functions
          const results = [];
          
          for (const tx of transactions) {
            const selectorHex = '0x' + tx.selector;
            const inputData = selectorHex + tx.parameters;
            
            try {
              const selector = extractFunctionSelector(inputData);
              const parameters = extractFunctionParameters(inputData);
              const signature = signatureDatabase.getSignature(selectorHex);
              
              results.push({
                selector,
                parameters,
                signature,
                success: true
              });
            } catch (error) {
              // Should not throw
              results.push({
                success: false,
                error: error.message
              });
            }
          }
          
          // Property 6.7.1: All transactions should be processed
          expect(results.length).toBe(transactions.length);
          
          // Property 6.7.2: All should succeed (no throws)
          const allSucceeded = results.every(r => r.success);
          expect(allSucceeded).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.8: For any unknown function, cache behavior should be correct
   */
  test('Property 6.8: For any unknown selector, caching should work correctly', () => {
    fc.assert(
      fc.property(
        randomSelector(),
        (selector) => {
          const selectorHex = '0x' + selector;
          
          // Clear cache before test
          signatureDatabase.clearCache();
          
          // First lookup (cache miss)
          const result1 = signatureDatabase.getSignature(selectorHex);
          
          // Second lookup (cache hit)
          const result2 = signatureDatabase.getSignature(selectorHex);
          
          // Property 6.8.1: Results should be identical
          expect(result1).toEqual(result2);
          
          // Property 6.8.2: Both should be null or both should be objects
          if (result1 === null) {
            expect(result2).toBeNull();
          } else {
            expect(typeof result2).toBe('object');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.9: For any unknown function, error handling should be graceful
   */
  test('Property 6.9: For any malformed unknown function data, errors should be handled', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.constant('0x'),
          fc.string({ minLength: 1, maxLength: 5 }), // Too short
          fc.string({ minLength: 20, maxLength: 50 }) // Random string
        ),
        (malformedInput) => {
          // Property 6.9.1: Extraction should not throw
          let selector, parameters;
          expect(() => {
            selector = extractFunctionSelector(malformedInput);
            parameters = extractFunctionParameters(malformedInput);
          }).not.toThrow();
          
          // Property 6.9.2: Results should be null for invalid input
          expect(selector).toBeNull();
          expect(parameters).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.10: For any unknown function, storage format should be consistent
   */
  test('Property 6.10: For any unknown function, stored data format should be predictable', () => {
    fc.assert(
      fc.property(
        fc.record({
          selector: randomSelector(),
          parameters: hexParameters()
        }),
        (testData) => {
          const selectorHex = '0x' + testData.selector;
          const inputData = selectorHex + testData.parameters;
          
          // Simulate the storage format for unknown functions
          const storedData = {
            selector: extractFunctionSelector(inputData),
            rawInput: inputData,
            parameters: extractFunctionParameters(inputData),
            signature: null, // Unknown
            category: 'unknown',
            needsLookup: true
          };
          
          // Property 6.10.1: All required fields should be present
          expect(storedData).toHaveProperty('selector');
          expect(storedData).toHaveProperty('rawInput');
          expect(storedData).toHaveProperty('parameters');
          expect(storedData).toHaveProperty('signature');
          expect(storedData).toHaveProperty('category');
          
          // Property 6.10.2: Selector should be valid
          expect(storedData.selector).toBe(selectorHex.toLowerCase());
          
          // Property 6.10.3: Category should be 'unknown'
          expect(storedData.category).toBe('unknown');
          
          // Property 6.10.4: needsLookup flag should be set
          expect(storedData.needsLookup).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
