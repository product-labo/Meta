import { db, ba_transactions, ba_wallets, ba_smart_contracts, ba_chains } from '../lib/database.js';
import { eq } from 'drizzle-orm';

async function fetchLiveData() {
  console.log('🚀 Starting Live Data Fetcher...');
  
  let counter = 0;
  
  const interval = setInterval(async () => {
    try {
      counter++;
      
      // Get chain and contract
      const [ethChain] = await db.select().from(ba_chains).where(eq(ba_chains.name, 'ethereum'));
      const contracts = await db.select().from(ba_smart_contracts).limit(3);
      
      if (!ethChain || contracts.length === 0) return;
      
      // Create random wallet
      const walletAddr = `0x${Math.random().toString(16).substr(2, 40)}`;
      const [wallet] = await db.insert(ba_wallets)
        .values({
          address: walletAddr,
          firstSeen: new Date(),
          lastSeen: new Date()
        })
        .returning();
      
      // Create transaction for random contract
      const contract = contracts[Math.floor(Math.random() * contracts.length)];
      const blockNum = BigInt(18500000 + counter);
      
      const [tx] = await db.insert(ba_transactions)
        .values({
          chainId: ethChain.id,
          contractId: contract.id,
          fromWalletId: wallet.id,
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          blockNumber: blockNum,
          transactionIndex: Math.floor(Math.random() * 100),
          gasUsed: BigInt(21000 + Math.floor(Math.random() * 50000)),
          gasPrice: BigInt(20000000000 + Math.floor(Math.random() * 10000000000)),
          value: (Math.random() * 10).toFixed(18),
          status: Math.random() > 0.1 ? 'succeeded' : 'reverted',
          timestamp: new Date(),
          inputData: '0xa9059cbb'
        })
        .returning();
      
      console.log(`✅ Block ${blockNum}: ${tx.hash} -> ${contract.name}`);
      
      // Show stats every 5 transactions
      if (counter % 5 === 0) {
        const totalTxs = await db.select().from(ba_transactions);
        const totalWallets = await db.select().from(ba_wallets);
        console.log(`📊 Stats: ${totalTxs.length} transactions, ${totalWallets.length} wallets`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }, 2000); // New transaction every 2 seconds
  
  // Stop after 2 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('🏁 Data fetching completed');
  }, 120000);
}

fetchLiveData();
