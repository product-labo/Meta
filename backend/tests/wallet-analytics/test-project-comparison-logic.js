import {
  identifyPerformanceGaps,
  generateComparisonRecommendations,
  calculateOverallPosition
} from './src/services/projectComparisonService.js';

/**
 * Unit tests for Project Comparison Service logic (no database required)
 * Tests pure functions: gap identification, recommendations, and position calculation
 */

function testIdentifyPerformanceGaps() {
  console.log('📊 Test 1: Identify Performance Gaps');
  
  const mockComparisons = {
    productivity: {
      current_value: 55,
      benchmark_target: 70,
      gap: -15,
      gap_percentage: -21.43,
      status: 'below_target',
      percentile_range: '25_50'
    },
    retention: {
      current_value: 75,
      benchmark_target: 65,
      gap: 10,
      gap_percentage: 15.38,
      status: 'above_target',
      percentile_range: '75_90'
    },
    adoption: {
      current_value: 68,
      benchmark_target: 70,
      gap: -2,
      gap_percentage: -2.86,
      status: 'below_target',
      percentile_range: '50_75'
    },
    churn: {
      current_value: 25,
      benchmark_target: 20,
      gap: 5,
      gap_percentage: 25,
      status: 'below_target',
      percentile_range: '50_75'
    }
  };

  const gaps = identifyPerformanceGaps(mockComparisons, 'p50');
  
  console.log('Performance Gaps:', JSON.stringify(gaps, null, 2));
  
  // Verify underperforming metrics
  if (gaps.underperforming.length === 2) {
    console.log('✅ Correctly identified 2 underperforming metrics');
  } else {
    throw new Error(`Expected 2 underperforming metrics, got ${gaps.underperforming.length}`);
  }
  
  // Verify outperforming metrics
  if (gaps.outperforming.length === 1) {
    console.log('✅ Correctly identified 1 outperforming metric');
  } else {
    throw new Error(`Expected 1 outperforming metric, got ${gaps.outperforming.length}`);
  }
  
  // Verify at_target metrics
  if (gaps.at_target.length === 1) {
    console.log('✅ Correctly identified 1 at-target metric');
  } else {
    throw new Error(`Expected 1 at-target metric, got ${gaps.at_target.length}`);
  }
  
  // Verify severity classification
  const highSeverity = gaps.underperforming.find(g => g.severity === 'high');
  if (highSeverity) {
    console.log('✅ Correctly classified high severity gap');
  }
  
  console.log('');
}

function testGenerateRecommendations() {
  console.log('📊 Test 2: Generate Comparison Recommendations');
  
  const mockGaps = {
    underperforming: [
      {
        metric: 'productivity',
        current: 55,
        target: 70,
        gap: -15,
        gap_percentage: -21.43,
        severity: 'medium'
      },
      {
        metric: 'churn',
        current: 25,
        target: 20,
        gap: 5,
        gap_percentage: 25,
        severity: 'high'
      }
    ],
    outperforming: [
      {
        metric: 'retention',
        current: 75,
        target: 65,
        gap: 10,
        gap_percentage: 15.38
      }
    ],
    at_target: [
      {
        metric: 'adoption',
        current: 68,
        target: 70
      }
    ]
  };

  const mockProjectMetrics = {
    project_name: 'Test DeFi Project',
    category: 'defi'
  };

  const recommendations = generateComparisonRecommendations(mockGaps, mockProjectMetrics);
  
  console.log(`Generated ${recommendations.length} recommendations`);
  
  // Verify recommendations were generated
  if (recommendations.length >= 3) {
    console.log('✅ Generated recommendations for underperforming metrics and strengths');
  } else {
    throw new Error(`Expected at least 3 recommendations, got ${recommendations.length}`);
  }
  
  // Verify priority ordering
  const priorities = recommendations.map(r => r.priority);
  const isSorted = priorities.every((val, i, arr) => i === 0 || arr[i - 1] >= val);
  if (isSorted) {
    console.log('✅ Recommendations are sorted by priority');
  } else {
    throw new Error('Recommendations are not sorted by priority');
  }
  
  // Verify high priority for high severity
  const highPriorityRec = recommendations.find(r => r.priority === 10);
  if (highPriorityRec && highPriorityRec.metric === 'churn') {
    console.log('✅ High severity gap has high priority recommendation');
  }
  
  // Display sample recommendations
  console.log('\nSample Recommendations:');
  recommendations.slice(0, 2).forEach(rec => {
    console.log(`  ${rec.title} (Priority: ${rec.priority})`);
    console.log(`    ${rec.description}`);
    console.log(`    Actions: ${rec.actions.length} suggested`);
  });
  
  console.log('');
}

