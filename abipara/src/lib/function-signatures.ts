import { keccak256, toHex, toBytes } from 'viem';
import { db, ba_function_signatures, ba_smart_contracts } from './database';
import { eq } from 'drizzle-orm';

// Comprehensive function signature database
export const FUNCTION_SIGNATURES_DB = {
  // ERC20 Standard
  '0xa9059cbb': {
    name: 'transfer',
    signature: 'transfer(address,uint256)',
    category: 'token'
  },
  '0x095ea7b3': {
    name: 'approve', 
    signature: 'approve(address,uint256)',
    category: 'token'
  },
  '0x23b872dd': {
    name: 'transferFrom',
    signature: 'transferFrom(address,address,uint256)',
    category: 'token'
  },
  '0x70a08231': {
    name: 'balanceOf',
    signature: 'balanceOf(address)',
    category: 'token'
  },
  '0x18160ddd': {
    name: 'totalSupply',
    signature: 'totalSupply()',
    category: 'token'
  },
  
  // Uniswap V2
  '0x38ed1739': {
    name: 'swapExactTokensForTokens',
    signature: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
    category: 'dex'
  },
  '0x8803dbee': {
    name: 'swapTokensForExactTokens',
    signature: 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)',
    category: 'dex'
  },
  '0xe8e33700': {
    name: 'addLiquidity',
    signature: 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
    category: 'dex'
  },
  '0xbaa2abde': {
    name: 'removeLiquidity',
    signature: 'removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)',
    category: 'dex'
  },
  
  // Uniswap V3
  '0x414bf389': {
    name: 'exactInputSingle',
    signature: 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',
    category: 'dex'
  },
  '0xdb3e2198': {
    name: 'exactOutputSingle',
    signature: 'exactOutputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',
    category: 'dex'
  },
  '0xac9650d8': {
    name: 'multicall',
    signature: 'multicall(bytes[])',
    category: 'utility'
  },
  
  // AAVE V2
  '0xe8eda9df': {
    name: 'deposit',
    signature: 'deposit(address,uint256,address,uint16)',
    category: 'defi'
  },
  '0x69328dec': {
    name: 'withdraw',
    signature: 'withdraw(address,uint256,address)',
    category: 'defi'
  },
  '0xa415bcad': {
    name: 'borrow',
    signature: 'borrow(address,uint256,uint256,uint16,address)',
    category: 'defi'
  },
  '0x573ade81': {
    name: 'repay',
    signature: 'repay(address,uint256,uint256,address)',
    category: 'defi'
  },
  
  // NFT (ERC721)
  '0x42842e0e': {
    name: 'safeTransferFrom',
    signature: 'safeTransferFrom(address,address,uint256)',
    category: 'nft'
  },
  '0xa22cb465': {
    name: 'setApprovalForAll',
    signature: 'setApprovalForAll(address,bool)',
    category: 'nft'
  },
  '0x6352211e': {
    name: 'ownerOf',
    signature: 'ownerOf(uint256)',
    category: 'nft'
  },
  '0x40c10f19': {
    name: 'mint',
    signature: 'mint(address,uint256)',
    category: 'nft'
  },
  
  // Staking
  '0xa1903eab': {
    name: 'submit',
    signature: 'submit(address)',
    category: 'staking'
  },
  
  // Common
  '0x8da5cb5b': {
    name: 'owner',
    signature: 'owner()',
    category: 'access'
  },
  '0xf2fde38b': {
    name: 'transferOwnership',
    signature: 'transferOwnership(address)',
    category: 'access'
  }
};

// Generate function selector from signature
export function generateFunctionSelector(signature: string): string {
  const hash = keccak256(toBytes(signature));
  return toHex(hash).slice(0, 10); // First 4 bytes
}

// Decode function call data
export function decodeFunctionCall(inputData: string): {
  selector: string;
  signature?: string;
  name?: string;
  category?: string;
} {
  if (!inputData || inputData.length < 10) {
    return { selector: '0x' };
  }
  
  const selector = inputData.slice(0, 10);
  const sigData = FUNCTION_SIGNATURES_DB[selector];
  
  return {
    selector,
    signature: sigData?.signature,
    name: sigData?.name,
    category: sigData?.category
  };
}

// Extract function signatures from ABI
export function extractSignaturesFromABI(abi: any[]): Array<{
  selector: string;
  name: string;
  signature: string;
  inputs: any[];
}> {
  const signatures: Array<{
    selector: string;
    name: string;
    signature: string;
    inputs: any[];
  }> = [];
  
  for (const item of abi) {
    if (item.type === 'function') {
      const inputs = item.inputs || [];
      const inputTypes = inputs.map((input: any) => input.type).join(',');
      const signature = `${item.name}(${inputTypes})`;
      const selector = generateFunctionSelector(signature);
      
      signatures.push({
        selector,
        name: item.name,
        signature,
        inputs
      });
    }
  }
  
  return signatures;
}

// Store function signatures in database
export async function storeFunctionSignatures(
  contractId: string,
  signatures: Array<{
    selector: string;
    name: string;
    signature: string;
    inputs?: any[];
  }>
) {
  for (const sig of signatures) {
    await db.insert(ba_function_signatures)
      .values({
        contractId,
        signature: sig.selector,
        functionName: sig.name,
        functionAbi: {
          signature: sig.signature,
          inputs: sig.inputs || []
        }
      })
      .onConflictDoNothing();
  }
}

// Get function signature by selector
export async function getFunctionSignature(selector: string) {
  const [result] = await db.select()
    .from(ba_function_signatures)
    .where(eq(ba_function_signatures.signature, selector))
    .limit(1);
  
  return result;
}

// Batch decode multiple function calls
export function batchDecodeFunctionCalls(inputDataArray: string[]) {
  return inputDataArray.map(decodeFunctionCall);
}

// Get popular function signatures
export function getPopularSignatures() {
  return Object.entries(FUNCTION_SIGNATURES_DB).map(([selector, data]) => ({
    selector,
    ...data
  }));
}
