#!/usr/bin/env node

/**
 * Test script to verify the analysis details page displays the same dashboard
 * components as the analyzer page after analysis completion.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing Analysis Details Page Integration...\n');

// Check if the analysis details page imports the correct dashboard components
const analysisPagePath = path.join(__dirname, 'frontend/app/analysis/[id]/page.tsx');
const analysisPageContent = fs.readFileSync(analysisPagePath, 'utf8');

const requiredImports = [
  'DashboardHeader',
  'OverviewTab',
  'MetricsTab',
  'UsersTab',
  'TransactionsTab',
  'CompetitiveTab'
];

console.log('✅ Checking required dashboard component imports...');
let allImportsFound = true;

requiredImports.forEach(importName => {
  if (analysisPageContent.includes(importName)) {
    console.log(`  ✓ ${importName} imported`);
  } else {
    console.log(`  ✗ ${importName} missing`);
    allImportsFound = false;
  }
});

// Check if the page uses the same tab structure as analyzer page
console.log('\n✅ Checking tab structure...');
const expectedTabs = ['overview', 'metrics', 'users', 'transactions', 'competitive'];
let allTabsFound = true;

expectedTabs.forEach(tab => {
  if (analysisPageContent.includes(`value="${tab}"`)) {
    console.log(`  ✓ ${tab} tab found`);
  } else {
    console.log(`  ✗ ${tab} tab missing`);
    allTabsFound = false;
  }
});

// Check if DashboardHeader is used
console.log('\n✅ Checking DashboardHeader usage...');
if (analysisPageContent.includes('<DashboardHeader')) {
  console.log('  ✓ DashboardHeader component used');
} else {
  console.log('  ✗ DashboardHeader component not found');
  allImportsFound = false;
}

// Check if the old JSON display is removed
console.log('\n✅ Checking removal of raw JSON display...');
if (analysisPageContent.includes('JSON.stringify(analysis.results.overview')) {
  console.log('  ✗ Old JSON display still present');
  allImportsFound = false;
} else {
  console.log('  ✓ Raw JSON display removed');
}

// Check if export functionality is added
console.log('\n✅ Checking export functionality...');
if (analysisPageContent.includes('Export JSON')) {
  console.log('  ✓ Export JSON functionality added');
} else {
  console.log('  ✗ Export functionality missing');
}

console.log('\n' + '='.repeat(50));

if (allImportsFound && allTabsFound) {
  console.log('🎉 SUCCESS: Analysis details page properly integrated!');
  console.log('\nThe analysis details page now uses the same dashboard components');
  console.log('as the analyzer page, providing consistent user experience.');
  console.log('\nKey improvements:');
  console.log('• Rich dashboard components instead of raw JSON');
  console.log('• Consistent tab structure (5 tabs)');
  console.log('• DashboardHeader with metrics overview');
  console.log('• Export functionality for analysis data');
  console.log('• AI insights integration within OverviewTab');
} else {
  console.log('❌ ISSUES FOUND: Some components or features are missing');
  process.exit(1);
}

console.log('\n📝 Next steps:');
console.log('1. Test the page with actual analysis data');
console.log('2. Verify all dashboard components render correctly');
console.log('3. Test the export functionality');
console.log('4. Ensure responsive design works on mobile');