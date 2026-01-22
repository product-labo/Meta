// Simple validation tests that can run without external dependencies
// These test the core validation functions from the wallet onboarding form

// Extract validation functions from the component for testing
const validateEVMAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

const validateStarknetAddress = (address) => {
  return /^0x[a-fA-F0-9]{63,}$/.test(address)
}

const validateAddress = (address, chain) => {
  const CHAIN_CONFIG = {
    ethereum: { type: 'evm' },
    polygon: { type: 'evm' },
    lisk: { type: 'evm' },
    arbitrum: { type: 'evm' },
    optimism: { type: 'evm' },
    bsc: { type: 'evm' },
    'starknet-mainnet': { type: 'starknet' },
    'starknet-sepolia': { type: 'starknet' }
  }
  
  const config = CHAIN_CONFIG[chain]
  if (config.type === 'evm') {
    return validateEVMAddress(address)
  } else if (config.type === 'starknet') {
    return validateStarknetAddress(address)
  }
  return false
}

// Simple test runner
function runTests() {
  const tests = []
  let passed = 0
  let failed = 0

  function test(name, fn) {
    tests.push({ name, fn })
  }

  function expect(actual) {
    return {
      toBe: (expected) => {
        if (actual === expected) {
          return true
        } else {
          throw new Error(`Expected ${expected}, but got ${actual}`)
        }
      },
      toBeTrue: () => {
        if (actual === true) {
          return true
        } else {
          throw new Error(`Expected true, but got ${actual}`)
        }
      },
      toBeFalse: () => {
        if (actual === false) {
          return true
        } else {
          throw new Error(`Expected false, but got ${actual}`)
        }
      }
    }
  }

  // Test cases for EVM address validation
  test('should validate correct EVM address', () => {
    expect(validateEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb0')).toBeTrue()
  })

  test('should reject EVM address without 0x prefix', () => {
    expect(validateEVMAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBeFalse()
  })

  test('should reject EVM address with wrong length', () => {
    expect(validateEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0b')).toBeFalse()
  })

  test('should reject EVM address with invalid characters', () => {
    expect(validateEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beg')).toBeFalse()
  })

  // Test cases for Starknet address validation
  test('should validate correct Starknet address', () => {
    expect(validateStarknetAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7')).toBeTrue()
  })

  test('should reject Starknet address that is too short', () => {
    expect(validateStarknetAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBeFalse()
  })

  test('should reject Starknet address without 0x prefix', () => {
    expect(validateStarknetAddress('049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7')).toBeFalse()
  })

  // Test cases for chain-specific validation
  test('should validate EVM address for Ethereum chain', () => {
    expect(validateAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb0', 'ethereum')).toBeTrue()
  })

  test('should validate EVM address for Polygon chain', () => {
    expect(validateAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb0', 'polygon')).toBeTrue()
  })

  test('should validate Starknet address for Starknet mainnet', () => {
    expect(validateAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', 'starknet-mainnet')).toBeTrue()
  })

  test('should reject EVM address for Starknet chain', () => {
    expect(validateAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb0', 'starknet-mainnet')).toBeFalse()
  })

  test('should reject Starknet address for EVM chain', () => {
    expect(validateAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', 'ethereum')).toBeFalse()
  })

  // Run all tests
  console.log('Running Wallet Validation Tests...\n')
  
  tests.forEach(({ name, fn }) => {
    try {
      fn()
      console.log(`✅ ${name}`)
      passed++
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`)
      failed++
    }
  })

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && require.main === module) {
  runTests()
}

module.exports = {
  validateEVMAddress,
  validateStarknetAddress,
  validateAddress,
  runTests
}