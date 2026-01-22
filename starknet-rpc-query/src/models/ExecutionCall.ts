/**
 * ExecutionCall model representing function calls within transaction execution traces
 */
export interface ExecutionCall {
  callId: bigint;
  txHash: string;
  parentCallId?: bigint;
  contractAddress: string;
  classHash?: string;
  entryPointSelector?: string;
  entryPointName?: string;
  callerAddress?: string;
  callType: string;
  callDepth: number;
  callStatus: string;
  blockNumber: bigint;
  createdAt: Date;
}

export interface ExecutionCallCreateInput {
  txHash: string;
  parentCallId?: bigint;
  contractAddress: string;
  classHash?: string;
  entryPointSelector?: string;
  entryPointName?: string;
  callerAddress?: string;
  callType: string;
  callDepth: number;
  callStatus: string;
  blockNumber: bigint;
}

export interface ExecutionTrace {
  txHash: string;
  calls: ExecutionCall[];
}