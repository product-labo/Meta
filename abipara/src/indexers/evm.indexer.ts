import { EvmStream } from "@apibara/evm";
import { defineIndexer } from "@apibara/indexer";
import { drizzleStorage } from "@apibara/plugin-drizzle";
import { db, ba_transactions, ba_events, ba_wallets, ba_smart_contracts, ba_function_signatures, ba_chains } from "../lib/database.js";
import { getTrackedContracts, FUNCTION_SIGNATURES } from "../lib/contract-registry.js";
import { eq } from "drizzle-orm";

// Get tracked contract addresses
const trackedContracts = await getTrackedContracts('ethereum');

export default defineIndexer(EvmStream)({
  streamUrl: "https://mainnet.ethereum.a5a.ch",
  filter: {
    header: {},
    transactions: trackedContracts.length > 0 ? trackedContracts.map(addr => ({ to: [addr] })) : [],
    logs: trackedContracts.length > 0 ? trackedContracts.map(addr => ({ address: [addr] })) : []
  },
  plugins: [drizzleStorage({ database: db })],
  
  async transform({ block, endCursor, context }) {
    if (!block.header) return;
    
    console.log(`Processing block ${block.header.blockNumber} with ${block.transactions.length} transactions`);
    
    // Get Ethereum chain ID
    const [ethChain] = await context.db.select().from(ba_chains).where(eq(ba_chains.name, 'ethereum'));
    if (!ethChain) return;
    
    // Process transactions
    for (const tx of block.transactions) {
      if (!tx.to || !tx.transactionHash) continue;
      
      // Find contract
      const [contract] = await context.db.select()
        .from(ba_smart_contracts)
        .where(eq(ba_smart_contracts.address, tx.to));
      
      if (!contract) continue;
      
      // Extract function signature
      const functionSelector = tx.input.slice(0, 10);
      let functionSig = null;
      
      if (functionSelector !== '0x' && FUNCTION_SIGNATURES[functionSelector]) {
        const [sig] = await context.db.select()
          .from(ba_function_signatures)
          .where(eq(ba_function_signatures.signature, functionSelector));
        functionSig = sig;
      }
      
      // Get or create wallets
      const fromWallet = await getOrCreateWallet(context.db, tx.from);
      const toWallet = await getOrCreateWallet(context.db, tx.to);
      
      // Insert transaction
      await context.db.insert(ba_transactions)
        .values({
          chainId: ethChain.id,
          contractId: contract.id,
          functionSigId: functionSig?.id,
          fromWalletId: fromWallet?.id,
          toWalletId: toWallet?.id,
          hash: tx.transactionHash,
          blockNumber: block.header.blockNumber,
          blockHash: block.header.blockHash,
          transactionIndex: tx.transactionIndex,
          gasUsed: tx.gas,
          gasPrice: tx.gasPrice,
          maxFeePerGas: tx.maxFeePerGas,
          value: tx.value?.toString() || '0',
          status: tx.transactionStatus,
          timestamp: block.header.timestamp,
          inputData: tx.input,
          rawData: tx
        });
      
      console.log(`Stored transaction: ${tx.transactionHash}`);
    }
  }
});

async function getOrCreateWallet(db, address) {
  if (!address) return null;
  
  const [existing] = await db.select()
    .from(ba_wallets)
    .where(eq(ba_wallets.address, address));
  
  if (existing) return existing;
  
  const [newWallet] = await db.insert(ba_wallets)
    .values({
      address,
      firstSeen: new Date(),
      lastSeen: new Date()
    })
    .returning();
  
  return newWallet;
}
