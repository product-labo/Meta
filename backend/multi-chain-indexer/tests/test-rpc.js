const { ethers } = require('ethers');

async function testRpcConnections() {
    console.log('Testing RPC connections...');
    
    const rpcUrls = {
        ethereum: 'https://ethereum-rpc.publicnode.com',
        polygon: 'https://polygon-bor-rpc.publicnode.com',
        bsc: 'https://bsc-rpc.publicnode.com',
        base: 'https://base-rpc.publicnode.com'
    };
    
    for (const [chain, url] of Object.entries(rpcUrls)) {
        try {
            console.log(`Testing ${chain}...`);
            const provider = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
            const block = await provider.getBlock('latest');
            console.log(`✅ ${chain}: Block ${block.number}`);
        } catch (error) {
            console.error(`❌ ${chain}: ${error.message}`);
        }
    }
    
    // Test Starknet separately
    try {
        console.log('Testing Starknet...');
        const { RpcProvider } = require('starknet');
        const provider = new RpcProvider({ nodeUrl: 'https://rpc.starknet.lava.build' });
        const block = await provider.getBlock('latest');
        console.log(`✅ Starknet: Block ${block.block_number}`);
    } catch (error) {
        console.error(`❌ Starknet: ${error.message}`);
    }
}

testRpcConnections();