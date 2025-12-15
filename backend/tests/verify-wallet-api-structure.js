/**
 * Verify Wallet API Structure
 * This script verifies the wallet API implementation without loading the full app
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Verifying Wallet API Structure ===\n');

// Check wallet routes file
console.log('1. Checking wallet routes file...');
const walletRoutesPath = path.join(__dirname, '../src/routes/wallet.js');
if (fs.existsSync(walletRoutesPath)) {
  const content = fs.readFileSync(walletRoutesPath, 'utf8');
  
  const requiredRoutes = [
    { pattern: /router\.post\(['"]\/validate['"]/, desc: 'POST /validate' },
    { pattern: /router\.post\(['"]\/['"]/, desc: 'POST /' },
    { pattern: /router\.get\(['"]\/['"]/, desc: 'GET /' },
    { pattern: /router\.get\(['"]\/:\w+['"]/, desc: 'GET /:id' },
    { pattern: /router\.put\(['"]\/:\w+['"]/, desc: 'PUT /:id' },
    { pattern: /router\.delete\(['"]\/:\w+['"]/, desc: 'DELETE /:id' }
  ];
  
  let allFound = true;
  requiredRoutes.forEach(route => {
    if (route.pattern.test(content)) {
      console.log(`   ✓ ${route.desc} route defined`);
    } else {
      console.log(`   ✗ ${route.desc} route NOT FOUND`);
      allFound = false;
    }
  });
  
  // Check authentication
  if (content.includes('authenticateJWT')) {
    console.log('   ✓ JWT authentication configured');
  } else {
    console.log('   ✗ JWT authentication NOT configured');
    allFound = false;
  }
  
  console.log('');
  
  if (!allFound) {
    process.exit(1);
  }
} else {
  console.log('   ✗ Wallet routes file not found\n');
  process.exit(1);
}

// Check wallet controller
console.log('2. Checking wallet controller...');
const controllerPath = path.join(__dirname, '../src/controllers/wallet.js');
if (fs.existsSync(controllerPath)) {
  const content = fs.readFileSync(controllerPath, 'utf8');
  
  const requiredControllers = [
    'createWalletController',
    'getProjectWalletsController',
    'getWalletController',
    'updateWalletController',
    'deleteWalletController',
    'validateAddressController'
  ];
  
  let allFound = true;
  requiredControllers.forEach(controller => {
    if (content.includes(controller)) {
      console.log(`   ✓ ${controller} defined`);
    } else {
      console.log(`   ✗ ${controller} NOT FOUND`);
      allFound = false;
    }
  });
  
  console.log('');
  
  if (!allFound) {
    process.exit(1);
  }
} else {
  console.log('   ✗ Wallet controller file not found\n');
  process.exit(1);
}

// Check integration in main routes
console.log('3. Checking integration in main routes...');
const indexRoutesPath = path.join(__dirname, '../src/routes/index.js');
if (fs.existsSync(indexRoutesPath)) {
  const content = fs.readFileSync(indexRoutesPath, 'utf8');
  
  if (content.includes('import walletRouter')) {
    console.log('   ✓ Wallet router imported');
  } else {
    console.log('   ✗ Wallet router NOT imported');
    process.exit(1);
  }
  
  if (content.includes('router.use("/api/wallets", walletRouter)')) {
    console.log('   ✓ Wallet router mounted at /api/wallets');
  } else {
    console.log('   ✗ Wallet router NOT mounted');
    process.exit(1);
  }
  
  if (content.includes('wallets:')) {
    console.log('   ✓ Wallet endpoints documented in API');
  } else {
    console.log('   ⚠ Wallet endpoints not documented (optional)');
  }
  
  console.log('');
} else {
  console.log('   ✗ Main routes file not found\n');
  process.exit(1);
}

// Check project routes for nested wallet routes
console.log('4. Checking nested wallet routes in project router...');
const projectRoutesPath = path.join(__dirname, '../src/routes/project.js');
if (fs.existsSync(projectRoutesPath)) {
  const content = fs.readFileSync(projectRoutesPath, 'utf8');
  
  const nestedRoutes = [
    { pattern: /router\.post\(['"]\/:\w+\/wallets['"]/, desc: 'POST /:projectId/wallets' },
    { pattern: /router\.get\(['"]\/:\w+\/wallets['"]/, desc: 'GET /:projectId/wallets' },
    { pattern: /router\.get\(['"]\/:\w+\/wallets\/:\w+['"]/, desc: 'GET /:projectId/wallets/:walletId' },
    { pattern: /router\.put\(['"]\/:\w+\/wallets\/:\w+['"]/, desc: 'PUT /:projectId/wallets/:walletId' },
    { pattern: /router\.delete\(['"]\/:\w+\/wallets\/:\w+['"]/, desc: 'DELETE /:projectId/wallets/:walletId' }
  ];
  
  let allFound = true;
  nestedRoutes.forEach(route => {
    if (route.pattern.test(content)) {
      console.log(`   ✓ ${route.desc} route defined (backward compatibility)`);
    } else {
      console.log(`   ✗ ${route.desc} route NOT FOUND`);
      allFound = false;
    }
  });
  
  console.log('');
  
  if (!allFound) {
    process.exit(1);
  }
} else {
  console.log('   ✗ Project routes file not found\n');
  process.exit(1);
}

// Summary
console.log('=== Verification Summary ===');
console.log('✓ All required wallet API endpoints are properly configured');
console.log('✓ JWT authentication is in place');
console.log('✓ Controllers are implemented');
console.log('✓ Routes are integrated into main router');
console.log('✓ Backward compatibility routes maintained');
console.log('\nRequired endpoints:');
console.log('  POST   /api/wallets              - Add wallet to project');
console.log('  GET    /api/wallets              - List project wallets');
console.log('  GET    /api/wallets/:id          - Get wallet details');
console.log('  PUT    /api/wallets/:id          - Update wallet privacy mode');
console.log('  DELETE /api/wallets/:id          - Remove wallet');
console.log('  POST   /api/wallets/validate     - Validate Zcash address');
console.log('\nBackward compatibility (nested under projects):');
console.log('  POST   /api/projects/:projectId/wallets');
console.log('  GET    /api/projects/:projectId/wallets');
console.log('  GET    /api/projects/:projectId/wallets/:walletId');
console.log('  PUT    /api/projects/:projectId/wallets/:walletId');
console.log('  DELETE /api/projects/:projectId/wallets/:walletId');
console.log('\n=== All Checks Passed! ===');
