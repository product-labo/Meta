/**
 * Property-based tests for Signature Database Consistency
 * **Feature: universal-smart-contract-indexer, Property 8: Signature Database Consistency**
 * 
 * Tests universal properties that should hold across all signature database operations
 * **Validates: Requirements 21.1**
 */

import fc from 'fast-check';
import { SignatureDatabase } from '../../indexer/utils/signatureDatabase.js';

// Helper generators
const hexChar = () => fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
const hexString = (length) => fc.array(hexChar(), { minLength: length, maxLength: length }).map(arr => arr.join(''));
const functionSelector = () => hexString(8).map(s => '0x' + s);

const signatureInfo = () => fc.record({
  signature: fc.oneof(
    fc.constant('transfer(address,uint256)'),
    fc.constant('approve(address,uint256)'),
    fc.constant('balanceOf(address)'),
    fc.constant('transferFrom(address,address,uint256)')
  ),
  category: fc.constantFrom('erc20', 'erc721', 'dex', 'lending'),
  source: fc.constantFrom('manual', '4byte.directory', 'local')
});

describe('Signature Database Consistency Properties', () => {
  let db;

  beforeEach(() => {
    // Create fresh database instance for each test
    db = new SignatureDatabase();
    db.loaded = true; // Mark as loaded to skip file loading
  });

  /**
   * **Feature: universal-smart-contract-indexer, Property 8: Signature Database Consistency**
   * **Validates: Requirements 21.1**
   * 
   * For any function selector, querying the signature database should return 
   * consistent results across multiple queries
   */
  test('Property 1: For any selector, multiple queries should return identical results', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        signatureInfo(),
        (selector, info) => {
          // Add signature to database
          db.addSignature(selector, info);
          
          // Query multiple times
          const result1 = db.getSignature(selector);
          const result2 = db.getSignature(selector);
          const result3 = db.getSignature(selector);
          
          // Property 1.1: All results should be identical
          expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
          expect(JSON.stringify(result2)).toBe(JSON.stringify(result3));
          
          // Property 1.2: Results should match what was added
          expect(result1.signature).toBe(info.signature);
          expect(result1.category).toBe(info.category);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: For any selector, case normalization should be consistent
   */
  test('Property 2: For any selector, case should not affect lookup results', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        signatureInfo(),
        (selector, info) => {
          // Add signature
          db.addSignature(selector, info);
          
          // Query with different cases
          const lowerResult = db.getSignature(selector.toLowerCase());
          const upperResult = db.getSignature(selector.toUpperCase());
          const mixedResult = db.getSignature(selector);
          
          // Property 2.1: All should return same result
          expect(JSON.stringify(lowerResult)).toBe(JSON.stringify(upperResult));
          expect(JSON.stringify(upperResult)).toBe(JSON.stringify(mixedResult));
          
          // Property 2.2: All should match original info
          expect(lowerResult.signature).toBe(info.signature);
          expect(upperResult.signature).toBe(info.signature);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: For any selector, hasSignature should be consistent with getSignature
   */
  test('Property 3: For any selector, hasSignature should match getSignature result', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        signatureInfo(),
        (selector, info) => {
          // Add signature
          db.addSignature(selector, info);
          
          // Property 3.1: hasSignature should return true
          expect(db.hasSignature(selector)).toBe(true);
          
          // Property 3.2: getSignature should not return null
          expect(db.getSignature(selector)).not.toBeNull();
          
          // Property 3.3: Consistency check
          const hasIt = db.hasSignature(selector);
          const gotIt = db.getSignature(selector) !== null;
          expect(hasIt).toBe(gotIt);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: For any unknown selector, queries should consistently return null
   */
  test('Property 4: For any unknown selector, all queries should return null', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        (unknownSelector) => {
          // Don't add this selector to database
          
          // Property 4.1: getSignature should return null
          expect(db.getSignature(unknownSelector)).toBeNull();
          
          // Property 4.2: hasSignature should return false
          expect(db.hasSignature(unknownSelector)).toBe(false);
          
          // Property 4.3: getFunctionSignature should return null
          expect(db.getFunctionSignature(unknownSelector)).toBeNull();
          
          // Property 4.4: getCategory should return null
          expect(db.getCategory(unknownSelector)).toBeNull();
          
          // Property 4.5: Multiple queries should be consistent
          expect(db.getSignature(unknownSelector)).toBe(db.getSignature(unknownSelector));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: For any selector, getFunctionSignature should extract signature correctly
   */
  test('Property 5: For any selector, getFunctionSignature should match stored signature', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        signatureInfo(),
        (selector, info) => {
          // Add signature
          db.addSignature(selector, info);
          
          // Property 5.1: getFunctionSignature should return the signature
          const sig = db.getFunctionSignature(selector);
          expect(sig).toBe(info.signature);
          
          // Property 5.2: Multiple calls should be consistent
          expect(db.getFunctionSignature(selector)).toBe(db.getFunctionSignature(selector));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: For any selector, getCategory should return correct category
   */
  test('Property 6: For any selector, getCategory should match stored category', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        signatureInfo(),
        (selector, info) => {
          // Add signature
          db.addSignature(selector, info);
          
          // Property 6.1: getCategory should return the category
          const category = db.getCategory(selector);
          expect(category).toBe(info.category);
          
          // Property 6.2: Multiple calls should be consistent
          expect(db.getCategory(selector)).toBe(db.getCategory(selector));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: For any selector, getFunctionName should extract name correctly
   */
  test('Property 7: For any selector, getFunctionName should extract function name', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        signatureInfo(),
        (selector, info) => {
          // Add signature
          db.addSignature(selector, info);
          
          // Extract expected name (before first parenthesis)
          const expectedName = info.signature.split('(')[0];
          
          // Property 7.1: getFunctionName should return correct name
          const name = db.getFunctionName(selector);
          expect(name).toBe(expectedName);
          
          // Property 7.2: Multiple calls should be consistent
          expect(db.getFunctionName(selector)).toBe(db.getFunctionName(selector));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: For any batch of selectors, batch lookup should match individual lookups
   */
  test('Property 8: For any batch of selectors, batch results should match individual queries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            selector: functionSelector(),
            info: signatureInfo()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (entries) => {
          // Add all signatures
          entries.forEach(({ selector, info }) => {
            db.addSignature(selector, info);
          });
          
          // Get selectors
          const selectors = entries.map(e => e.selector);
          
          // Batch lookup
          const batchResults = db.batchGetSignatures(selectors);
          
          // Property 8.1: Batch should return all selectors
          expect(batchResults.size).toBe(selectors.length);
          
          // Property 8.2: Each batch result should match individual lookup
          for (const selector of selectors) {
            const individual = db.getSignature(selector);
            const batched = batchResults.get(selector);
            expect(JSON.stringify(batched)).toBe(JSON.stringify(individual));
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: For any category, getSignaturesByCategory should return all matching signatures
   */
  test('Property 9: For any category, all returned signatures should match that category', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            selector: functionSelector(),
            info: signatureInfo()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (entries) => {
          // Add all signatures
          entries.forEach(({ selector, info }) => {
            db.addSignature(selector, info);
          });
          
          // Get all categories
          const categories = db.getCategories();
          
          // Property 9.1: For each category, all results should match
          for (const category of categories) {
            const results = db.getSignaturesByCategory(category);
            
            // All results should have the correct category
            for (const result of results) {
              expect(result.category).toBe(category);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: For any selector update, cache should be invalidated
   */
  test('Property 10: For any selector update, subsequent queries should return new value', () => {
    fc.assert(
      fc.property(
        functionSelector(),
        signatureInfo(),
        signatureInfo(),
        (selector, info1, info2) => {
          // Add first signature
          db.addSignature(selector, info1);
          const result1 = db.getSignature(selector);
          
          // Update with second signature
          db.addSignature(selector, info2);
          const result2 = db.getSignature(selector);
          
          // Property 10.1: Results should be different if info is different
          if (info1.signature !== info2.signature) {
            expect(result1.signature).not.toBe(result2.signature);
          }
          
          // Property 10.2: Second result should match second info
          expect(result2.signature).toBe(info2.signature);
          expect(result2.category).toBe(info2.category);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: For any set of selectors, getUnknownSelectors should identify unknowns correctly
   */
  test('Property 11: For any set of selectors, getUnknownSelectors should be accurate', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            selector: functionSelector(),
            info: signatureInfo(),
            shouldAdd: fc.boolean()
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (entries) => {
          // Add only some signatures
          const knownSelectors = [];
          const unknownSelectors = [];
          
          entries.forEach(({ selector, info, shouldAdd }) => {
            if (shouldAdd) {
              db.addSignature(selector, info);
              knownSelectors.push(selector);
            } else {
              unknownSelectors.push(selector);
            }
          });
          
          // Get all selectors
          const allSelectors = entries.map(e => e.selector);
          
          // Get unknown selectors
          const foundUnknown = db.getUnknownSelectors(allSelectors);
          
          // Property 11.1: All unknown selectors should be in the result
          for (const unknown of unknownSelectors) {
            expect(foundUnknown).toContain(unknown);
          }
          
          // Property 11.2: No known selectors should be in the result
          for (const known of knownSelectors) {
            expect(foundUnknown).not.toContain(known);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: For any search term, searchByName should return matching signatures
   */
  test('Property 12: For any search term, all results should contain the search term', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            selector: functionSelector(),
            info: signatureInfo()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom('transfer', 'approve', 'balance'),
        (entries, searchTerm) => {
          // Add all signatures
          entries.forEach(({ selector, info }) => {
            db.addSignature(selector, info);
          });
          
          // Search
          const results = db.searchByName(searchTerm);
          
          // Property 12.1: All results should contain search term (case-insensitive)
          for (const result of results) {
            expect(result.signature.toLowerCase()).toContain(searchTerm.toLowerCase());
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
