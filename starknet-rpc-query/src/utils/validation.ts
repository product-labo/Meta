import { ValidationError } from './errors';

/**
 * Validation utilities for Starknet-specific data formats
 */

/**
 * Validate Starknet address format
 */
export function validateStarknetAddress(address: string): boolean {
  if (!address) return false;
  
  // Starknet addresses are 32-byte hex strings with 0x prefix
  const addressRegex = /^0x[0-9a-fA-F]{1,64}$/;
  return addressRegex.test(address);
}

/**
 * Validate Starknet hash format (transaction hash, block hash, etc.)
 */
export function validateStarknetHash(hash: string): boolean {
  if (!hash) return false;
  
  // Starknet hashes are 32-byte hex strings with 0x prefix
  const hashRegex = /^0x[0-9a-fA-F]{64}$/;
  return hashRegex.test(hash);
}

/**
 * Validate hex string format
 */
export function validateHexString(hex: string): boolean {
  if (!hex) return false;
  
  const hexRegex = /^0x[0-9a-fA-F]+$/;
  return hexRegex.test(hex);
}

/**
 * Validate block number
 */
export function validateBlockNumber(blockNumber: bigint): boolean {
  return blockNumber >= 0n;
}

/**
 * Validate RPC endpoint URL
 */
export function validateRPCEndpoint(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate and normalize Starknet address
 */
export function normalizeStarknetAddress(address: string): string {
  if (!validateStarknetAddress(address)) {
    throw new ValidationError(`Invalid Starknet address format: ${address}`, 'address', address);
  }
  
  // Ensure address is lowercase and properly padded
  return address.toLowerCase().padEnd(66, '0');
}

/**
 * Validate and normalize Starknet hash
 */
export function normalizeStarknetHash(hash: string): string {
  if (!validateStarknetHash(hash)) {
    throw new ValidationError(`Invalid Starknet hash format: ${hash}`, 'hash', hash);
  }
  
  return hash.toLowerCase();
}

/**
 * Validate RPC method parameters
 */
export function validateRPCParams(method: string, params: any[]): void {
  switch (method) {
    case 'starknet_getBlockWithTxHashes':
    case 'starknet_getBlockWithTxs':
      if (params.length !== 1) {
        throw new ValidationError(`Method ${method} requires exactly 1 parameter`);
      }
      break;
      
    case 'starknet_getTransactionByHash':
    case 'starknet_getTransactionReceipt':
      if (params.length !== 1 || !validateStarknetHash(params[0])) {
        throw new ValidationError(`Method ${method} requires a valid transaction hash`);
      }
      break;
      
    case 'starknet_getStorageAt':
      if (params.length !== 3) {
        throw new ValidationError(`Method ${method} requires exactly 3 parameters`);
      }
      if (!validateStarknetAddress(params[0])) {
        throw new ValidationError(`Invalid contract address: ${params[0]}`);
      }
      if (!validateHexString(params[1])) {
        throw new ValidationError(`Invalid storage key: ${params[1]}`);
      }
      break;
      
    default:
      // Allow other methods without specific validation
      break;
  }
}

/**
 * Validate database connection parameters
 */
export function validateDatabaseConfig(config: any): void {
  if (!config.host) {
    throw new ValidationError('Database host is required');
  }
  
  if (!config.port || config.port <= 0 || config.port > 65535) {
    throw new ValidationError('Valid database port is required');
  }
  
  if (!config.name) {
    throw new ValidationError('Database name is required');
  }
  
  if (!config.user) {
    throw new ValidationError('Database user is required');
  }
}