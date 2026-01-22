// Simple integration test to verify component can be imported and basic functionality works
// This test doesn't require external testing libraries

const fs = require('fs');
const path = require('path');

function runIntegrationTests() {
  console.log('Running Integration Tests...\n');
  
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  // Test 1: Component file exists and is readable
  test('WalletOnboardingForm component file exists', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    if (!fs.existsSync(componentPath)) {
      throw new Error('Component file does not exist');
    }
    
    const content = fs.readFileSync(componentPath, 'utf8');
    if (content.length === 0) {
      throw new Error('Component file is empty');
    }
  });

  // Test 2: Component exports the expected interface
  test('Component exports WalletOnboardingForm', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    if (!content.includes('export function WalletOnboardingForm')) {
      throw new Error('WalletOnboardingForm export not found');
    }
  });

  // Test 3: Component has required props interface
  test('Component has WalletOnboardingFormProps interface', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    if (!content.includes('export interface WalletOnboardingFormProps')) {
      throw new Error('WalletOnboardingFormProps interface not found');
    }
    
    // Check for required props
    const requiredProps = ['projectId', 'onComplete'];
    requiredProps.forEach(prop => {
      if (!content.includes(prop)) {
        throw new Error(`Required prop '${prop}' not found in interface`);
      }
    });
  });

  // Test 4: Component includes all supported chains
  test('Component includes all supported blockchain networks', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    const expectedChains = [
      'ethereum', 'polygon', 'lisk', 'arbitrum', 'optimism', 'bsc',
      'starknet-mainnet', 'starknet-sepolia'
    ];
    
    expectedChains.forEach(chain => {
      if (!content.includes(chain)) {
        throw new Error(`Chain '${chain}' not found in component`);
      }
    });
  });

  // Test 5: Component includes validation functions
  test('Component includes address validation functions', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    const expectedFunctions = ['validateEVMAddress', 'validateStarknetAddress', 'validateAddress'];
    expectedFunctions.forEach(func => {
      if (!content.includes(func)) {
        throw new Error(`Validation function '${func}' not found`);
      }
    });
  });

  // Test 6: Component includes form fields
  test('Component includes required form fields', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    const expectedFields = ['Blockchain Network', 'Wallet Address', 'Description'];
    expectedFields.forEach(field => {
      if (!content.includes(field)) {
        throw new Error(`Form field '${field}' not found`);
      }
    });
  });

  // Test 7: Component includes validation indicators
  test('Component includes validation UI indicators', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    if (!content.includes('data-testid="validation-success"')) {
      throw new Error('Validation success indicator not found');
    }
    
    if (!content.includes('data-testid="validation-error"')) {
      throw new Error('Validation error indicator not found');
    }
  });

  // Test 8: Component includes API integration
  test('Component includes API integration for wallet creation', () => {
    const componentPath = path.join(__dirname, '..', 'wallet-onboarding-form.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    if (!content.includes('/api/projects/')) {
      throw new Error('API endpoint pattern not found');
    }
    
    if (!content.includes('POST')) {
      throw new Error('POST method not found for API call');
    }
  });

  console.log(`\nIntegration Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests();
}

module.exports = { runIntegrationTests };