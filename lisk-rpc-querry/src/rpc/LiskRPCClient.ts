import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.LISK_MAINNET_RPC || 'https://rpc.api.lisk.com';

export class LiskRPCClient {
  private rpcUrl: string;

  constructor(rpcUrl: string = RPC_URL) {
    this.rpcUrl = rpcUrl;
  }

  async call(method: string, params: any[] = []): Promise<any> {
    const response = await axios.post(this.rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });

    if (response.data.error) {
      throw new Error(`RPC Error: ${response.data.error.message}`);
    }

    return response.data.result;
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.call('eth_blockNumber');
    return parseInt(result, 16);
  }

  async getBlockByNumber(blockNumber: number, fullTx: boolean = true): Promise<any> {
    const blockHex = '0x' + blockNumber.toString(16);
    return await this.call('eth_getBlockByNumber', [blockHex, fullTx]);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    return await this.call('eth_getTransactionReceipt', [txHash]);
  }
}

export const rpcClient = new LiskRPCClient();
