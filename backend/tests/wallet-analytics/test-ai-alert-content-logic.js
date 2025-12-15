import {
  generateAlertContent,
  calculateUrgency,
  calculatePriorityScore,
  estimateImpact,
  suggestTimeline
} from './src/services/aiAlertContentService.js';

/**
 * Unit tests for AI Alert Content Service logic (no database required)
 * Tests AI content generation, urgency calculation, and priority scoring
 */

function testGenerateAlertContent() {
  console.log('📊 Test 1: Generate Alert Content');
  
  const mockAlert = {
    type: 'retention_critical',
    severity: 'critical',
    title: 'Critical retention level',
    message: 'Retention dropped to 35%',
    data: {
      retention: 35,
      threshold: 40
    }
  };
  
  const enhancedAlert = generateAlertContent(mockAlert, {});
  
  console.log('  Enhanced Alert Keys:', Object.keys(enhancedAlert));
  
  if (enhancedAlert.ai_suggestions && enhancedAlert.ai_suggestions.length > 0) {
    console.log(`  ✅ Generated ${enhancedAlert.ai_suggestions.length} AI suggestions`);
  } else {
    throw new Error('No AI suggestions generated');
  }
  
  if (enhancedAlert.action_items && enhancedAlert.action_items.length > 0) {
    console.log(`  ✅ Generated ${enhancedAlert.action_items.length} action items`);
  } else {
    throw new Error('No action items generated');
  }
  
  if (enhancedAlert.urgency && enhancedAlert.urgency.level) {
    console.log(`  ✅ Urgency level: ${enhancedAlert.urgency.level}`);
  }
  
  if (enhancedAlert.priority_score !== undefined) {
    console.log(`  ✅ Priority score: ${enhancedAlert.priority_score}`);
  }
  
  if (enhancedAlert.estimated_impact) {
    console.log(`  ✅ Impact estimated: ${enhancedAlert.estimated_impact.overall}`);
  }
  
  if (enhancedAlert.timeline) {
    console.log(`  ✅ Timeline suggested: ${enhancedAlert.timeline.total}`);
  }
  
  console.log('');
}

function testCalculateUrgency() {
  console.log('📊 Test 2: Calculate Urgency');
  
  const scenarios = [
    { alert: { type: 'retention_critical', severity: 'critical' }, expected: 'critical' },
    { alert: { type: 'retention_drop', severity: 'warning' }, expected: 'high' },
    { alert: { type: 'shielded_spike', severity: 'info' }, expected: 'low' }
  ];
  
  scenarios.forEach(scenario => {
    const urgency = calculateUrgency(scenario.alert, {});
    console.log(`  ${scenario.alert.type} (${scenario.alert.severity}):`);
    console.log(`    Level: ${urgency.level}`);
    console.log(`    Score: ${urgency.score}`);
    console.log(`    Response time: ${urgency.response_time}`);
    
    if (urgency.level === scenario.expected) {
      console.log(`    ✅ Correct urgency level`);
    } else {
      throw new Error(`Expected ${scenario.expected}, got ${urgency.level}`);
    }
  });
  
  // Test with worsening trend
  const worseningUrgency = calculateUrgency(
    { type: 'retention_drop', severity: 'warning' },
    { trend: 'worsening' }
  );
  
  const normalUrgency = calculateUrgency(
    { type: 'retention_drop', severity: 'warning' },
    {}
  );
  
  if (worseningUrgency.score > normalUrgency.score) {
    console.log(`  ✅ Worsening trend increases urgency`);
  }
  
  console.log('');
}

