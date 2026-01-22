export interface RPCRequest {
  jsonrpc: '2.0';
  method: string;
  params: any[];
  id: number;
}

export interface RPCResponse<T = any> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

export interface IRPCClient {
  call<T>(method: string, params?: any[]): Promise<T>;
  getBlockNumber(): Promise<bigint>;
  getBlock(blockId: string | bigint): Promise<any>;
}
