import { query } from '../database/db';

/**
 * Property Tests for Lisk Schema
 */

export async function runPropertyTests(): Promise<void> {
  console.log('🧪 Running Property Tests...\n');

  await testChainConfigCompleteness();
  await testBlockHeightUniqueness();
  await testTransactionFunctionKey();
  await testEventOrdering();
  await testAccountFirstSeen();
  await testTokenBalanceNonNegative();
  await testCascadeDelete();
  
  console.log('\n✅ All property tests passed!');
}

async function testChainConfigCompleteness() {
  console.log('Test 1: Chain Configuration Completeness');
  const result = await query('SELECT * FROM chain_config WHERE chain_id = 1');
  
  if (result.rows.length === 0) throw new Error('Chain config not found');
  
  const config = result.rows[0];
  if (!config.chain_name) throw new Error('Missing chain_name');
  if (!config.rpc_url) throw new Error('Missing rpc_url');
  if (config.finality_depth === null) throw new Error('Missing finality_depth');
  
  console.log('✅ Pass\n');
}

async function testBlockHeightUniqueness() {
  console.log('Test 2: Block Height Uniqueness Per Chain');
  const result = await query(`
    SELECT chain_id, height, COUNT(*) as count 
    FROM blocks 
    GROUP BY chain_id, height 
    HAVING COUNT(*) > 1
  `);
  
  if (result.rows.length > 0) {
    throw new Error(`Duplicate block heights found: ${JSON.stringify(result.rows)}`);
  }
  
  console.log('✅ Pass\n');
}

async function testTransactionFunctionKey() {
  console.log('Test 3: Transaction Function Key Computation');
  const result = await query(`
    SELECT tx_id, module, command, function_key 
    FROM transactions 
    WHERE function_key != module || '.' || command
    LIMIT 1
  `);
  
  if (result.rows.length > 0) {
    throw new Error(`Invalid function_key: ${JSON.stringify(result.rows[0])}`);
  }
  
  console.log('✅ Pass\n');
}

async function testEventOrdering() {
  console.log('Test 4: Event Ordering Within Transaction');
  const result = await query(`
    SELECT tx_id, COUNT(*) as event_count, MAX(event_index) as max_index
    FROM events
    GROUP BY tx_id
    HAVING MAX(event_index) >= COUNT(*)
  `);
  
  if (result.rows.length > 0) {
    throw new Error(`Event ordering violation: ${JSON.stringify(result.rows)}`);
  }
  
  console.log('✅ Pass\n');
}

async function testAccountFirstSeen() {
  console.log('Test 5: Account First Seen <= Last Seen');
  const result = await query(`
    SELECT address, first_seen_height, last_seen_height
    FROM accounts
    WHERE first_seen_height > last_seen_height
    LIMIT 1
  `);
  
  if (result.rows.length > 0) {
    throw new Error(`Invalid account heights: ${JSON.stringify(result.rows[0])}`);
  }
  
  console.log('✅ Pass\n');
}

async function testTokenBalanceNonNegative() {
  console.log('Test 6: Token Balances Non-Negative');
  const result = await query(`
    SELECT address, token_id, available_balance, locked_balance
    FROM token_balances
    WHERE available_balance < 0 OR locked_balance < 0
    LIMIT 1
  `);
  
  if (result.rows.length > 0) {
    throw new Error(`Negative balance found: ${JSON.stringify(result.rows[0])}`);
  }
  
  console.log('✅ Pass\n');
}

async function testCascadeDelete() {
  console.log('Test 7: Cascade Delete Behavior');
  
  // Check foreign key constraints exist
  const result = await query(`
    SELECT COUNT(*) as fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
    AND table_name IN ('blocks', 'transactions', 'events', 'accounts')
  `);
  
  if (result.rows[0].fk_count < 5) {
    throw new Error('Missing foreign key constraints');
  }
  
  console.log('✅ Pass\n');
}
