/**
 * Event model representing blockchain events emitted during transaction execution
 */
export interface Event {
  eventId: bigint;
  txHash: string;
  contractAddress: string;
  eventSelector?: string;
  eventName?: string;
  indexedKeys: any;
  data: any;
  blockNumber: bigint;
  createdAt: Date;
}

export interface EventCreateInput {
  txHash: string;
  contractAddress: string;
  eventSelector?: string;
  eventName?: string;
  indexedKeys: any;
  data: any;
  blockNumber: bigint;
}

export interface EventFilter {
  contractAddress?: string;
  eventSelector?: string;
  fromBlock?: bigint;
  toBlock?: bigint;
  limit?: number;
}