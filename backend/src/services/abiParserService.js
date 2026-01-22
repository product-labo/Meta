/**
 * ABI Parser Service
 * 
 * Parses contract ABIs (JSON and human-readable formats) and extracts:
 * - Function signatures and selectors
 * - Event signatures and topics
 * - Function categorization (swap, bridge, transfer, custom)
 * 
 * Requirements: 8.1, 8.2
 */

import { ethers } from 'ethers';
import { performancePool, abiCache, monitoredQuery } from '../config/performanceConfig.js';

export class ABIParserService {
  /**
   * Parse ABI from JSON format or human-readable format
   * @param {string | Array | Object} abi - ABI as JSON string, array, or human-readable string array
   * @returns {Promise<{functions: Array, events: Array}>} Parsed contract features
   */
  async parseABI(abi) {
    let parsedABI;

    try {
      // Handle string input (JSON format)
      if (typeof abi === 'string') {
        parsedABI = JSON.parse(abi);
      }
      // Handle array input (already parsed JSON or human-readable)
      else if (Array.isArray(abi)) {
        // Check if it's human-readable format (array of strings)
        if (abi.length > 0 && typeof abi[0] === 'string') {
          // Parse human-readable format using ethers
          const iface = new ethers.Interface(abi);
          parsedABI = iface.fragments.map(fragment => fragment.format('json'));
          parsedABI = parsedABI.map(f => JSON.parse(f));
        } else {
          parsedABI = abi;
        }
      }
      // Handle object input (single ABI item)
      else if (typeof abi === 'object' && abi !== null) {
        parsedABI = [abi];
      }
      else {
        throw new Error('Invalid ABI format: must be string, array, or object');
      }
    } catch (error) {
      throw new Error(`Failed to parse ABI: ${error.message}`);
    }

    // Extract functions and events
    const functions = await this.extractFunctions(parsedABI);
    const events = await this.extractEvents(parsedABI);

    return {
      functions,
      events
    };
  }

  /**
   * Extract function signatures from parsed ABI
   * @param {Array} abi - Parsed ABI array
   * @returns {Promise<Array>} Array of function signatures
   */
  async extractFunctions(abi) {
    const functions = [];

    for (const item of abi) {
      if (item.type === 'function' && item.name) {
        try {
          // Create function signature string
          const inputTypes = (item.inputs || []).map((input) => input.type).join(',');
          const signatureString = `${item.name}(${inputTypes})`;
          
          // Calculate selector (first 4 bytes of keccak256 hash)
          const selector = ethers.id(signatureString).substring(0, 10);

          // Parse inputs and outputs
          const inputs = this.parseParameters(item.inputs || []);
          const outputs = this.parseParameters(item.outputs || []);

          // Determine state mutability
          const stateMutability = item.stateMutability || 'nonpayable';

          // Categorize function
          const category = this.categorizeFunction(item.name, inputs);

          functions.push({
            name: item.name,
            selector,
            inputs,
            outputs,
            stateMutability,
            category
          });
        } catch (error) {
          console.error(`Failed to parse function ${item.name}:`, error);
          // Continue processing other functions
        }
      }
    }

    return functions;
  }

  /**
   * Extract event signatures from parsed ABI
   * @param {Array} abi - Parsed ABI array
   * @returns {Promise<Array>} Array of event signatures
   */
  async extractEvents(abi) {
    const events = [];

    for (const item of abi) {
      if (item.type === 'event' && item.name) {
        try {
          // Create event signature string
          const inputTypes = (item.inputs || []).map((input) => input.type).join(',');
          const signatureString = `${item.name}(${inputTypes})`;
          
          // Calculate topic (keccak256 hash of signature)
          const topic = ethers.id(signatureString);

          // Parse inputs
          const inputs = this.parseParameters(item.inputs || []);

          events.push({
            name: item.name,
            signature: signatureString,
            topic,
            inputs
          });
        } catch (error) {
          console.error(`Failed to parse event ${item.name}:`, error);
          // Continue processing other events
        }
      }
    }

    return events;
  }

