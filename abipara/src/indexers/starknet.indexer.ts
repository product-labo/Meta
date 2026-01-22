import { StarknetStream } from "@apibara/starknet";
import { defineIndexer } from "@apibara/indexer";
import { drizzleStorage, useDrizzleStorage } from "@apibara/plugin-drizzle";
import { db, ba_transactions, ba_events, ba_wallets, ba_smart_contracts, ba_chains, ba_starknet_messages } from "../lib/database";
import { getTrackedContracts } from "../lib/contract-registry";
import { eq } from "drizzle-orm";

// Get tracked Starknet contracts
const trackedContracts = await getTrackedContracts('starknet');

export default defineIndexer(StarknetStream)({
  streamUrl: "https://mainnet.starknet.a5a.ch",
  filter: {
    header: "always",
    events: trackedContracts.length > 0 ? [{ address: trackedContracts }] : [],
    transactions: trackedContracts.length > 0 ? [{ contractAddress: trackedContracts }] : [],
    messages: "always"
  },
  plugins: [drizzleStorage({ db })],
  
  async transform({ block, endCursor }) {
    const { db: txDb } = useDrizzleStorage();
    
    if (!block.header) return;
    
    console.log(`Processing Starknet block ${block.header.blockNumber} with ${block.transactions.length} transactions`);
    
    // Get Starknet chain ID
    const [starknetChain] = await txDb.select().from(ba_chains).where(eq(ba_chains.name, 'starknet'));
    if (!starknetChain) return;
    
    // Process transactions
    for (const tx of block.transactions) {
      if (!tx.meta?.transactionHash) continue;
      
      let contractAddress = null;
      let fromAddress = null;
      
      // Extract addresses based on transaction type
      if (tx.transaction?._tag === 'invokeV1' || tx.transaction?._tag === 'invokeV3') {
        const invokeData = tx.transaction._tag === 'invokeV1' ? 
          tx.transaction.invokeV1 : tx.transaction.invokeV3;
        fromAddress = invokeData.senderAddress;
      } else if (tx.transaction?._tag === 'deploy') {
        // For deploy transactions, we'll get the contract address from events
      }
      
      // Find contract if we have an address
      let contract = null;
      if (contractAddress) {
        [contract] = await txDb.select()
          .from(ba_smart_contracts)
          .where(eq(ba_smart_contracts.address, contractAddress));
      }
      
      // Get or create wallets
      const fromWallet = fromAddress ? await getOrCreateWallet(txDb, fromAddress) : null;
      
      // Insert transaction
      const [insertedTx] = await txDb.insert(ba_transactions)
        .values({
          chainId: starknetChain.id,
          contractId: contract?.id,
          fromWalletId: fromWallet?.id,
          hash: tx.meta.transactionHash,
          blockNumber: block.header.blockNumber,
          blockHash: block.header.blockHash,
          transactionIndex: tx.meta.transactionIndex,
          status: tx.meta.transactionStatus,
          timestamp: block.header.timestamp,
          rawData: tx
        })
        .returning();
      
      console.log(`Stored Starknet transaction: ${tx.meta.transactionHash}`);
    }
    
    // Process events
    for (const event of block.events) {
      if (!event.address || !event.transactionHash) continue;
      
      // Find contract
      const [contract] = await txDb.select()
        .from(ba_smart_contracts)
        .where(eq(ba_smart_contracts.address, event.address));
      
      if (!contract) continue;
      
      // Find corresponding transaction
      const [transaction] = await txDb.select()
        .from(ba_transactions)
        .where(eq(ba_transactions.hash, event.transactionHash));
      
      if (!transaction) continue;
      
      // Insert event
      await txDb.insert(ba_events)
        .values({
          transactionId: transaction.id,
          contractId: contract.id,
          eventSignature: event.keys[0], // First key is usually the event selector
          logIndex: event.eventIndex || 0,
          topics: event.keys,
          data: event.data.join(','),
          decodedData: {
            keys: event.keys,
            data: event.data
          }
        });
    }
    
    // Process L1-L2 messages
    for (const message of block.messages) {
      if (!message.transactionHash) continue;
      
      // Find corresponding transaction
      const [transaction] = await txDb.select()
        .from(ba_transactions)
        .where(eq(ba_transactions.hash, message.transactionHash));
      
      if (!transaction) continue;
      
      // Insert message
      await txDb.insert(ba_starknet_messages)
        .values({
          transactionId: transaction.id,
          fromAddress: message.fromAddress,
          toAddress: message.toAddress,
          payload: message.payload,
          messageIndex: message.messageIndex
        });
    }
  }
});

async function getOrCreateWallet(txDb: any, address: string | undefined) {
  if (!address) return null;
  
  // Try to find existing wallet
  const [existing] = await txDb.select()
    .from(ba_wallets)
    .where(eq(ba_wallets.address, address));
  
  if (existing) return existing;
  
  // Create new wallet
  const [newWallet] = await txDb.insert(ba_wallets)
    .values({
      address,
      firstSeen: new Date(),
      lastSeen: new Date()
    })
    .returning();
  
  return newWallet;
}
