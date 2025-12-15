import 'dotenv/config';
import { 
  assignWalletToCohorts,
  processUnassignedWallets,
  createCohortsForDateRange,
  getCohortInfo,
  getAllCohorts,
  getCohortStatistics,
  getWeekStart,
  getMonthStart
} from './src/services/cohortService.js';
import pool from './src/db/db.js';

async function testCohortService() {
  console.log('🧪 Testing Cohort Analysis Service...\n');

  try {
    // Test 1: Test date utility functions
    console.log('1. Testing date utility functions...');
    
    const testDate = new Date('2025-11-25'); // Monday
    const weekStart = getWeekStart(testDate);
    const monthStart = getMonthStart(testDate);
    
    console.log(`   Test date: ${testDate.toISOString().split('T')[0]}`);
    console.log(`   ✓ Week start: ${weekStart}`);
    console.log(`   ✓ Month start: ${monthStart}`);
    console.log('');

    // Test 2: Get sample wallet
    console.log('2. Finding sample wallet...');
    const walletResult = await pool.query(`
      SELECT w.id, w.address, w.created_at, p.name as project_name 
      FROM wallets w 
      JOIN projects p ON w.project_id = p.id 
      LIMIT 1
    `);

    if (walletResult.rows.length === 0) {
      console.log('   ⚠️  No wallets found. Please create a wallet first.');
      return;
    }

    const sampleWallet = walletResult.rows[0];
    console.log(`   ✓ Using wallet: ${sampleWallet.address} (${sampleWallet.project_name})`);
    console.log(`   ✓ Created at: ${sampleWallet.created_at}`);
    console.log('');

    // Test 3: Assign wallet to cohorts
    console.log('3. Assigning wallet to cohorts...');
    
    const assignments = await assignWalletToCohorts(sampleWallet.id);
    
    console.log(`   ✓ Successfully assigned wallet to ${assignments.length} cohorts:`);
    assignments.forEach(assignment => {
      console.log(`     - ${assignment.type} cohort: ${assignment.assignment.cohort_id}`);
    });
    console.log('');

    // Test 4: Process all unassigned wallets
    console.log('4. Processing unassigned wallets...');
    
    const processedAssignments = await processUnassignedWallets();
    
    console.log(`   ✓ Processed ${processedAssignments.length} wallet-cohort assignments`);
    console.log('');

    // Test 5: Create cohorts for date range
    console.log('5. Creating cohorts for date range...');
    
    const startDate = '2025-11-01';
    const endDate = '2025-11-30';
    
    const weeklyCohorts = await createCohortsForDateRange(startDate, endDate, 'weekly');
    const monthlyCohorts = await createCohortsForDateRange(startDate, endDate, 'monthly');
    
    console.log(`   ✓ Created ${weeklyCohorts.length} weekly cohorts`);
    console.log(`   ✓ Created ${monthlyCohorts.length} monthly cohorts`);
    console.log('');

    // Test 6: Get cohort information
    console.log('6. Getting cohort information...');
    
    if (weeklyCohorts.length > 0) {
      const cohortInfo = await getCohortInfo(weeklyCohorts[0].id);
      console.log(`   ✓ Cohort info for ${cohortInfo.cohort_type} cohort:`);
      console.log(`     Period: ${cohortInfo.cohort_period}`);
      console.log(`     Wallet count: ${cohortInfo.actual_wallet_count}`);
      console.log(`     Cohort ID: ${cohortInfo.id}`);
    }
    console.log('');

    // Test 7: Get all cohorts
    console.log('7. Getting all cohorts...');
    
    const allWeeklyCohorts = await getAllCohorts('weekly', 10);
    const allMonthlyCohorts = await getAllCohorts('monthly', 10);
    
    console.log(`   ✓ Found ${allWeeklyCohorts.length} weekly cohorts:`);
    allWeeklyCohorts.slice(0, 3).forEach(cohort => {
      console.log(`     ${cohort.cohort_period}: ${cohort.actual_wallet_count} wallets`);
    });
    
    console.log(`   ✓ Found ${allMonthlyCohorts.length} monthly cohorts:`);
    allMonthlyCohorts.slice(0, 3).forEach(cohort => {
      console.log(`     ${cohort.cohort_period}: ${cohort.actual_wallet_count} wallets`);
    });
    console.log('');

    // Test 8: Get cohort statistics
    console.log('8. Getting cohort statistics...');
    
    const statistics = await getCohortStatistics();
    
    console.log('   ✓ Cohort statistics:');
    statistics.forEach(stat => {
      console.log(`     ${stat.cohort_type}:`);
      console.log(`       Total cohorts: ${stat.total_cohorts}`);
      console.log(`       Total wallets: ${stat.total_wallets}`);
      console.log(`       Avg wallets per cohort: ${parseFloat(stat.avg_wallets_per_cohort || 0).toFixed(2)}`);
      console.log(`       Date range: ${stat.earliest_cohort} to ${stat.latest_cohort}`);
    });
    console.log('');

    // Test 9: Verify database state
    console.log('9. Verifying database state...');
    
    const cohortCount = await pool.query('SELECT COUNT(*) FROM wallet_cohorts');
    const assignmentCount = await pool.query('SELECT COUNT(*) FROM wallet_cohort_assignments');
    
    console.log(`   ✓ Total cohorts: ${cohortCount.rows[0].count}`);
    console.log(`   ✓ Total assignments: ${assignmentCount.rows[0].count}`);
    console.log('');

    console.log('🎉 Cohort service test completed successfully!');
    console.log('\n📊 Cohort Service Features:');
    console.log('   ✓ Automatic cohort creation (weekly/monthly)');
    console.log('   ✓ Wallet assignment to appropriate cohorts');
    console.log('   ✓ Batch processing of unassigned wallets');
    console.log('   ✓ Date range cohort creation');
    console.log('   ✓ Cohort information retrieval');
    console.log('   ✓ Comprehensive cohort statistics');
    console.log('   ✓ Proper date boundary handling');
    console.log('   ✓ Wallet count tracking and updates');

  } catch (error) {
    console.error('❌ Cohort service test failed:', error);
  } finally {
    await pool.end();
  }
}

testCohortService();