import { BeaconChainStream } from "@apibara/beaconchain";
import { defineIndexer } from "@apibara/indexer";
import { drizzleStorage, useDrizzleStorage } from "@apibara/plugin-drizzle";
import { db, ba_transactions, ba_validators, ba_chains, ba_wallets } from "../lib/database";
import { eq } from "drizzle-orm";

export default defineIndexer(BeaconChainStream)({
  streamUrl: "https://mainnet.beacon.a5a.ch",
  filter: {
    header: "always",
    transactions: "always",
    validators: "always"
  },
  plugins: [drizzleStorage({ db })],
  
  async transform({ block, endCursor }) {
    const { db: txDb } = useDrizzleStorage();
    
    if (!block.header) return;
    
    console.log(`Processing Beacon block ${block.header.slot} with ${block.transactions.length} transactions`);
    
    // Get Beacon chain ID
    const [beaconChain] = await txDb.select().from(ba_chains).where(eq(ba_chains.name, 'beacon'));
    if (!beaconChain) return;
    
    // Process execution payload transactions (EVM transactions within beacon blocks)
    for (const tx of block.transactions) {
      if (!tx.transactionHash || !tx.from) continue;
      
      // Get or create wallets
      const fromWallet = await getOrCreateWallet(txDb, tx.from);
      const toWallet = tx.to ? await getOrCreateWallet(txDb, tx.to) : null;
      
      // Insert transaction
      const [insertedTx] = await txDb.insert(ba_transactions)
        .values({
          chainId: beaconChain.id,
          fromWalletId: fromWallet?.id,
          toWalletId: toWallet?.id,
          hash: tx.transactionHash,
          blockNumber: block.header.executionPayload?.blockNumber,
          transactionIndex: tx.transactionIndex,
          gasUsed: tx.gas,
          gasPrice: tx.gasPrice,
          maxFeePerGas: tx.maxFeePerGas,
          value: tx.value?.toString() || '0',
          timestamp: block.header.executionPayload?.timestamp,
          inputData: tx.input,
          rawData: tx
        })
        .returning();
      
      console.log(`Stored Beacon transaction: ${tx.transactionHash}`);
    }
    
    // Process validator data
    for (const validator of block.validators) {
      if (validator.validatorIndex === undefined) continue;
      
      // Insert or update validator
      await txDb.insert(ba_validators)
        .values({
          validatorIndex: validator.validatorIndex,
          pubkey: validator.pubkey,
          withdrawalCredentials: validator.withdrawalCredentials,
          balance: validator.balance,
          effectiveBalance: validator.effectiveBalance,
          status: validator.status,
          slashed: validator.slashed || false,
          activationEpoch: validator.activationEpoch,
          exitEpoch: validator.exitEpoch,
          lastUpdated: new Date()
        })
        .onConflictDoUpdate({
          target: [ba_validators.validatorIndex],
          set: {
            balance: validator.balance,
            effectiveBalance: validator.effectiveBalance,
            status: validator.status,
            slashed: validator.slashed || false,
            lastUpdated: new Date()
          }
        });
    }
    
    console.log(`Updated ${block.validators.length} validators`);
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
