/**
 * JavaScript version of validation functions for testing
 */

export const SUPPORTED_CHAINS = {
  'ethereum': { name: 'Ethereum', type: 'evm', addressLength: 42, addressPrefix: '0x' },
  'polygon': { name: 'Polygon', type: 'evm', addressLength: 42, addressPrefix: '0x' },
  'lisk': { name: 'Lisk', type: 'evm', addressLength: 42, addressPrefix: '0x' },
  'arbitrum': { name: 'Arbitrum', type: 'evm', addressLength: 42, addressPrefix: '0x' },
  'optimism': { name: 'Optimism', type: 'evm', addressLength: 42, addressPrefix: '0x' },
  'bsc': { name: 'BSC', type: 'evm', addressLength: 42, addressPrefix: '0x' },
  'starknet-mainnet': { name: 'Starknet Mainnet', type: 'starknet', addressLength: 66, addressPrefix: '0x' },
  'starknet-sepolia': { name: 'Starknet Sepolia', type: 'starknet', addressLength: 66, addressPrefix: '0x' }
};

/**
 * Validates wallet address format based on chain type
 */
export const validateAddress = (address, chain) => {
  if (!address) {
    return { valid: false, error: 'Address is required' };
  }

  const chainConfig = SUPPORTED_CHAINS[chain];
  if (!chainConfig) {
    return { valid: false, error: `Unsupported chain: ${chain}` };
  }

  // Check if address starts with required prefix
  if (chainConfig.addressPrefix && !address.startsWith(chainConfig.addressPrefix)) {
    const example = chainConfig.type === 'evm' 
      ? '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
      : '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    return { 
      valid: false, 
      error: `Address must start with ${chainConfig.addressPrefix}. Example: ${example}` 
    };
  }

  // Check address length
  if (address.length !== chainConfig.addressLength) {
    const example = chainConfig.type === 'evm' 
      ? '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
      : '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    return { 
      valid: false, 
      error: `${chainConfig.name} address must be ${chainConfig.addressLength} characters long. Example: ${example}` 
    };
  }

  // Check if address is valid hexadecimal (after 0x prefix)
  const hexPart = address.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    const example = chainConfig.type === 'evm' 
      ? '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
      : '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    return { 
      valid: false, 
      error: `Address must contain only hexadecimal characters (0-9, a-f, A-F). Example: ${example}` 
    };
  }

  return { valid: true };
};

/**
 * Detects chain type based on address format
 */
export const detectChainType = (address) => {
  if (!address || !address.startsWith('0x')) {
    return null;
  }

  // EVM addresses are 42 characters (0x + 40 hex chars)
  if (address.length === 42) {
    return 'evm';
  }

  // Starknet addresses are typically 66 characters (0x + 64 hex chars)
  if (address.length >= 64) {
    return 'starknet';
  }

  return null;
};