#!/usr/bin/env node

import https from 'https';

const liskEndpoints = [
  'https://rpc.api.lisk.com',
  'https://lisk.drpc.org',
  'https://lisk.gateway.tenderly.co/2o3VKjmisQNOJIPlLrt6Ye',
  'https://site1.moralis-nodes.com/lisk/7f6b7ac6edf2456fa240535cc2d8fc6e'
];

async function testRpcEndpoint(url) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 10000
    };

    const startTime = Date.now();
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.result) {
            const blockNumber = parseInt(parsed.result, 16);
            resolve({
              url,
              status: 'success',
              responseTime,
              blockNumber,
              error: null
            });
          } else {
            resolve({
              url,
              status: 'error',
              responseTime,
              blockNumber: null,
              error: 'No result in response'
            });
          }
        } catch (e) {
          resolve({
            url,
            status: 'error',
            responseTime,
            blockNumber: null,
            error: `Parse error: ${e.message}`
          });
        }
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        status: 'error',
        responseTime,
        blockNumber: null,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        status: 'error',
        responseTime,
        blockNumber: null,
        error: 'Request timeout'
      });
    });

    req.write(data);
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('🔍 Testing Lisk RPC Endpoints...\n');
  
  const results = await Promise.all(
    liskEndpoints.map(url => testRpcEndpoint(url))
  );
  
  results.forEach((result, index) => {
    const status = result.status === 'success' ? '✅' : '❌';
    const responseTime = `${result.responseTime}ms`;
    const blockInfo = result.blockNumber ? `Block: ${result.blockNumber}` : '';
    const error = result.error ? `Error: ${result.error}` : '';
    
    console.log(`${status} ${result.url}`);
    console.log(`   Response time: ${responseTime}`);
    if (blockInfo) console.log(`   ${blockInfo}`);
    if (error) console.log(`   ${error}`);
    console.log('');
  });
  
  const workingEndpoints = results.filter(r => r.status === 'success');
  console.log(`📊 Summary: ${workingEndpoints.length}/${results.length} endpoints working`);
  
  if (workingEndpoints.length > 0) {
    const fastest = workingEndpoints.reduce((prev, current) => 
      prev.responseTime < current.responseTime ? prev : current
    );
    console.log(`⚡ Fastest: ${fastest.url} (${fastest.responseTime}ms)`);
  }
}

testAllEndpoints().catch(console.error);