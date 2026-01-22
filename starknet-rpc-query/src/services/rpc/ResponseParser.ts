export class ResponseParser {
  static parseResponse<T>(response: any): T {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response: must be an object');
    }

    if (response.jsonrpc !== '2.0') {
      throw new Error('Invalid response: missing or invalid jsonrpc version');
    }

    if (response.error) {
      throw new Error(`RPC Error: ${response.error.message} (Code: ${response.error.code})`);
    }

    if (!('result' in response)) {
      throw new Error('Invalid response: missing result field');
    }

    return response.result;
  }

  static validateResponse(response: any, schema?: any): boolean {
    try {
      this.parseResponse(response);
      
      if (schema) {
        return this.validateAgainstSchema(response.result, schema);
      }
      
      return true;
    } catch {
      return false;
    }
  }

  static parseBlockchainFormat(value: string, type: 'hex' | 'address' | 'hash'): string {
    if (typeof value !== 'string') {
      throw new Error(`Invalid ${type}: must be a string`);
    }

    switch (type) {
      case 'hex':
        return this.parseHex(value);
      case 'address':
        return this.parseAddress(value);
      case 'hash':
        return this.parseHash(value);
      default:
        throw new Error(`Unknown format type: ${type}`);
    }
  }

  static parseBlockResponse(response: any): any {
    const result = this.parseResponse(response) as any;
    
    if (!result.block_hash || !result.block_number) {
      throw new Error('Invalid block response: missing required fields');
    }

    return {
      ...result,
      block_number: this.parseHex(result.block_number),
      block_hash: this.parseHash(result.block_hash),
      parent_hash: result.parent_hash ? this.parseHash(result.parent_hash) : null,
      timestamp: result.timestamp ? parseInt(result.timestamp) : null,
      transactions: result.transactions || []
    };
  }

  static parseTransactionResponse(response: any): any {
    const result = this.parseResponse(response) as any;
    
    if (!result.transaction_hash) {
      throw new Error('Invalid transaction response: missing transaction_hash');
    }

    return {
      ...result,
      transaction_hash: this.parseHash(result.transaction_hash),
      block_hash: result.block_hash ? this.parseHash(result.block_hash) : null,
      block_number: result.block_number ? this.parseHex(result.block_number) : null,
      sender_address: result.sender_address ? this.parseAddress(result.sender_address) : null
    };
  }

  static parseContractClassResponse(response: any): any {
    const result = this.parseResponse(response) as any;
    
    return {
      ...result,
      class_hash: result.class_hash ? this.parseHash(result.class_hash) : null,
      abi: result.abi || []
    };
  }

  private static parseHex(value: string): string {
    if (!value.startsWith('0x')) {
      throw new Error('Invalid hex format: must start with 0x');
    }
    
    // Validate hex characters
    if (!/^0x[0-9a-fA-F]*$/.test(value)) {
      throw new Error('Invalid hex format: contains non-hex characters');
    }
    
    return value.toLowerCase();
  }

  private static parseAddress(value: string): string {
    const hex = this.parseHex(value);
    
    if (hex.length !== 66) {
      throw new Error('Invalid address format: must be 66 characters (0x + 64 hex chars)');
    }
    
    return hex;
  }

  private static parseHash(value: string): string {
    const hex = this.parseHex(value);
    
    if (hex.length !== 66) {
      throw new Error('Invalid hash format: must be 66 characters (0x + 64 hex chars)');
    }
    
    return hex;
  }

  private static validateAgainstSchema(data: any, schema: any): boolean {
    // Basic schema validation - can be extended with more sophisticated validation
    if (schema.type) {
      switch (schema.type) {
        case 'string':
          return typeof data === 'string';
        case 'number':
          return typeof data === 'number';
        case 'object':
          return typeof data === 'object' && data !== null;
        case 'array':
          return Array.isArray(data);
        default:
          return true;
      }
    }
    
    return true;
  }
}
