import { db, ba_transactions, ba_smart_contracts, ba_function_signatures, ba_chains, ba_wallets, ba_events } from './database';
import { eq, desc, count, sql } from 'drizzle-orm';

export class Analytics {
  
  // Get top contracts by transaction volume
  static async getTopContracts(limit = 10, days = 30) {
    const result = await db
      .select({
        contractName: ba_smart_contracts.name,
        contractAddress: ba_smart_contracts.address,
        chainName: ba_chains.name,
        transactionCount: count(ba_transactions.id)
      })
      .from(ba_transactions)
      .innerJoin(ba_smart_contracts, eq(ba_transactions.contractId, ba_smart_contracts.id))
      .innerJoin(ba_chains, eq(ba_transactions.chainId, ba_chains.id))
      .where(sql`${ba_transactions.timestamp} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`)
      .groupBy(ba_smart_contracts.id, ba_smart_contracts.name, ba_smart_contracts.address, ba_chains.name)
      .orderBy(desc(count(ba_transactions.id)))
      .limit(limit);
    
    return result;
  }
  
  // Get most popular function signatures
  static async getTopFunctions(limit = 10, days = 30) {
    const result = await db
      .select({
        functionName: ba_function_signatures.functionName,
        signature: ba_function_signatures.signature,
        callCount: count(ba_transactions.id)
      })
      .from(ba_transactions)
      .innerJoin(ba_function_signatures, eq(ba_transactions.functionSigId, ba_function_signatures.id))
      .where(sql`${ba_transactions.timestamp} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`)
      .groupBy(ba_function_signatures.id, ba_function_signatures.functionName, ba_function_signatures.signature)
      .orderBy(desc(count(ba_transactions.id)))
      .limit(limit);
    
    return result;
  }
  
  // Get cross-chain activity comparison
  static async getCrossChainStats(days = 30) {
    const result = await db
      .select({
        chainName: ba_chains.name,
        transactionCount: count(ba_transactions.id),
        uniqueWallets: sql<number>`COUNT(DISTINCT ${ba_transactions.fromWalletId})`
      })
      .from(ba_transactions)
      .innerJoin(ba_chains, eq(ba_transactions.chainId, ba_chains.id))
      .where(sql`${ba_transactions.timestamp} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`)
      .groupBy(ba_chains.id, ba_chains.name);
    
    return result;
  }
  
  // Get wallet interaction patterns
  static async getWalletStats(limit = 10, days = 30) {
    const result = await db
      .select({
        walletAddress: ba_wallets.address,
        uniqueContracts: sql<number>`COUNT(DISTINCT ${ba_transactions.contractId})`,
        totalTransactions: count(ba_transactions.id),
        totalValue: sql<string>`SUM(CAST(${ba_transactions.value} AS NUMERIC))`
      })
      .from(ba_transactions)
      .innerJoin(ba_wallets, eq(ba_transactions.fromWalletId, ba_wallets.id))
      .where(sql`${ba_transactions.timestamp} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`)
      .groupBy(ba_wallets.id, ba_wallets.address)
      .orderBy(desc(count(ba_transactions.id)))
      .limit(limit);
    
    return result;
  }
  
  // Get recent transactions for a specific contract
  static async getContractTransactions(contractAddress: string, limit = 50) {
    const result = await db
      .select({
        hash: ba_transactions.hash,
        blockNumber: ba_transactions.blockNumber,
        timestamp: ba_transactions.timestamp,
        fromAddress: sql<string>`from_wallet.address`,
        toAddress: sql<string>`to_wallet.address`,
        functionName: ba_function_signatures.functionName,
        value: ba_transactions.value,
        status: ba_transactions.status
      })
      .from(ba_transactions)
      .innerJoin(ba_smart_contracts, eq(ba_transactions.contractId, ba_smart_contracts.id))
      .leftJoin(ba_wallets.as('from_wallet'), eq(ba_transactions.fromWalletId, sql`from_wallet.id`))
      .leftJoin(ba_wallets.as('to_wallet'), eq(ba_transactions.toWalletId, sql`to_wallet.id`))
      .leftJoin(ba_function_signatures, eq(ba_transactions.functionSigId, ba_function_signatures.id))
      .where(eq(ba_smart_contracts.address, contractAddress))
      .orderBy(desc(ba_transactions.timestamp))
      .limit(limit);
    
    return result;
  }
  
  // Get daily transaction volume
  static async getDailyVolume(days = 30) {
    const result = await db
      .select({
        date: sql<string>`DATE(${ba_transactions.timestamp})`,
        transactionCount: count(ba_transactions.id),
        chainName: ba_chains.name
      })
      .from(ba_transactions)
      .innerJoin(ba_chains, eq(ba_transactions.chainId, ba_chains.id))
      .where(sql`${ba_transactions.timestamp} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`)
      .groupBy(sql`DATE(${ba_transactions.timestamp})`, ba_chains.name)
      .orderBy(sql`DATE(${ba_transactions.timestamp}) DESC`);
    
    return result;
  }
}

// Example usage function
export async function runAnalytics() {
  console.log('📊 Running Analytics Queries...\n');
  
  try {
    // Top contracts
    const topContracts = await Analytics.getTopContracts(5);
    console.log('🏆 Top 5 Contracts by Transaction Volume:');
    topContracts.forEach((contract, i) => {
      console.log(`${i + 1}. ${contract.contractName} (${contract.chainName}): ${contract.transactionCount} txs`);
    });
    
    // Top functions
    const topFunctions = await Analytics.getTopFunctions(5);
    console.log('\n🔧 Top 5 Function Calls:');
    topFunctions.forEach((func, i) => {
      console.log(`${i + 1}. ${func.functionName}: ${func.callCount} calls`);
    });
    
    // Cross-chain stats
    const crossChainStats = await Analytics.getCrossChainStats();
    console.log('\n⛓️ Cross-Chain Activity:');
    crossChainStats.forEach(stat => {
      console.log(`${stat.chainName}: ${stat.transactionCount} txs, ${stat.uniqueWallets} unique wallets`);
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
  }
}
