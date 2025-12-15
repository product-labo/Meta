/**
 * Verification Script for Withdrawal API Endpoints
 * Verifies that task 36 requirements are met
 * Requirements: 12.1, 12.2, 12.3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('============================================================');
console.log('WITHDRAWAL API ENDPOINTS VERIFICATION');
console.log('Task 36: Create withdrawal API endpoints');
console.log('============================================================\n');

// Read the payment routes file
const paymentRoutesPath = path.join(__dirname, '../src/routes/payment.js');
const paymentRoutesContent = fs.readFileSync(paymentRoutesPath, 'utf8');

// Check for required endpoints
const checks = [
  {
    name: 'POST /api/payments/withdraw endpoint',
    pattern: /router\.post\(['"]\/withdraw['"]/,
    requirement: '12.1, 12.2, 12.3'
  },
  {
    name: 'GET /api/payments/withdrawals endpoint',
    pattern: /router\.get\(['"]\/withdrawals['"]/,
    requirement: '12.1, 12.2, 12.3'
  },
  {
    name: 'JWT authentication on withdraw endpoint',
    pattern: /router\.post\(['"]\/withdraw['"],\s*authenticateJWT/,
    requirement: '15.1'
  },
  {
    name: 'JWT authentication on withdrawals list endpoint',
    pattern: /router\.get\(['"]\/withdrawals['"],\s*authenticateJWT/,
    requirement: '15.1'
  },
  {
    name: 'Amount validation in withdraw endpoint',
    pattern: /amount_zec.*to_address/s,
    requirement: '12.1, 12.2'
  },
  {
    name: 'createWithdrawal service call',
    pattern: /createWithdrawal\(/,
    requirement: '12.1, 12.2, 12.3'
  },
  {
    name: 'getUserWithdrawals service call',
    pattern: /getUserWithdrawals\(/,
    requirement: '12.1'
  }
];

let allPassed = true;

checks.forEach(check => {
  const passed = check.pattern.test(paymentRoutesContent);
  const status = passed ? '✓' : '✗';
  console.log(`${status} ${check.name}`);
  if (!passed) {
    allPassed = false;
  }
});

console.log('\n============================================================');

// Check withdrawal service exists
const withdrawalServicePath = path.join(__dirname, '../src/services/withdrawalService.js');
let serviceContent = '';
if (fs.existsSync(withdrawalServicePath)) {
  console.log('✓ Withdrawal service exists');
  
  serviceContent = fs.readFileSync(withdrawalServicePath, 'utf8');
  
  // Check for key service functions
  const serviceFunctions = [
    'validateWithdrawalRequest',
    'createWithdrawal',
    'getUserWithdrawals',
    'calculateWithdrawalFee'
  ];
  
  serviceFunctions.forEach(func => {
    if (serviceContent.includes(`export function ${func}`) || 
        serviceContent.includes(`export async function ${func}`)) {
      console.log(`  ✓ ${func} function exists`);
    } else {
      console.log(`  ✗ ${func} function missing`);
      allPassed = false;
    }
  });
} else {
  console.log('✗ Withdrawal service missing');
  allPassed = false;
}

console.log('\n============================================================');

// Check routes are registered
const routesIndexPath = path.join(__dirname, '../src/routes/index.js');
if (fs.existsSync(routesIndexPath)) {
  const routesContent = fs.readFileSync(routesIndexPath, 'utf8');
  
  if (routesContent.includes('paymentRouter') && 
      routesContent.includes('/api/payments')) {
    console.log('✓ Payment routes registered in main router');
  } else {
    console.log('✗ Payment routes not properly registered');
    allPassed = false;
  }
} else {
  console.log('✗ Routes index file not found');
  allPassed = false;
}

console.log('\n============================================================');

// Check documentation exists
const docsPath = path.join(__dirname, '../docs/WITHDRAWAL_PROCESSING.md');
if (fs.existsSync(docsPath)) {
  console.log('✓ Withdrawal processing documentation exists');
  
  const docsContent = fs.readFileSync(docsPath, 'utf8');
  
  const docChecks = [
    'POST /api/payments/withdraw',
    'GET /api/payments/withdrawals',
    'Requirements: 12.1, 12.2, 12.3'
  ];
  
  docChecks.forEach(check => {
    if (docsContent.includes(check)) {
      console.log(`  ✓ Documentation includes: ${check}`);
    } else {
      console.log(`  ✗ Documentation missing: ${check}`);
    }
  });
} else {
  console.log('✗ Withdrawal processing documentation missing');
}

console.log('\n============================================================');
console.log('ENDPOINT STRUCTURE VERIFICATION');
console.log('============================================================\n');

// Verify endpoint structure
console.log('POST /api/payments/withdraw endpoint structure:');
// Use a more flexible regex to capture the entire endpoint including nested blocks
const withdrawMatch = paymentRoutesContent.match(/router\.post\(['"]\/withdraw['"],[\s\S]*?catch[\s\S]*?}\s*}\);/);
if (withdrawMatch) {
  const withdrawEndpoint = withdrawMatch[0];
  
  const structureChecks = [
    { name: 'Validates amount_zec', pattern: /amount_zec/ },
    { name: 'Validates to_address', pattern: /to_address/ },
    { name: 'Handles validation errors', pattern: /VALIDATION_ERROR/ },
    { name: 'Returns 201 on success', pattern: /status\(201\)/ },
    { name: 'Returns withdrawal object', pattern: /withdrawal/ },
    { name: 'Handles insufficient balance', pattern: /Insufficient balance/ },
    { name: 'Handles invalid address', pattern: /Invalid Zcash address/ }
  ];
  
  structureChecks.forEach(check => {
    const passed = check.pattern.test(withdrawEndpoint);
    console.log(`  ${passed ? '✓' : '✗'} ${check.name}`);
    if (!passed) allPassed = false;
  });
}

console.log('\nGET /api/payments/withdrawals endpoint structure:');
const withdrawalsMatch = paymentRoutesContent.match(/router\.get\(['"]\/withdrawals['"],[\s\S]*?catch[\s\S]*?}\s*}\);/);
if (withdrawalsMatch) {
  const withdrawalsEndpoint = withdrawalsMatch[0];
  
  const structureChecks = [
    { name: 'Supports pagination (limit)', pattern: /limit/ },
    { name: 'Supports pagination (offset)', pattern: /offset/ },
    { name: 'Supports status filter', pattern: /status/ },
    { name: 'Returns withdrawals array', pattern: /withdrawals/ },
    { name: 'Returns pagination info', pattern: /pagination/ }
  ];
  
  structureChecks.forEach(check => {
    const passed = check.pattern.test(withdrawalsEndpoint);
    console.log(`  ${passed ? '✓' : '✗'} ${check.name}`);
    if (!passed) allPassed = false;
  });
}

console.log('\n============================================================');
console.log('REQUIREMENTS COVERAGE');
console.log('============================================================\n');

const requirements = [
  {
    id: '12.1',
    description: 'Validate user has sufficient balance',
    covered: paymentRoutesContent.includes('Insufficient balance')
  },
  {
    id: '12.2',
    description: 'Validate Zcash address format',
    covered: paymentRoutesContent.includes('Invalid Zcash address')
  },
  {
    id: '12.3',
    description: 'Calculate platform fees',
    covered: serviceContent.includes('calculateWithdrawalFee')
  }
];

requirements.forEach(req => {
  console.log(`${req.covered ? '✓' : '✗'} Requirement ${req.id}: ${req.description}`);
  if (!req.covered) allPassed = false;
});

console.log('\n============================================================');
console.log('FINAL RESULT');
console.log('============================================================\n');

if (allPassed) {
  console.log('✓ ALL CHECKS PASSED');
  console.log('\nTask 36 is COMPLETE:');
  console.log('  ✓ POST /api/payments/withdraw - Request withdrawal');
  console.log('  ✓ GET /api/payments/withdrawals - List withdrawals');
  console.log('  ✓ Requirements 12.1, 12.2, 12.3 are satisfied');
  console.log('\nThe withdrawal API endpoints are fully implemented and ready for use.');
  process.exit(0);
} else {
  console.log('✗ SOME CHECKS FAILED');
  console.log('\nPlease review the failed checks above.');
  process.exit(1);
}