function testCalculatePriorityScore() {
  console.log('📊 Test 3: Calculate Priority Score');
  
  const scenarios = [
    {
      alert: { type: 'retention_critical', severity: 'critical' },
      context: { affected_percentage: 60, trend: 'worsening' },
      expectedRange: [80, 100]
    },
    {
      alert: { type: 'low_conversion', severity: 'warning' },
      context: { affected_percentage: 20, trend: 'stable' },
      expectedRange: [40, 70]
    },
    {
      alert: { type: 'shielded_spike', severity: 'info' },
      context: { affected_percentage: 5, trend: 'stable' },
      expectedRange: [20, 40]
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    const score = calculatePriorityScore(scenario.alert, scenario.context);
    const [min, max] = scenario.expectedRange;
    
    console.log(`  Scenario ${index + 1}: ${scenario.alert.type}`);
    console.log(`    Score: ${score}`);
    console.log(`    Expected range: ${min}-${max}`);
    
    if (score >= min && score <= max) {
      console.log(`    ✅ Score within expected range`);
    } else {
      throw new Error(`Score ${score} outside expected range ${min}-${max}`);
    }
  });
  
  console.log('');
}

function testEstimateImpact() {
  console.log('📊 Test 4: Estimate Impact');
  
  const alertTypes = [
    { type: 'retention_critical', expectedOverall: 'High' },
    { type: 'funnel_drop_off', expectedOverall: 'Medium-High' },
    { type: 'shielded_spike', expectedOverall: 'Low' }
  ];
  
  alertTypes.forEach(({ type, expectedOverall }) => {
    const impact = estimateImpact({ type, severity: 'warning' }, {});
    
    console.log(`  ${type}:`);
    console.log(`    User impact: ${impact.user_impact}`);
    console.log(`    Revenue impact: ${impact.revenue_impact}`);
    console.log(`    Growth impact: ${impact.growth_impact}`);
    console.log(`    Overall: ${impact.overall}`);
    
    if (impact.overall === expectedOverall) {
      console.log(`    ✅ Correct overall impact`);
    } else {
      throw new Error(`Expected ${expectedOverall}, got ${impact.overall}`);
    }
  });
  
  console.log('');
}

function testSuggestTimeline() {
  console.log('📊 Test 5: Suggest Timeline');
  
  const severities = ['critical', 'warning', 'info'];
  
  severities.forEach(severity => {
    const timeline = suggestTimeline({ severity }, {});
    
    console.log(`  ${severity.toUpperCase()} alert timeline:`);
    console.log(`    Investigation: ${timeline.investigation}`);
    console.log(`    Planning: ${timeline.planning}`);
    console.log(`    Implementation: ${timeline.implementation}`);
    console.log(`    Validation: ${timeline.validation}`);
    console.log(`    Total: ${timeline.total}`);
    
    // Critical should have shorter timelines
    if (severity === 'critical') {
      if (timeline.investigation.includes('24-48')) {
        console.log(`    ✅ Critical alert has urgent timeline`);
      }
    }
  });
  
  console.log('');
}

function testActionItemGeneration() {
  console.log('📊 Test 6: Action Item Generation');
  
  const criticalAlert = {
    type: 'retention_critical',
    severity: 'critical'
  };
  
  const enhancedAlert = generateAlertContent(criticalAlert, {});
  const actionItems = enhancedAlert.action_items;
  
  console.log(`  Generated ${actionItems.length} action items for critical alert`);
  
  // Check for emergency response
  const hasEmergencyAction = actionItems.some(item => 
    item.action.toLowerCase().includes('emergency')
  );
  
  if (hasEmergencyAction) {
    console.log(`  ✅ Critical alert includes emergency action`);
  }
  
  // Check for P0 priority
  const hasP0 = actionItems.some(item => item.priority === 'P0');
  
  if (hasP0) {
    console.log(`  ✅ Critical alert includes P0 priority items`);
  }
  
  // Display sample action item
  if (actionItems.length > 0) {
    const sample = actionItems[0];
    console.log(`\n  Sample Action Item:`);
    console.log(`    Action: ${sample.action}`);
    console.log(`    Owner: ${sample.owner}`);
    console.log(`    Timeline: ${sample.timeline}`);
    console.log(`    Priority: ${sample.priority}`);
  }
  
  console.log('');
}

