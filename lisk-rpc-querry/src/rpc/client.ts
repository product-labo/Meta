import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface RPCRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

export interface RPCResponse<T = any> {
  jsonrpc: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

export class RpcClient {
  private rpcUrls: string[];
  private currentUrlIndex: number = 0;
  private requestId: number = 1;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private timeout: number;

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
    this.rpcUrls = this.loadRpcUrls();
  }

  private loadRpcUrls(): string[] {
    const urls = [
      process.env.LISK_MAINNET_RPC,
      process.env.LISK_SEPOLIA_RPC,
      // Skip LISK_RPC_ENDPOINT as it's not working
      // process.env.LISK_RPC_ENDPOINT,
    ].filter(Boolean) as string[];
    
    if (urls.length === 0) {
      throw new Error('No RPC URLs found in environment variables');
    }
    
    return urls;
  }

  private createClient(url: string): AxiosInstance {
    return axios.create({
      baseURL: url,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async makeRequest<T>(method: string, params: any[] = []): Promise<T> {
    const request: RPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.requestId++,
    };

    let lastError: Error | null = null;

    // Try each RPC URL
    for (let urlIndex = 0; urlIndex < this.rpcUrls.length; urlIndex++) {
      const currentUrl = this.rpcUrls[(this.currentUrlIndex + urlIndex) % this.rpcUrls.length];
      const client = this.createClient(currentUrl);

      // Retry attempts for current URL
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const response: AxiosResponse<RPCResponse<T>> = await client.post('', request);
          
          if (response.data.error) {
            throw new Error(`RPC Error: ${response.data.error.message}`);
          }

          // Success - update current URL index for next request
          this.currentUrlIndex = (this.currentUrlIndex + urlIndex) % this.rpcUrls.length;
          return response.data.result!;
        } catch (error) {
          lastError = error as Error;
          if (attempt < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
          }
        }
      }
    }

    throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message}`);
  }

  async getCurrentBlockNumber(): Promise<number> {
    const result = await this.makeRequest<string>('eth_blockNumber');
    return parseInt(result, 16);
  }

  async getBlockByNumber(blockNumber: number | string, includeTransactions: boolean = true): Promise<any> {
    const blockParam = typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber;
    return this.makeRequest('eth_getBlockByNumber', [blockParam, includeTransactions]);
  }

  async getTransactionByHash(txHash: string): Promise<any> {
    return this.makeRequest('eth_getTransactionByHash', [txHash]);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    return this.makeRequest('eth_getTransactionReceipt', [txHash]);
  }

  async getLogs(filter: any): Promise<any[]> {
    return this.makeRequest<any[]>('eth_getLogs', [filter]);
  }

  async getCode(address: string, blockNumber: string = 'latest'): Promise<string> {
    return this.makeRequest<string>('eth_getCode', [address, blockNumber]);
  }

  async getStorageAt(address: string, slot: string, blockNumber: string = 'latest'): Promise<string> {
    return this.makeRequest<string>('eth_getStorageAt', [address, slot, blockNumber]);
  }

  async debugTraceTransaction(txHash: string): Promise<any> {
    return this.makeRequest('debug_traceTransaction', [txHash, { tracer: 'callTracer' }]);
  }

  async debugTraceBlockByNumber(blockNumber: number): Promise<any> {
    const blockParam = `0x${blockNumber.toString(16)}`;
    return this.makeRequest('debug_traceBlockByNumber', [blockParam, { tracer: 'callTracer' }]);
  }

  async batchRequest(requests: Array<{ method: string; params: any[] }>): Promise<any[]> {
    const batchRequests = requests.map(req => ({
      jsonrpc: '2.0',
      method: req.method,
      params: req.params,
      id: this.requestId++,
    }));

    let lastError: Error | null = null;

    // Try each RPC URL for batch requests
    for (let urlIndex = 0; urlIndex < this.rpcUrls.length; urlIndex++) {
      const currentUrl = this.rpcUrls[(this.currentUrlIndex + urlIndex) % this.rpcUrls.length];
      const client = this.createClient(currentUrl);

      try {
        const response: AxiosResponse<RPCResponse[]> = await client.post('', batchRequests);
        
        // Check for errors in batch response
        const results = response.data.map(res => {
          if (res.error) {
            throw new Error(`RPC Error: ${res.error.message}`);
          }
          return res.result;
        });

        // Success - update current URL index
        this.currentUrlIndex = (this.currentUrlIndex + urlIndex) % this.rpcUrls.length;
        return results;
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw new Error(`All RPC endpoints failed for batch request. Last error: ${lastError?.message}`);
  }

  // Get current active RPC URL
  getCurrentRpcUrl(): string {
    return this.rpcUrls[this.currentUrlIndex];
  }

  // Get all available RPC URLs
  getAllRpcUrls(): string[] {
    return [...this.rpcUrls];
  }
}
