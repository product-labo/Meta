#!/usr/bin/env tsx

import { 
  FUNCTION_SIGNATURES_DB, 
  extractSignaturesFromABI, 
  storeFunctionSignatures,
  generateFunctionSelector 
} from '../lib/function-signatures';
import { db, ba_smart_contracts, ba_function_signatures } from '../lib/database';
import { eq } from 'drizzle-orm';

// Sample ABIs for popular contracts (simplified)
const SAMPLE_ABIS = {
  'ERC20': [
    {
      "type": "function",
      "name": "transfer",
      "inputs": [
        {"name": "to", "type": "address"},
        {"name": "amount", "type": "uint256"}
      ]
    },
    {
      "type": "function", 
      "name": "approve",
      "inputs": [
        {"name": "spender", "type": "address"},
        {"name": "amount", "type": "uint256"}
      ]
    },
    {
      "type": "function",
      "name": "transferFrom", 
      "inputs": [
        {"name": "from", "type": "address"},
        {"name": "to", "type": "address"},
        {"name": "amount", "type": "uint256"}
      ]
    }
  ],
  'UniswapV2Router': [
    {
      "type": "function",
      "name": "swapExactTokensForTokens",
      "inputs": [
        {"name": "amountIn", "type": "uint256"},
        {"name": "amountOutMin", "type": "uint256"},
        {"name": "path", "type": "address[]"},
        {"name": "to", "type": "address"},
        {"name": "deadline", "type": "uint256"}
      ]
    },
    {
      "type": "function",
      "name": "addLiquidity",
      "inputs": [
        {"name": "tokenA", "type": "address"},
        {"name": "tokenB", "type": "address"},
        {"name": "amountADesired", "type": "uint256"},
        {"name": "amountBDesired", "type": "uint256"},
        {"name": "amountAMin", "type": "uint256"},
        {"name": "amountBMin", "type": "uint256"},
        {"name": "to", "type": "address"},
        {"name": "deadline", "type": "uint256"}
      ]
    }
  ]
};

async function extractSignatures() {
  console.log('🔍 Extracting function signatures...');
  
  try {
    // First, populate known signatures from our database
    console.log('📝 Populating known function signatures...');
    
    let signatureCount = 0;
    
    // Get all contracts
    const contracts = await db.select().from(ba_smart_contracts);
    
    for (const contract of contracts) {
      console.log(`Processing contract: ${contract.name}`);
      
      // Extract signatures from known database
      const knownSignatures = Object.entries(FUNCTION_SIGNATURES_DB)
        .map(([selector, data]) => ({
          selector,
          name: data.name,
          signature: data.signature,
          inputs: []
        }));
      
      // Store a subset of relevant signatures for each contract
      const relevantSignatures = knownSignatures.filter(sig => {
        // Filter based on contract category
        if (contract.name?.toLowerCase().includes('uniswap')) {
          return ['transfer', 'approve', 'swap', 'add', 'remove'].some(keyword => 
            sig.name.toLowerCase().includes(keyword)
          );
        }
        if (contract.name?.toLowerCase().includes('aave')) {
          return ['deposit', 'withdraw', 'borrow', 'repay'].some(keyword =>
            sig.name.toLowerCase().includes(keyword)
          );
        }
        // Default: include common ERC20 functions
        return ['transfer', 'approve', 'transferFrom'].includes(sig.name);
      });
      
      await storeFunctionSignatures(contract.id, relevantSignatures);
      signatureCount += relevantSignatures.length;
    }
    
    // Extract from sample ABIs
    console.log('\n🔧 Extracting from sample ABIs...');
    
    for (const [contractType, abi] of Object.entries(SAMPLE_ABIS)) {
      console.log(`Processing ${contractType} ABI...`);
      
      const signatures = extractSignaturesFromABI(abi);
      console.log(`Extracted ${signatures.length} signatures from ${contractType}`);
      
      // Display extracted signatures
      signatures.forEach(sig => {
        console.log(`  ${sig.selector}: ${sig.signature}`);
      });
    }
    
    // Verify function selector generation
    console.log('\n✅ Verifying function selector generation...');
    
    const testCases = [
      'transfer(address,uint256)',
      'approve(address,uint256)', 
      'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)'
    ];
    
    testCases.forEach(signature => {
      const selector = generateFunctionSelector(signature);
      console.log(`${signature} -> ${selector}`);
    });
    
    // Display summary
    const totalSignatures = await db.select().from(ba_function_signatures);
    
    console.log('\n📊 Function Signature Extraction Summary:');
    console.log(`   Total Signatures in DB: ${totalSignatures.length}`);
    console.log(`   Known Signatures: ${Object.keys(FUNCTION_SIGNATURES_DB).length}`);
    console.log(`   Sample ABIs Processed: ${Object.keys(SAMPLE_ABIS).length}`);
    
    console.log('\n✅ Function signature extraction complete!');
    
  } catch (error) {
    console.error('❌ Error extracting signatures:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  extractSignatures()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { extractSignatures };
