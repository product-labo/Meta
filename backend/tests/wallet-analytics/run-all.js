/**
 * Wallet Analytics Test Runner
 * Runs all wallet analytics tests in sequence
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
  'test-privacy-preference.js',
  'test-monetization.js',
  'test-benchmark-logic.js',
  'test-project-comparison-logic.js',
  'test-competitive-insights-logic.js',
  'test-ai-recommendation-logic.js',
  'test-task-completion-logic.js',
  'test-alert-engine-logic.js',
  'test-ai-alert-content-logic.js',
  'test-dashboard-aggregation.js',
  'test-data-integrity.js',
  'test-performance-optimization.js',
  'test-analytics-api-simple.js'
];

async function runTests() {
  console.log('🧪 Running Wallet Analytics Test Suite\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    const testPath = path.join(__dirname, test);
    const testName = test.replace('.js', '');

    try {
      console.log(`\n📝 Running: ${testName}`);
      console.log('-'.repeat(60));

      const { stdout, stderr } = await execAsync(`node "${testPath}"`, {
        cwd: path.join(__dirname, '../..')
      });

      if (stderr && !stderr.includes('ExperimentalWarning')) {
        console.log('⚠️  Warnings:', stderr);
      }

      // Check if test passed (look for success indicators)
      const output = stdout.toString();
      const hasErrors = output.includes('❌') || output.includes('Error:');
      const hasSuccess = output.includes('✅ All tests completed');

      if (hasSuccess && !hasErrors) {
        console.log('✅ PASSED');
        passed++;
        results.push({ test: testName, status: 'PASSED' });
      } else if (hasErrors) {
        console.log('❌ FAILED');
        failed++;
        results.push({ test: testName, status: 'FAILED' });
      } else {
        console.log('✅ PASSED');
        passed++;
        results.push({ test: testName, status: 'PASSED' });
      }

    } catch (error) {
      console.log('❌ FAILED');
      console.log('Error:', error.message);
      failed++;
      results.push({ test: testName, status: 'FAILED', error: error.message });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
