export class RequestFormatter {
  static formatRequest(method: string, params: any[]): any {
    // Validate method name
    if (!method || typeof method !== 'string') {
      throw new Error('Invalid method: must be a non-empty string');
    }

    if (!method.startsWith('starknet_')) {
      throw new Error(`Invalid method: ${method} must start with 'starknet_'`);
    }

    // Validate and format parameters
    const formattedParams = this.formatParams(method, params);

    return {
      jsonrpc: '2.0',
      method,
      params: formattedParams,
      id: Date.now()
    };
  }

  static validateParams(method: string, params: any[]): boolean {
    try {
      this.formatParams(method, params);
      return true;
    } catch {
      return false;
    }
  }

  private static formatParams(method: string, params: any[]): any[] {
    switch (method) {
      case 'starknet_blockNumber':
        return [];
      
      case 'starknet_getBlockWithTxs':
        if (params.length !== 1) {
          throw new Error('getBlockWithTxs requires exactly 1 parameter');
        }
        return [this.formatBlockId(params[0])];
      
      case 'starknet_getTransactionByHash':
      case 'starknet_getTransactionReceipt':
      case 'starknet_traceTransaction':
        if (params.length !== 1) {
          throw new Error(`${method} requires exactly 1 parameter`);
        }
        return [this.formatTxHash(params[0])];
      
      case 'starknet_getClass':
        if (params.length !== 1) {
          throw new Error('getClass requires exactly 1 parameter');
        }
        return [this.formatClassHash(params[0])];
      
      case 'starknet_getStorageAt':
        if (params.length < 2 || params.length > 3) {
          throw new Error('getStorageAt requires 2-3 parameters');
        }
        const result = [
          this.formatAddress(params[0]),
          this.formatStorageKey(params[1])
        ];
        if (params.length === 3) {
          result.push(this.formatBlockId(params[2]));
        }
        return result;
      
      default:
        return params; // Pass through for unknown methods
    }
  }

  private static formatBlockId(blockId: any): string {
    if (typeof blockId === 'string') {
      if (blockId === 'latest' || blockId === 'pending') {
        return blockId;
      }
      if (blockId.startsWith('0x')) {
        return blockId;
      }
      return `0x${parseInt(blockId).toString(16)}`;
    }
    if (typeof blockId === 'bigint' || typeof blockId === 'number') {
      return `0x${blockId.toString(16)}`;
    }
    throw new Error(`Invalid block ID: ${blockId}`);
  }

  private static formatTxHash(hash: any): string {
    if (typeof hash !== 'string') {
      throw new Error('Transaction hash must be a string');
    }
    if (!hash.startsWith('0x') || hash.length !== 66) {
      throw new Error('Invalid transaction hash format');
    }
    return hash;
  }

  private static formatClassHash(hash: any): string {
    if (typeof hash !== 'string') {
      throw new Error('Class hash must be a string');
    }
    if (!hash.startsWith('0x') || hash.length !== 66) {
      throw new Error('Invalid class hash format');
    }
    return hash;
  }

  private static formatAddress(address: any): string {
    if (typeof address !== 'string') {
      throw new Error('Address must be a string');
    }
    if (!address.startsWith('0x') || address.length !== 66) {
      throw new Error('Invalid address format');
    }
    return address;
  }

  private static formatStorageKey(key: any): string {
    if (typeof key !== 'string') {
      throw new Error('Storage key must be a string');
    }
    if (!key.startsWith('0x')) {
      return `0x${key}`;
    }
    return key;
  }
}
