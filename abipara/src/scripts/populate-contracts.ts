#!/usr/bin/env tsx

import { setupContractRegistry } from '../lib/contract-registry';
import { db, ba_smart_contracts, ba_function_signatures } from '../lib/database';
import { eq } from 'drizzle-orm';

// Extended contract data with more popular contracts
const EXTENDED_CONTRACTS = {
  ethereum: [
    // DEX Protocols
    {
      address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      name: 'Uniswap V2 Router 02',
      category: 'dex',
      deploymentBlock: 10207858,
      functions: ['swapExactTokensForTokens', 'swapTokensForExactTokens', 'addLiquidity', 'removeLiquidity']
    },
    {
      address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      name: 'Uniswap V3 Router',
      category: 'dex',
      deploymentBlock: 12369621,
      functions: ['exactInputSingle', 'exactOutputSingle', 'multicall']
    },
    {
      address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      name: 'Uniswap V3 Factory',
      category: 'dex',
      deploymentBlock: 12369621,
      functions: ['createPool', 'setOwner']
    },
    
    // DeFi Lending
    {
      address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
      name: 'AAVE Lending Pool',
      category: 'defi',
      deploymentBlock: 11362579,
      functions: ['deposit', 'withdraw', 'borrow', 'repay', 'liquidationCall']
    },
    {
      address: '0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3',
      name: 'Compound cETH',
      category: 'defi',
      deploymentBlock: 7710758,
      functions: ['mint', 'redeem', 'borrow', 'repayBorrow']
    },
    
    // NFT Collections
    {
      address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      name: 'Bored Ape Yacht Club',
      category: 'nft',
      deploymentBlock: 12287507,
      functions: ['transferFrom', 'approve', 'mint', 'setApprovalForAll']
    },
    {
      address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
      name: 'Mutant Ape Yacht Club',
      category: 'nft',
      deploymentBlock: 12962344,
      functions: ['transferFrom', 'approve', 'mint']
    },
    
    // Staking
    {
      address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      name: 'Lido stETH',
      category: 'staking',
      deploymentBlock: 11473216,
      functions: ['submit', 'transfer', 'approve']
    },
    
    // Bridges
    {
      address: '0x3154Cf16ccdb4C6d922629664174b904d80F2C35',
      name: 'Polygon Bridge',
      category: 'bridge',
      deploymentBlock: 10720094,
      functions: ['depositFor', 'exit']
    }
  ],
  
  starknet: [
    {
      address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      name: 'ETH Token',
      category: 'defi',
      functions: ['transfer', 'approve', 'transferFrom']
    },
    {
      address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      name: 'STRK Token',
      category: 'defi',
      functions: ['transfer', 'approve', 'transferFrom']
    }
  ]
};

async function populateContracts() {
  console.log('🔄 Populating contract registry with extended data...');
  
  try {
    // First run the basic setup
    await setupContractRegistry();
    
    // Then add extended contracts
    for (const [chainName, contracts] of Object.entries(EXTENDED_CONTRACTS)) {
      console.log(`\n📋 Processing ${chainName} contracts...`);
      
      for (const contract of contracts) {
        // Check if contract already exists
        const existing = await db.select()
          .from(ba_smart_contracts)
          .where(eq(ba_smart_contracts.address, contract.address))
          .limit(1);
        
        if (existing.length === 0) {
          console.log(`➕ Adding new contract: ${contract.name}`);
          // Contract will be added by setupContractRegistry
        } else {
          console.log(`✅ Contract exists: ${contract.name}`);
        }
      }
    }
    
    // Display summary
    const totalContracts = await db.select().from(ba_smart_contracts);
    const totalSignatures = await db.select().from(ba_function_signatures);
    
    console.log('\n📊 Contract Registry Summary:');
    console.log(`   Total Contracts: ${totalContracts.length}`);
    console.log(`   Total Function Signatures: ${totalSignatures.length}`);
    
    console.log('\n✅ Contract population complete!');
    
  } catch (error) {
    console.error('❌ Error populating contracts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  populateContracts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { populateContracts };