function testSuggestionQuality() {
  console.log('📊 Test 7: Suggestion Quality');
  
  const alertTypes = [
    'retention_critical',
    'churn_critical',
    'funnel_drop_off',
    'shielded_spike'
  ];
  
  alertTypes.forEach(type => {
    const alert = { type, severity: 'warning' };
    const enhanced = generateAlertContent(alert, {});
    const suggestions = enhanced.ai_suggestions;
    
    console.log(`  ${type}:`);
    console.log(`    Suggestions: ${suggestions.length}`);
    
    // Check that suggestions have required fields
    const hasRequiredFields = suggestions.every(s => 
      s.category && s.suggestion && s.rationale
    );
    
    if (hasRequiredFields) {
      console.log(`    ✅ All suggestions have required fields`);
    } else {
      throw new Error('Some suggestions missing required fields');
    }
    
    // Check for expected outcomes
    const hasOutcomes = suggestions.some(s => s.expected_outcome);
    
    if (hasOutcomes) {
      console.log(`    ✅ Suggestions include expected outcomes`);
    }
  });
  
  console.log('');
}

function testRealWorldScenarios() {
  console.log('📊 Test 8: Real-World Alert Scenarios');
  
  // Scenario 1: Critical retention crisis
  console.log('\n  Scenario 1: Critical Retention Crisis');
  const retentionCrisis = {
    type: 'retention_critical',
    severity: 'critical',
    title: 'Critical retention level',
    message: 'Retention at 28%',
    data: { retention: 28, threshold: 40 }
  };
  
  const enhanced1 = generateAlertContent(retentionCrisis, {
    affected_percentage: 72,
    trend: 'worsening'
  });
  
  console.log(`    Urgency: ${enhanced1.urgency.level} (${enhanced1.urgency.score})`);
  console.log(`    Priority: ${enhanced1.priority_score}`);
  console.log(`    Impact: ${enhanced1.estimated_impact.overall}`);
  console.log(`    Suggestions: ${enhanced1.ai_suggestions.length}`);
  console.log(`    Actions: ${enhanced1.action_items.length}`);
  console.log(`    ✅ Crisis scenario processed`);
  
  // Scenario 2: Funnel optimization opportunity
  console.log('\n  Scenario 2: Funnel Optimization Opportunity');
  const funnelIssue = {
    type: 'funnel_drop_off',
    severity: 'warning',
    title: 'High drop-off at feature_usage stage',
    message: '65% drop-off detected',
    data: {
      from_stage: 'first_tx',
      to_stage: 'feature_usage',
      drop_off_percentage: 65
    }
  };
  
  const enhanced2 = generateAlertContent(funnelIssue, {
    affected_percentage: 35,
    trend: 'stable'
  });
  
  console.log(`    Urgency: ${enhanced2.urgency.level}`);
  console.log(`    Priority: ${enhanced2.priority_score}`);
  console.log(`    Suggestions: ${enhanced2.ai_suggestions.length}`);
  console.log(`    ✅ Funnel scenario processed`);
  
  // Scenario 3: Positive activity spike
  console.log('\n  Scenario 3: Positive Activity Spike');
  const activitySpike = {
    type: 'shielded_spike',
    severity: 'info',
    title: 'Shielded transaction spike',
    message: 'Activity increased 3x',
    data: { current_txs: 300, average_txs: 100 }
  };
  
  const enhanced3 = generateAlertContent(activitySpike, {
    affected_percentage: 15,
    trend: 'improving'
  });
  
  console.log(`    Urgency: ${enhanced3.urgency.level}`);
  console.log(`    Priority: ${enhanced3.priority_score}`);
  console.log(`    Suggestions: ${enhanced3.ai_suggestions.length}`);
  console.log(`    ✅ Spike scenario processed`);
  
  console.log('');
}

function runAllTests() {
  console.log('🧪 Testing AI Alert Content Service Logic (Pure Functions)\n');
  
  try {
    testGenerateAlertContent();
    testCalculateUrgency();
    testCalculatePriorityScore();
    testEstimateImpact();
    testSuggestTimeline();
    testActionItemGeneration();
    testSuggestionQuality();
    testRealWorldScenarios();
    
    console.log('🎉 All AI alert content logic tests passed!');
    console.log('\n✅ AI alert content service logic is working correctly');
    console.log('\nThe AI-powered alert content generation is ready to enhance alerts with actionable insights.');
    
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