function testCalculateOverallPosition() {
  console.log('📊 Test 3: Calculate Overall Market Position');
  
  // Test top performer
  const topPerformerComparisons = {
    productivity: { status: 'above_target', percentile_range: 'above_90' },
    retention: { status: 'above_target', percentile_range: '75_90' },
    adoption: { status: 'above_target', percentile_range: 'above_90' },
    churn: { status: 'above_target', percentile_range: 'above_90' }
  };
  
  const topPosition = calculateOverallPosition(topPerformerComparisons);
  console.log('Top Performer Position:', topPosition);
  
  if (topPosition.position === 'top_performer') {
    console.log('✅ Correctly identified top performer');
  } else {
    throw new Error(`Expected top_performer, got ${topPosition.position}`);
  }
  
  // Test average performer
  const avgPerformerComparisons = {
    productivity: { status: 'below_target', percentile_range: '50_75' },
    retention: { status: 'above_target', percentile_range: '50_75' },
    adoption: { status: 'below_target', percentile_range: '25_50' },
    churn: { status: 'above_target', percentile_range: '50_75' }
  };
  
  const avgPosition = calculateOverallPosition(avgPerformerComparisons);
  console.log('Average Performer Position:', avgPosition);
  
  if (avgPosition.position === 'average') {
    console.log('✅ Correctly identified average performer');
  } else {
    throw new Error(`Expected average, got ${avgPosition.position}`);
  }
  
  // Test below average performer
  const belowAvgComparisons = {
    productivity: { status: 'below_target', percentile_range: 'below_25' },
    retention: { status: 'below_target', percentile_range: '25_50' },
    adoption: { status: 'below_target', percentile_range: 'below_25' },
    churn: { status: 'below_target', percentile_range: '25_50' }
  };
  
  const belowPosition = calculateOverallPosition(belowAvgComparisons);
  console.log('Below Average Performer Position:', belowPosition);
  
  if (belowPosition.position === 'below_average') {
    console.log('✅ Correctly identified below average performer');
  } else {
    throw new Error(`Expected below_average, got ${belowPosition.position}`);
  }
  
  // Test with no benchmarks
  const noBenchmarkComparisons = {
    productivity: { status: 'no_benchmark' },
    retention: { status: 'no_benchmark' }
  };
  
  const unknownPosition = calculateOverallPosition(noBenchmarkComparisons);
  console.log('No Benchmark Position:', unknownPosition);
  
  if (unknownPosition.position === 'unknown') {
    console.log('✅ Correctly handled no benchmark scenario');
  } else {
    throw new Error(`Expected unknown, got ${unknownPosition.position}`);
  }
  
  console.log('');
}

