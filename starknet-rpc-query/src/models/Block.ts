import { Transaction } from './Transaction';

/**
 * Block model representing Starknet blockchain blocks
 */
export interface Block {
  blockNumber: bigint;
  blockHash: string;
  parentBlockHash: string;
  timestamp: Date;
  finalityStatus: 'pending' | 'accepted_on_l2' | 'accepted_on_l1';
  createdAt: Date;
  transactions?: Transaction[];
}

/**
 * Raw block data from RPC (snake_case)
 */
export interface RawBlock {
  block_number: number;
  block_hash: string;
  parent_hash: string;
  timestamp: number;
  transactions?: any[];
}

export interface BlockCreateInput {
  blockNumber: bigint;
  blockHash: string;
  parentBlockHash: string;
  timestamp: Date;
  finalityStatus: 'pending' | 'accepted_on_l2' | 'accepted_on_l1';
}

export type BlockIdentifier = string | bigint | 'latest' | 'pending';
