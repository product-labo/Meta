/**
 * Transaction model representing Starknet blockchain transactions
 */
export interface Transaction {
  txHash: string;
  blockNumber: bigint;
  txType: string;
  senderAddress: string;
  entryPointSelector?: string;
  calldataHash?: string;
  status: 'pending' | 'accepted_on_l2' | 'accepted_on_l1' | 'rejected';
  actualFee?: bigint;
  maxFee?: bigint;
  nonce?: bigint;
  version: string;
  createdAt: Date;
  events?: TransactionEvent[];
}

export interface TransactionCreateInput {
  txHash: string;
  blockNumber: bigint;
  txType: string;
  senderAddress: string;
  entryPointSelector?: string;
  calldataHash?: string;
  status: 'pending' | 'accepted_on_l2' | 'accepted_on_l1' | 'rejected';
  actualFee?: bigint;
  maxFee?: bigint;
  nonce?: bigint;
  version: string;
}

export interface TransactionReceipt {
  txHash: string;
  blockNumber: bigint;
  blockHash: string;
  status: 'pending' | 'accepted_on_l2' | 'accepted_on_l1' | 'rejected';
  actualFee?: bigint;
  events: TransactionEvent[];
  executionStatus: 'succeeded' | 'reverted';
  revertReason?: string;
}

export interface TransactionEvent {
  fromAddress: string;
  keys: string[];
  data: string[];
}
