/**
 * Property-based tests for Function Selector Extraction
 * **Feature: universal-smart-contract-indexer, Property 1: Function Selector Extraction**
 * 
 * Tests universal properties that should hold across all transaction input data
 * **Validates: Requirements 1.1, 20.1, 24.1**
 */

import fc from 'fast-check';
import {
  extractFunctionSelector,
  isValidSelector,
  extractFunctionParameters,
  hasFunctionCall,
  getFunctionCallInfo
} from '../../indexer/utils/functionSelector.js';

// Helper to generate hex strings of specific length
const hexChar = () => fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
const hexString = (length) => fc.array(hexChar(), { minLength: length, maxLength: length }).map(arr => arr.join(''));
const hexSelector = () => hexString(8);
const hexParameters = () => fc.oneof(
  fc.constant(''),
  hexString(64),
  hexString(128),
  hexString(192)
);

describe('Function Selector Extraction Properties', () => {
  /**
   * **Feature: universal-smart-contract-indexer, Property 1: Function Selector Extraction**
   * **Validates: Requirements 1.1, 20.1, 24.1**
   * 
   * For any transaction with non-empty input data, extracting the first 4 bytes should 
   * always yield a valid function selector, and the remaining bytes should be valid 
   * ABI-encoded parameters
   */
  test('Property 1: For any valid transaction input, selector extraction should be consistent and valid', () => {
    fc.assert(
      fc.property(
        // Generate valid transaction input data: 0x + 8 hex chars (selector) + optional parameters
        fc.record({
          selector: hexSelector(),
          parameters: hexParameters()
        }),
        (testData) => {
          const inputData = '0x' + testData.selector + testData.parameters;
          
          // Property 1.1: Selector extraction should always return a valid selector
          const selector = extractFunctionSelector(inputData);
          expect(selector).not.toBeNull();
          expect(selector).toBeDefined();
          
          // Property 1.2: Extracted selector should be exactly 10 characters (0x + 8 hex)
          expect(selector.length).toBe(10);
          
          // Property 1.3: Selector should start with 0x
          expect(selector.startsWith('0x')).toBe(true);
          
          // Property 1.4: Selector should be valid hex format
          expect(isValidSelector(selector)).toBe(true);
          
          // Property 1.5: Selector should match the first 10 characters of input
          expect(selector).toBe(inputData.substring(0, 10).toLowerCase());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: For any valid selector, validation should be consistent
   */
  test('Property 2: For any extracted selector, validation should always pass', () => {
    fc.assert(
      fc.property(
        hexSelector(),
        (selectorHex) => {
          const selector = '0x' + selectorHex;
          const inputData = selector + '0'.repeat(64); // Add some parameters
          
          // Extract selector
          const extracted = extractFunctionSelector(inputData);
          
          // Property 2.1: Extracted selector should always be valid
          expect(isValidSelector(extracted)).toBe(true);
          
          // Property 2.2: Validation should be idempotent
          expect(isValidSelector(extracted)).toBe(isValidSelector(extracted));
          
          // Property 2.3: Lowercase and original should both be valid
          expect(isValidSelector(extracted.toLowerCase())).toBe(true);
          expect(isValidSelector(extracted.toUpperCase())).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: For any input with parameters, parameter extraction should be consistent
   */
  test('Property 3: For any transaction input, parameter extraction should match remaining bytes', () => {
    fc.assert(
      fc.property(
        fc.record({
          selector: hexSelector(),
          parameters: hexString(64)
        }),
        (testData) => {
          const inputData = '0x' + testData.selector + testData.parameters;
          
          // Extract parameters
          const parameters = extractFunctionParameters(inputData);
          
          // Property 3.1: Parameters should not be null when present
          expect(parameters).not.toBeNull();
          
          // Property 3.2: Parameters should match the input after selector
          expect(parameters).toBe(testData.parameters.toLowerCase());
          
          // Property 3.3: Parameters length should be input length minus selector
          expect(parameters.length).toBe(inputData.length - 10);
          
          // Property 3.4: Concatenating selector and parameters should reconstruct input
          const selector = extractFunctionSelector(inputData);
          expect('0x' + selector.substring(2) + parameters).toBe(inputData.toLowerCase());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: For any input without parameters, parameter extraction should return null
   */
  test('Property 4: For any transaction input with only selector, parameters should be null', () => {
    fc.assert(
      fc.property(
        hexSelector(),
        (selectorHex) => {
          const inputData = '0x' + selectorHex; // Only selector, no parameters
          
          // Extract parameters
          const parameters = extractFunctionParameters(inputData);
          
          // Property 4.1: Parameters should be null when not present
          expect(parameters).toBeNull();
          
          // Property 4.2: Selector should still be extractable
          const selector = extractFunctionSelector(inputData);
          expect(selector).not.toBeNull();
          
          // Property 4.3: hasFunctionCall should still return true
          expect(hasFunctionCall(inputData)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: For any empty or invalid input, extraction should return null
   */
  test('Property 5: For any invalid input, extraction should gracefully return null', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.constant('0x'),
          fc.constant('0x0'),
          fc.string({ minLength: 1, maxLength: 9 }), // Too short
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.startsWith('0x')) // No 0x prefix
        ),
        (invalidInput) => {
          // Property 5.1: Invalid input should return null selector
          const selector = extractFunctionSelector(invalidInput);
          expect(selector).toBeNull();
          
          // Property 5.2: Invalid input should return null parameters
          const parameters = extractFunctionParameters(invalidInput);
          expect(parameters).toBeNull();
          
          // Property 5.3: hasFunctionCall should return false
          expect(hasFunctionCall(invalidInput)).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: For any input, getFunctionCallInfo should provide consistent statistics
   */
  test('Property 6: For any transaction input, function call info should be consistent', () => {
    fc.assert(
      fc.property(
        fc.record({
          selector: hexSelector(),
          parameters: hexParameters()
        }),
        (testData) => {
          const inputData = '0x' + testData.selector + testData.parameters;
          
          // Get function call info
          const info = getFunctionCallInfo(inputData);
          
          // Property 6.1: Info should indicate function is present
          expect(info.hasFunction).toBe(true);
          
          // Property 6.2: Selector should match extracted selector
          const selector = extractFunctionSelector(inputData);
          expect(info.selector).toBe(selector);
          
          // Property 6.3: Parameter presence should be consistent
          const hasParams = testData.parameters.length > 0;
          expect(info.hasParameters).toBe(hasParams);
          
          // Property 6.4: Parameter length should match
          expect(info.parameterLength).toBe(testData.parameters.length);
          
          // Property 6.5: Parameter bytes should be half of hex string length
          expect(info.parameterBytes).toBe(testData.parameters.length / 2);
          
          // Property 6.6: Total length should match input length
          expect(info.totalLength).toBe(inputData.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: For any selector, case normalization should be consistent
   */
  test('Property 7: For any selector, case should be normalized to lowercase', () => {
    fc.assert(
      fc.property(
        hexSelector(),
        (selectorHex) => {
          const upperInput = '0x' + selectorHex.toUpperCase() + '0'.repeat(64);
          const lowerInput = '0x' + selectorHex.toLowerCase() + '0'.repeat(64);
          const mixedInput = '0x' + selectorHex + '0'.repeat(64);
          
          // Extract selectors
          const upperSelector = extractFunctionSelector(upperInput);
          const lowerSelector = extractFunctionSelector(lowerInput);
          const mixedSelector = extractFunctionSelector(mixedInput);
          
          // Property 7.1: All should extract to same lowercase selector
          expect(upperSelector).toBe(lowerSelector);
          expect(lowerSelector).toBe(mixedSelector);
          
          // Property 7.2: Extracted selector should always be lowercase
          expect(upperSelector).toBe(upperSelector.toLowerCase());
          expect(lowerSelector).toBe(lowerSelector.toLowerCase());
          expect(mixedSelector).toBe(mixedSelector.toLowerCase());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: For any known ERC-20 selector, extraction should work correctly
   */
  test('Property 8: For any standard ERC-20 function selector, extraction should be accurate', () => {
    const erc20Selectors = [
      '0xa9059cbb', // transfer(address,uint256)
      '0x095ea7b3', // approve(address,uint256)
      '0x23b872dd', // transferFrom(address,address,uint256)
      '0x70a08231', // balanceOf(address)
      '0xdd62ed3e', // allowance(address,address)
      '0x18160ddd', // totalSupply()
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...erc20Selectors),
        hexParameters(),
        (selector, parameters) => {
          const inputData = selector + parameters;
          
          // Extract selector
          const extracted = extractFunctionSelector(inputData);
          
          // Property 8.1: Should extract the correct selector
          expect(extracted).toBe(selector.toLowerCase());
          
          // Property 8.2: Should be valid
          expect(isValidSelector(extracted)).toBe(true);
          
          // Property 8.3: Should have function call
          expect(hasFunctionCall(inputData)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: For any input, extraction should be deterministic
   */
  test('Property 9: For any transaction input, multiple extractions should yield identical results', () => {
    fc.assert(
      fc.property(
        fc.record({
          selector: hexSelector(),
          parameters: hexParameters()
        }),
        (testData) => {
          const inputData = '0x' + testData.selector + testData.parameters;
          
          // Extract multiple times
          const selector1 = extractFunctionSelector(inputData);
          const selector2 = extractFunctionSelector(inputData);
          const selector3 = extractFunctionSelector(inputData);
          
          const params1 = extractFunctionParameters(inputData);
          const params2 = extractFunctionParameters(inputData);
          const params3 = extractFunctionParameters(inputData);
          
          // Property 9.1: All selector extractions should be identical
          expect(selector1).toBe(selector2);
          expect(selector2).toBe(selector3);
          
          // Property 9.2: All parameter extractions should be identical
          expect(params1).toBe(params2);
          expect(params2).toBe(params3);
          
          // Property 9.3: Function call detection should be consistent
          expect(hasFunctionCall(inputData)).toBe(hasFunctionCall(inputData));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: For any input with valid structure, selector + parameters should reconstruct input
   */
  test('Property 10: For any valid input, selector and parameters should fully represent the input', () => {
    fc.assert(
      fc.property(
        fc.record({
          selector: hexSelector(),
          parameters: hexParameters()
        }),
        (testData) => {
          const inputData = '0x' + testData.selector + testData.parameters;
          
          // Extract components
          const selector = extractFunctionSelector(inputData);
          const parameters = extractFunctionParameters(inputData);
          
          // Property 10.1: Reconstructed input should match original (case-insensitive)
          let reconstructed;
          if (parameters) {
            reconstructed = selector + parameters;
          } else {
            reconstructed = selector;
          }
          
          expect(reconstructed.toLowerCase()).toBe(inputData.toLowerCase());
          
          // Property 10.2: No data should be lost in extraction
          const info = getFunctionCallInfo(inputData);
          const expectedLength = 10 + (parameters ? parameters.length : 0);
          expect(info.totalLength).toBe(expectedLength);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
