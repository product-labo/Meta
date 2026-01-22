import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export interface ChainConfig {
  name: string;
  type: 'evm' | 'starknet';
  addressLength: number;
  addressPrefix?: string;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
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
export const validateAddress = (address: string, chain: string): { valid: boolean; error?: string } => {
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
export const detectChainType = (address: string): 'evm' | 'starknet' | null => {
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

/**
 * Middleware to validate wallet address in request body
 */
export const validateWalletAddress = (req: Request, res: Response, next: NextFunction) => {
  const { address, chain } = req.body;

  if (!address) {
    return res.status(400).json({
      status: 'error',
      data: { error: 'Address is required' }
    });
  }

  if (!chain) {
    return res.status(400).json({
      status: 'error',
      data: { error: 'Chain is required' }
    });
  }

  const validation = validateAddress(address, chain);
  if (!validation.valid) {
    return res.status(400).json({
      status: 'error',
      data: { error: validation.error }
    });
  }

  next();
};

/**
 * Middleware to validate project ownership
 */
export const validateProjectOwnership = async (req: Request, res: Response, next: NextFunction) => {
  const { projectId } = req.params;
  
  if (!req.user?.id) {
    return res.status(401).json({
      status: 'error',
      data: { error: 'User not authenticated' }
    });
  }

  try {
    const { pool } = await import('../config/database.js');
    const result = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        data: { error: 'Project not found or unauthorized' }
      });
    }

    next();
  } catch (error) {
    console.error('Project ownership validation error:', error);
    return res.status(500).json({
      status: 'error',
      data: { error: 'Failed to validate project ownership' }
    });
  }
};