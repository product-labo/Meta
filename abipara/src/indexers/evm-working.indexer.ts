import { db, ba_transactions, ba_wallets, ba_smart_contracts, ba_chains } from '../lib/database.js';
import { eq } from 'drizzle-orm';

async function simulateEVMData() {
  console.log('🚀 Starting EVM Data Simulation...');
  
  try {
    // Get Ethereum chain
    const [ethChain] = await db.select().from(ba_chains).where(eq(ba_chains.name, 'ethereum'));
    const [contract] = await db.select().from(ba_smart_contracts).limit(1);
    
    if (!ethChain || !contract) {
      console.error('❌ Missing chain or contract data');
      return;
    }
    
    console.log(`✅ Found chain: ${ethChain.name}, contract: ${contract.name}`);
    
    // Create sample wallet
    const [wallet] = await db.insert(ba_wallets)
      .values({
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d2b5',
        firstSeen: new Date(),
        lastSeen: new Date()
      })
      .onConflictDoNothing()
      .returning();
    
    // Insert sample transaction
    const [tx] = await db.insert(ba_transactions)
      .values({
        chainId: ethChain.id,
        contractId: contract.id,
        fromWalletId: wallet?.id,
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: BigInt(18500000 + Math.floor(Math.random() * 1000)),
        transactionIndex: 1,
        gasUsed: BigInt(21000),
        gasPrice: BigInt(20000000000),
        value: '1000000000000000000',
        status: 'succeeded',
        timestamp: new Date(),
        inputData: '0xa9059cbb'
      })
      .returning();
    
    console.log(`✅ Created sample transaction: ${tx.hash}`);
    
    // Check total count
    const count = await db.select().from(ba_transactions);
    console.log(`📊 Total transactions in DB: ${count.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run simulation every 10 seconds
setInterval(simulateEVMData, 10000);
simulateEVMData(); // Run once immediately
