/**
 * Verify Wallet Routes Configuration
 * This script verifies that wallet routes are properly configured
 */

import walletRouter from '../src/routes/wallet.js';
import projectRouter from '../src/routes/project.js';
import indexRouter from '../src/routes/index.js';

console.log('=== Verifying Wallet Routes Configuration ===\n');

// Check wallet router
console.log('1. Checking wallet router...');
if (walletRouter && walletRouter.stack) {
  const routes = walletRouter.stack
    .filter(layer => layer.route)
    .map(layer => ({
      method: Object.keys(layer.route.methods)[0].toUpperCase(),
      path: layer.route.path
    }));
  
  console.log('   ✓ Wallet router loaded');
  console.log('   Routes found:');
  routes.forEach(route => {
    console.log(`     ${route.method} /api/wallets${route.path}`);
  });
  console.log('');
} else {
  console.log('   ✗ Wallet router not properly configured\n');
  process.exit(1);
}

// Check project router (should include nested wallet routes)
console.log('2. Checking project router (nested wallet routes)...');
if (projectRouter && projectRouter.stack) {
  const routes = projectRouter.stack
    .filter(layer => layer.route)
    .map(layer => ({
      method: Object.keys(layer.route.methods)[0].toUpperCase(),
      path: layer.route.path
    }));
  
  const walletRoutes = routes.filter(r => r.path.includes('wallet'));
  
  console.log('   ✓ Project router loaded');
  console.log(`   Wallet routes found: ${walletRoutes.length}`);
  walletRoutes.forEach(route => {
    console.log(`     ${route.method} /api/projects${route.path}`);
  });
  console.log('');
} else {
  console.log('   ✗ Project router not properly configured\n');
  process.exit(1);
}

// Verify required endpoints
console.log('3. Verifying required endpoints...');
const requiredEndpoints = [
  { method: 'POST', path: '/validate', description: 'Validate Zcash address' },
  { method: 'POST', path: '/', description: 'Add wallet to project' },
  { method: 'GET', path: '/', description: 'List project wallets' },
  { method: 'GET', path: '/:walletId', description: 'Get wallet details' },
  { method: 'PUT', path: '/:walletId', description: 'Update wallet privacy mode' },
  { method: 'DELETE', path: '/:walletId', description: 'Remove wallet' }
];

const walletRoutes = walletRouter.stack
  .filter(layer => layer.route)
  .map(layer => ({
    method: Object.keys(layer.route.methods)[0].toUpperCase(),
    path: layer.route.path
  }));

let allFound = true;
requiredEndpoints.forEach(endpoint => {
  const found = walletRoutes.some(r => 
    r.method === endpoint.method && r.path === endpoint.path
  );
  
  if (found) {
    console.log(`   ✓ ${endpoint.method} /api/wallets${endpoint.path} - ${endpoint.description}`);
  } else {
    console.log(`   ✗ ${endpoint.method} /api/wallets${endpoint.path} - ${endpoint.description} NOT FOUND`);
    allFound = false;
  }
});

console.log('');

if (allFound) {
  console.log('=== All Required Endpoints Configured! ===');
  process.exit(0);
} else {
  console.log('=== Some Endpoints Missing! ===');
  process.exit(1);
}
