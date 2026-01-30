/**
 * Check contract configurations
 */

import { UserStorage, ContractStorage } from './src/api/database/fileStorage.js';

async function checkContracts() {
  console.log('🔍 Checking contract configurations...');
  
  try {
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 User: ${testUser.id}`);
    console.log(`📧 Email: ${testUser.email}`);
    
    if (testUser.onboarding?.defaultContract) {
      const dc = testUser.onboarding.defaultContract;
      console.log(`📋 Default contract: ${dc.address} on ${dc.chain}`);
    }
    
    // Get all contracts for this user
    const allContracts = await ContractStorage.findByUserId(testUser.id);
    console.log(`📊 Total contracts: ${allContracts.length}`);
    
    for (const contract of allContracts) {
      console.log(`\n📋 Contract: ${contract.id}`);
      console.log(`   Name: ${contract.name}`);
      console.log(`   Address: ${contract.targetContract?.address}`);
      console.log(`   Chain: ${contract.targetContract?.chain}`);
      console.log(`   Active: ${contract.isActive}`);
      console.log(`   Default: ${contract.isDefault}`);
      console.log(`   Created: ${contract.createdAt}`);
    }
    
    // If no contracts, create one
    if (allContracts.length === 0) {
      console.log('\n🔧 No contracts found, creating default contract...');
      
      const contractConfig = {
        userId: testUser.id,
        name: 'Test Default Contract',
        description: 'Default contract for testing continuous sync',
        targetContract: {
          address: testUser.onboarding.defaultContract.address,
          chain: testUser.onboarding.defaultContract.chain,
          name: testUser.onboarding.defaultContract.name || 'Test Contract',
          abi: testUser.onboarding.defaultContract.abi || null
        },
        competitors: [],
        rpcConfig: {
          ethereum: [
            process.env.ETHEREUM_RPC_URL,
            process.env.ETHEREUM_RPC_URL_FALLBACK
          ].filter(Boolean),
          lisk: [
            process.env.LISK_RPC_URL1,
            process.env.LISK_RPC_URL2,
            process.env.LISK_RPC_URL3,
            process.env.LISK_RPC_URL4
          ].filter(Boolean),
          starknet: [
            process.env.STARKNET_RPC_URL1,
            process.env.STARKNET_RPC_URL2,
            process.env.STARKNET_RPC_URL3
          ].filter(Boolean)
        },
        analysisParams: {
          blockRange: parseInt(process.env.ANALYSIS_BLOCK_RANGE) || 1000,
          whaleThreshold: parseFloat(process.env.WHALE_THRESHOLD_ETH) || 10,
          maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 5,
          failoverTimeout: parseInt(process.env.FAILOVER_TIMEOUT) || 30000,
          maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
          outputFormats: (process.env.OUTPUT_FORMATS || 'json,csv,markdown').split(',')
        },
        tags: ['default', 'test'],
        isActive: true,
        isDefault: true
      };
      
      const savedConfig = await ContractStorage.create(contractConfig);
      console.log(`✅ Created contract config: ${savedConfig.id}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkContracts().catch(console.error);