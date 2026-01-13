import { StarknetRPCClient } from '../services/rpc/StarknetRPCClient';

describe('StarknetRPCClient', () => {
  const client = new StarknetRPCClient('https://starknet-mainnet.public.blastapi.io');

  test('should get block number', async () => {
    const blockNumber = await client.getBlockNumber();
    expect(typeof blockNumber).toBe('bigint');
    expect(blockNumber).toBeGreaterThan(0n);
  }, 30000);

  test('should get latest block', async () => {
    const block = await client.getBlock('latest');
    expect(block).toBeDefined();
    expect(block.block_hash).toMatch(/^0x[0-9a-fA-F]+$/);
  }, 30000);
});