function testRealWorldScenarios() {
  console.log('📊 Test 4: Real-World Comparison Scenarios');
  
  // Scenario 1: Struggling DeFi project
  console.log('\nScenario 1: Struggling DeFi Project');
  const strugglingComparisons = {
    productivity: {
      current_value: 42,
      benchmark_target: 70,
      gap: -28,
      gap_percentage: -40,
      status: 'below_target',
      percentile_range: 'below_25'
    },
    retention: {
      current_value: 35,
      benchmark_target: 65,
      gap: -30,
      gap_percentage: -46.15,
      status: 'below_target',
      percentile_range: 'below_25'
    },
    adoption: {
      current_value: 28,
      benchmark_target: 55,
      gap: -27,
      gap_percentage: -49.09,
      status: 'below_target',
      percentile_range: 'below_25'
    },
    churn: {
      current_value: 45,
      benchmark_target: 20,
      gap: 25,
      gap_percentage: 125,
      status: 'below_target',
      percentile_range: 'below_25'
    }
  };
  
  const strugglingGaps = identifyPerformanceGaps(strugglingComparisons, 'p50');
  const strugglingRecs = generateComparisonRecommendations(strugglingGaps, { project_name: 'Struggling DeFi' });
  const strugglingPosition = calculateOverallPosition(strugglingComparisons);
  
  console.log(`  Position: ${strugglingPosition.position}`);
  console.log(`  Underperforming metrics: ${strugglingGaps.underperforming.length}`);
  console.log(`  High priority recommendations: ${strugglingRecs.filter(r => r.priority >= 8).length}`);
  console.log('  ✅ Struggling project analysis complete');
  
  // Scenario 2: Thriving GameFi project
  console.log('\nScenario 2: Thriving GameFi Project');
  const thrivingComparisons = {
    productivity: {
      current_value: 88,
      benchmark_target: 70,
      gap: 18,
      gap_percentage: 25.71,
      status: 'above_target',
      percentile_range: 'above_90'
    },
    retention: {
      current_value: 82,
      benchmark_target: 65,
      gap: 17,
      gap_percentage: 26.15,
      status: 'above_target',
      percentile_range: 'above_90'
    },
    adoption: {
      current_value: 75,
      benchmark_target: 55,
      gap: 20,
      gap_percentage: 36.36,
      status: 'above_target',
      percentile_range: '75_90'
    },
    churn: {
      current_value: 12,
      benchmark_target: 20,
      gap: -8,
      gap_percentage: -40,
      status: 'above_target',
      percentile_range: 'above_90'
    }
  };
  
  const thrivingGaps = identifyPerformanceGaps(thrivingComparisons, 'p50');
  const thrivingRecs = generateComparisonRecommendations(thrivingGaps, { project_name: 'Thriving GameFi' });
  const thrivingPosition = calculateOverallPosition(thrivingComparisons);
  
  console.log(`  Position: ${thrivingPosition.position}`);
  console.log(`  Outperforming metrics: ${thrivingGaps.outperforming.length}`);
  console.log(`  Strength recommendations: ${thrivingRecs.filter(r => r.type === 'strength').length}`);
  console.log('  ✅ Thriving project analysis complete');
  
  // Scenario 3: Mixed performance project
  console.log('\nScenario 3: Mixed Performance Project');
  const mixedComparisons = {
    productivity: {
      current_value: 72,
      benchmark_target: 70,
      gap: 2,
      gap_percentage: 2.86,
      status: 'above_target',
      percentile_range: '50_75'
    },
    retention: {
      current_value: 58,
      benchmark_target: 65,
      gap: -7,
      gap_percentage: -10.77,
      status: 'below_target',
      percentile_range: '25_50'
    },
    adoption: {
      current_value: 80,
      benchmark_target: 55,
      gap: 25,
      gap_percentage: 45.45,
      status: 'above_target',
      percentile_range: 'above_90'
    },
    churn: {
      current_value: 22,
      benchmark_target: 20,
      gap: 2,
      gap_percentage: 10,
      status: 'below_target',
      percentile_range: '50_75'
    }
  };
  
  const mixedGaps = identifyPerformanceGaps(mixedComparisons, 'p50');
  const mixedRecs = generateComparisonRecommendations(mixedGaps, { project_name: 'Mixed Performance' });
  const mixedPosition = calculateOverallPosition(mixedComparisons);
  
  console.log(`  Position: ${mixedPosition.position}`);
  console.log(`  Underperforming: ${mixedGaps.underperforming.length}, Outperforming: ${mixedGaps.outperforming.length}`);
  console.log(`  Total recommendations: ${mixedRecs.length}`);
  console.log('  ✅ Mixed performance project analysis complete');
  
  console.log('');
}

function testEdgeCases() {
  console.log('📊 Test 5: Edge Cases');
  
  // Empty comparisons
  const emptyPosition = calculateOverallPosition({});
  console.log('Empty comparisons position:', emptyPosition);
  if (emptyPosition.position === 'unknown') {
    console.log('✅ Empty comparisons handled correctly');
  }
  
  // All no_benchmark
  const noBenchmarks = {
    productivity: { status: 'no_benchmark' },
    retention: { status: 'no_benchmark' }
  };
  const noBenchmarkGaps = identifyPerformanceGaps(noBenchmarks, 'p50');
  if (noBenchmarkGaps.underperforming.length === 0 && 
      noBenchmarkGaps.outperforming.length === 0) {
    console.log('✅ No benchmark comparisons handled correctly');
  }
  
  // Exact target match
  const exactMatch = {
    productivity: {
      current_value: 70,
      benchmark_target: 70,
      gap: 0,
      gap_percentage: 0,
      status: 'above_target',
      percentile_range: '50_75'
    }
  };
  const exactGaps = identifyPerformanceGaps(exactMatch, 'p50');
  if (exactGaps.at_target.length === 1) {
    console.log('✅ Exact target match handled correctly');
  }
  
  console.log('');
}

function runAllTests() {
  console.log('🧪 Testing Project Comparison Service Logic (Pure Functions)\n');
  
  try {
    testIdentifyPerformanceGaps();
    testGenerateRecommendations();
    testCalculateOverallPosition();
    testRealWorldScenarios();
    testEdgeCases();
    
    console.log('🎉 All project comparison logic tests passed!');
    console.log('\n✅ Project comparison service logic is working correctly');
    console.log('\nNote: Database-dependent functions (getProjectMetrics, compareProjectToBenchmarks) require a running PostgreSQL instance.');
    console.log('The core comparison logic has been verified and is ready for use.');
    
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run all tests
const success = runAllTests();
process.exit(success ? 0 : 1);
