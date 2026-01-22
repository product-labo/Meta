/**
 * Wallet model representing wallet addresses and their activity tracking
 */
export interface Wallet {
  address: string;
  firstSeenBlock: bigint;
  lastSeenBlock: bigint;
  transactionCount: number;
  contractInteractionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletCreateInput {
  address: string;
  firstSeenBlock: bigint;
  lastSeenBlock: bigint;
  transactionCount?: number;
  contractInteractionCount?: number;
}

export interface WalletInteraction {
  interactionId: bigint;
  walletAddress: string;
  contractAddress: string;
  functionSelector: string;
  functionName?: string;
  txHash: string;
  blockNumber: bigint;
  timestamp: Date;
  createdAt: Date;
}

export interface WalletInteractionCreateInput {
  walletAddress: string;
  contractAddress: string;
  functionSelector: string;
  functionName?: string;
  txHash: string;
  blockNumber: bigint;
  timestamp: Date;
}