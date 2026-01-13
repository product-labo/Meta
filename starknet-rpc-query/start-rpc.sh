#!/bin/bash
cd /mnt/c/pr0/meta/starknet-rpc-query && node -e "
const axios = require('axios');
const express = require('express');

const app = express();
app.use(express.json());

class SimpleRPCClient {
  constructor(url) { this.url = url; }
  async makeRequest(method, params = []) {
    const response = await axios.post(this.url, {
      jsonrpc: '2.0', method, params, id: Date.now()
    });
    return response.data.result;
  }
  async getLatestBlockNumber() { return await this.makeRequest('starknet_blockNumber'); }
  async getBlock(blockId) { return await this.makeRequest('starknet_getBlockWithTxs', [blockId]); }
}

const rpc = new SimpleRPCClient('https://rpc.starknet.lava.build');

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/latest-block', async (req, res) => {
  try {
    const blockNumber = await rpc.getLatestBlockNumber();
    res.json({ blockNumber });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/block/:id', async (req, res) => {
  try {
    const blockId = req.params.id === 'latest' ? 'latest' : { block_number: parseInt(req.params.id) };
    const block = await rpc.getBlock(blockId);
    res.json({ blockNumber: block.block_number, blockHash: block.block_hash, transactionCount: block.transactions?.length || 0 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(3000, () => {
  console.log('🚀 Starknet RPC Server running on http://localhost:3000');
  rpc.getLatestBlockNumber().then(b => console.log('✅ Connected! Block:', b));
});
"
