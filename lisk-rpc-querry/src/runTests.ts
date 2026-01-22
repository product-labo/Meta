import { runPropertyTests } from './tests/propertyTests';
import { pool } from './database/db';

async function main() {
  console.log('🧪 Running All Tests\n');
  console.log('='.repeat(50));
  
  try {
    await runPropertyTests();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
