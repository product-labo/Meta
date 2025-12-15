/**
 * Comprehensive Test Runner
 * Runs all test suites and provides detailed reporting
 */

import ProductionAPITester from './test-production-ready.js';
import ZcashIntegrationTester from './test-zcash-integration.js';

class TestRunner {
  constructor() {
    this.results = {
      suites: [],
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTestSuite(name, TesterClass, options = {}) {
    this.log(`\n🧪 Starting ${name} Test Suite`);
    this.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      const tester = new TesterClass(options);
      const results = await tester.runAllTests();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const suiteResult = {
        name,
        success: results.success,
        passed: results.results.passed,
        failed: results.results.failed,
        errors: results.results.errors,
        duration,
        performance: results.performance || {}
      };
      
      this.results.suites.push(suiteResult);
      this.results.totalTests += suiteResult.passed + suiteResult.failed;
      this.results.totalPassed += suiteResult.passed;
      this.results.totalFailed += suiteResult.failed;
      this.results.totalDuration += duration;
      
      if (results.success) {
        this.log(`✅ ${name} Test Suite PASSED (${suiteResult.passed}/${suiteResult.passed + suiteResult.failed})`, 'success');
      } else {
        this.log(`❌ ${name} Test Suite FAILED (${suiteResult.passed}/${suiteResult.passed + suiteResult.failed})`, 'error');
      }
      
      return suiteResult;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const suiteResult = {
        name,
        success: false,
        passed: 0,
        failed: 1,
        errors: [{ test: 'Suite Execution', error: error.message }],
        duration,
        performance: {}
      };
      
      this.results.suites.push(suiteResult);
      this.results.totalTests += 1;
      this.results.totalFailed += 1;
      this.results.totalDuration += duration;
      
      this.log(`💥 ${name} Test Suite CRASHED: ${error.message}`, 'error');
      return suiteResult;
    }
  }

  generateReport() {
    this.log('\n📊 COMPREHENSIVE TEST REPORT');
    this.log('='.repeat(60));
    
    // Overall summary
    this.log(`\n🎯 OVERALL RESULTS:`);
    this.log(`Total Test Suites: ${this.results.suites.length}`);
    this.log(`Total Tests: ${this.results.totalTests}`);
    this.log(`Passed: ${this.results.totalPassed}`, this.results.totalPassed > 0 ? 'success' : 'info');
    this.log(`Failed: ${this.results.totalFailed}`, this.results.totalFailed > 0 ? 'error' : 'success');
    this.log(`Success Rate: ${((this.results.totalPassed / this.results.totalTests) * 100).toFixed(1)}%`);
    this.log(`Total Duration: ${this.results.totalDuration}ms`);
    
    // Suite-by-suite breakdown
    this.log(`\n📋 SUITE BREAKDOWN:`);
    this.results.suites.forEach(suite => {
      const status = suite.success ? '✅ PASS' : '❌ FAIL';
      this.log(`${status} ${suite.name}: ${suite.passed}/${suite.passed + suite.failed} (${suite.duration}ms)`);
      
      if (suite.performance.usersCreated) {
        this.log(`  └─ Users Created: ${suite.performance.usersCreated}`);
      }
      if (suite.performance.invoicesCreated) {
        this.log(`  └─ Invoices Created: ${suite.performance.invoicesCreated}`);
      }
      
      if (suite.errors.length > 0) {
        this.log(`  └─ Errors:`);
        suite.errors.forEach(error => {
          this.log(`     • ${error.test}: ${error.error}`, 'error');
        });
      }
    });
    
    // Performance metrics
    this.log(`\n⚡ PERFORMANCE METRICS:`);
    const avgTestTime = this.results.totalDuration / this.results.totalTests;
    this.log(`Average Test Time: ${avgTestTime.toFixed(2)}ms`);
    
    const productionSuite = this.results.suites.find(s => s.name.includes('Production'));
    if (productionSuite && productionSuite.performance.usersCreated) {
      const usersPerSecond = (productionSuite.performance.usersCreated / (productionSuite.duration / 1000)).toFixed(2);
      this.log(`User Creation Rate: ${usersPerSecond} users/second`);
    }
    
    // Recommendations
    this.log(`\n💡 RECOMMENDATIONS:`);
    if (this.results.totalFailed === 0) {
      this.log('🎉 All tests passed! Your API is production-ready.', 'success');
      this.log('✅ Ready to handle 1000+ concurrent users');
      this.log('✅ Zcash integration working correctly');
      this.log('✅ Database operations are consistent');
    } else {
      this.log('⚠️ Some tests failed. Review the errors above.', 'warning');
      
      const failedSuites = this.results.suites.filter(s => !s.success);
      if (failedSuites.some(s => s.name.includes('Production'))) {
        this.log('🔧 Fix production API issues before deploying', 'error');
      }
      if (failedSuites.some(s => s.name.includes('Zcash'))) {
        this.log('🔧 Check Zcash node connection and configuration', 'error');
      }
    }
    
    return this.results;
  }

  async runAllTests() {
    this.log('🚀 STARTING COMPREHENSIVE API TEST SUITE');
    this.log('Testing production readiness and Zcash integration');
    this.log('Designed to handle 1000+ concurrent users');
    
    const overallStartTime = Date.now();
    
    // Run Production API Tests
    await this.runTestSuite('Production API', ProductionAPITester);
    
    // Run Zcash Integration Tests
    await this.runTestSuite('Zcash Integration', ZcashIntegrationTester);
    
    const overallEndTime = Date.now();
    this.results.totalDuration = overallEndTime - overallStartTime;
    
    // Generate comprehensive report
    const report = this.generateReport();
    
    // Return success status
    return {
      success: this.results.totalFailed === 0,
      report: this.results
    };
  }
}

// Export for use in other files
export default TestRunner;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  
  runner.runAllTests()
    .then(results => {
      console.log('\n🏁 ALL TESTS COMPLETE');
      
      if (results.success) {
        console.log('🎉 SUCCESS: All test suites passed!');
        console.log('✅ Your API is ready for production with 1000+ users');
      } else {
        console.log('❌ FAILURE: Some tests failed');
        console.log('🔧 Review the errors and fix issues before production deployment');
      }
      
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 TEST RUNNER CRASHED:', error);
      process.exit(1);
    });
}