  /**
   * Parse parameter definitions from ABI
   * @param {Array} params - Array of parameter definitions
   * @returns {Array} Array of parsed parameters
   */
  parseParameters(params) {
    return params.map(param => {
      const parameter = {
        name: param.name || '',
        type: param.type,
        indexed: param.indexed || false
      };

      // Handle tuple types (structs)
      if (param.components && Array.isArray(param.components)) {
        parameter.components = this.parseParameters(param.components);
      }

      return parameter;
    });
  }

  /**
   * Categorize function based on name and inputs
   * @param {string} name - Function name
   * @param {Array} inputs - Function inputs
   * @returns {string} Function category
   */
  categorizeFunction(name, inputs) {
    if (!name || typeof name !== 'string') {
      return 'custom';
    }
    const lowerName = name.toLowerCase();

    // Swap functions
    const swapKeywords = ['swap', 'exchange', 'trade'];
    if (swapKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'swap';
    }

    // Bridge functions
    const bridgeKeywords = ['bridge', 'lock', 'unlock', 'deposit', 'withdraw', 'relay'];
    if (bridgeKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'bridge';
    }

    // Transfer functions
    const transferKeywords = ['transfer', 'send', 'mint', 'burn'];
    if (transferKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'transfer';
    }

    // Default to custom
    return 'custom';
  }

  /**
   * Store parsed ABI features in database
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   * @param {{functions: Array, events: Array}} features - Parsed contract features
   */
  async storeABIFeatures(contractAddress, chain, features) {
    const client = await performancePool.connect();

    try {
      await client.query('BEGIN');

      // Store functions
      for (const func of features.functions) {
        await client.query(
          `INSERT INTO contract_abi_features (
            contract_address, chain, feature_type, name, signature, selector,
            category, inputs, outputs, state_mutability
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (contract_address, chain, selector) 
          DO UPDATE SET
            name = EXCLUDED.name,
            signature = EXCLUDED.signature,
            category = EXCLUDED.category,
            inputs = EXCLUDED.inputs,
            outputs = EXCLUDED.outputs,
            state_mutability = EXCLUDED.state_mutability`,
          [
            contractAddress,
            chain,
            'function',
            func.name,
            `${func.name}(${func.inputs.map(i => i.type).join(',')})`,
            func.selector,
            func.category,
            JSON.stringify(func.inputs),
            JSON.stringify(func.outputs),
            func.stateMutability
          ]
        );
      }

      // Store events
      for (const event of features.events) {
        await client.query(
          `INSERT INTO contract_abi_features (
            contract_address, chain, feature_type, name, signature, selector,
            inputs
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (contract_address, chain, selector) 
          DO UPDATE SET
            name = EXCLUDED.name,
            signature = EXCLUDED.signature,
            inputs = EXCLUDED.inputs`,
          [
            contractAddress,
            chain,
            'event',
            event.name,
            event.signature,
            event.topic,
            JSON.stringify(event.inputs)
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to store ABI features: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get stored ABI features for a contract
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   * @returns {Promise<{functions: Array, events: Array}>} Stored contract features
   */
  async getABIFeatures(contractAddress, chain) {
    const result = await monitoredQuery(
      `SELECT * FROM contract_abi_features 
       WHERE contract_address = $1 AND chain = $2
       ORDER BY feature_type, name`,
      [contractAddress, chain]
    );

    const functions = [];
    const events = [];

    for (const row of result.rows) {
      if (row.feature_type === 'function') {
        functions.push({
          name: row.name,
          selector: row.selector,
          inputs: row.inputs,
          outputs: row.outputs,
          stateMutability: row.state_mutability,
          category: row.category
        });
      } else if (row.feature_type === 'event') {
        events.push({
          name: row.name,
          signature: row.signature,
          topic: row.selector,
          inputs: row.inputs
        });
      }
    }

    return { functions, events };
  }
}

export const abiParserService = new ABIParserService();
