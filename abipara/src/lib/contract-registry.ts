import { db, ba_smart_contracts, ba_function_signatures, ba_categories, ba_chains } from './database';
import { eq } from 'drizzle-orm';

// Popular contract addresses to track
export const POPULAR_CONTRACTS = {
  ethereum: [
    {
      address: '0xA0b86a33E6441b8C4505E2c8c4b5b8e4e4b5b8e4',
      name: 'Uniswap V2 Router',
      category: 'dex',
      functions: ['swapExactTokensForTokens', 'swapTokensForExactTokens', 'addLiquidity']
    },
    {
      address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      name: 'Uniswap V2 Router 02',
      category: 'dex',
      functions: ['swapExactTokensForTokens', 'swapTokensForExactTokens', 'addLiquidity', 'removeLiquidity']
    },
    {
      address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      name: 'Uniswap V3 Router',
      category: 'dex',
      functions: ['exactInputSingle', 'exactOutputSingle', 'multicall']
    },
    {
      address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
      name: 'AAVE Lending Pool',
      category: 'defi',
      functions: ['deposit', 'withdraw', 'borrow', 'repay']
    },
    {
      address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      name: 'Bored Ape Yacht Club',
      category: 'nft',
      functions: ['transferFrom', 'approve', 'mint']
    }
  ],
  starknet: [
    {
      address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      name: 'ETH Token',
      category: 'defi',
      functions: ['transfer', 'approve', 'transferFrom']
    }
  ]
};

// Function signatures database
export const FUNCTION_SIGNATURES = {
  // ERC20 Standard
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x70a08231': 'balanceOf(address)',
  
  // Uniswap V2
  '0x38ed1739': 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
  '0x8803dbee': 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)',
  '0xe8e33700': 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
  
  // Uniswap V3
  '0x414bf389': 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',
  '0xdb3e2198': 'exactOutputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',
  
  // AAVE
  '0xe8eda9df': 'deposit(address,uint256,address,uint16)',
  '0x69328dec': 'withdraw(address,uint256,address)',
  '0xa415bcad': 'borrow(address,uint256,uint256,uint16,address)',
  '0x573ade81': 'repay(address,uint256,uint256,address)',
  
  // NFT
  '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
  '0xa22cb465': 'setApprovalForAll(address,bool)',
  '0x6352211e': 'ownerOf(uint256)'
};

export async function setupContractRegistry() {
  console.log('Setting up contract registry...');
  
  // Get chain IDs
  const chains = await db.select().from(ba_chains);
  const categories = await db.select().from(ba_categories);
  
  const chainMap = Object.fromEntries(chains.map(c => [c.name, c.id]));
  const categoryMap = Object.fromEntries(categories.map(c => [c.name, c.id]));
  
  // Insert contracts
  for (const [chainName, contracts] of Object.entries(POPULAR_CONTRACTS)) {
    const chainId = chainMap[chainName];
    if (!chainId) continue;
    
    for (const contract of contracts) {
      const categoryId = categoryMap[contract.category];
      
      // Insert contract
      const [insertedContract] = await db.insert(ba_smart_contracts)
        .values({
          chainId,
          categoryId,
          address: contract.address,
          name: contract.name,
          isVerified: true
        })
        .onConflictDoNothing()
        .returning();
      
      if (insertedContract) {
        console.log(`Added contract: ${contract.name} (${contract.address})`);
        
        // Insert function signatures for this contract
        for (const funcName of contract.functions) {
          const signature = Object.entries(FUNCTION_SIGNATURES)
            .find(([_, name]) => name.startsWith(funcName))?.[0];
          
          if (signature) {
            await db.insert(ba_function_signatures)
              .values({
                contractId: insertedContract.id,
                signature,
                functionName: funcName,
                functionAbi: null // Will be populated later with full ABI
              })
              .onConflictDoNothing();
          }
        }
      }
    }
  }
  
  console.log('Contract registry setup complete!');
}

export async function getTrackedContracts(chainName: string) {
  const contracts = await db.select({
    id: ba_smart_contracts.id,
    address: ba_smart_contracts.address,
    name: ba_smart_contracts.name
  })
  .from(ba_smart_contracts)
  .innerJoin(ba_chains, eq(ba_smart_contracts.chainId, ba_chains.id))
  .where(eq(ba_chains.name, chainName));
  
  return contracts.map(c => c.address);
}
