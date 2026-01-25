/**
 * Test script to verify the updated contract creation API
 * Tests the new requirements: name, targetContract are required
 * RPC config comes from environment variables
 * ABI collection and saving functionality
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'testpassword123';

async function testContractCreation() {
  console.log('🧪 Testing Updated Contract Creation API\n');

  try {
    // 1. Register/Login test user
    console.log('1. Authenticating test user...');
    let authResponse;
    try {
      authResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        })
      });
    } catch (error) {
      // If login fails, try to register
      console.log('   Login failed, attempting registration...');
      authResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          name: 'Test User'
        })
      });
    }

    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const token = authData.token;
    console.log('   ✅ Authentication successful');

    // 2. Test missing required fields
    console.log('\n2. Testing validation - missing required fields...');
    const invalidResponse = await fetch(`${API_URL}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({}) // Empty body should fail
    });

    if (invalidResponse.status === 400) {
      const errorData = await invalidResponse.json();
      console.log('   ✅ Validation working:', errorData.message);
    } else {
      console.log('   ❌ Validation failed - should have returned 400');
    }

    // 3. Test valid contract creation with ABI
    console.log('\n3. Testing valid contract creation with ABI...');
    const testAbi = JSON.stringify([
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ]);

    const validContractData = {
      name: 'Test DeFi Protocol',
      description: 'Test protocol for validation',
      targetContract: {
        address: '0x1234567890123456789012345678901234567890',
        chain: 'ethereum',
        name: 'TestToken',
        abi: testAbi
      },
      competitors: [
        {
          name: 'Competitor 1',
          address: '0x0987654321098765432109876543210987654321',
          chain: 'ethereum',
          abi: testAbi
        }
      ],
      tags: ['test', 'defi']
    };

    const validResponse = await fetch(`${API_URL}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(validContractData)
    });

    if (validResponse.ok) {
      const contractData = await validResponse.json();
      console.log('   ✅ Contract created successfully');
      console.log('   📄 Config ID:', contractData.config.id);
      console.log('   🔗 RPC Config from ENV:', Object.keys(contractData.config.rpcConfig));
      
      // Check if ABI was saved
      if (contractData.config.targetContract.abi && 
          contractData.config.targetContract.abi.includes('./abis/')) {
        console.log('   💾 ABI saved to file:', contractData.config.targetContract.abi);
      }
    } else {
      const errorData = await validResponse.json();
      console.log('   ❌ Contract creation failed:', errorData.message);
    }

    // 4. Test contract creation without ABI
    console.log('\n4. Testing contract creation without ABI...');
    const noAbiContractData = {
      name: 'Simple Token Analysis',
      description: 'Analysis without custom ABI',
      targetContract: {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        chain: 'lisk',
        name: 'SimpleToken'
      }
    };

    const noAbiResponse = await fetch(`${API_URL}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(noAbiContractData)
    });

    if (noAbiResponse.ok) {
      const contractData = await noAbiResponse.json();
      console.log('   ✅ Contract created without ABI');
      console.log('   🔗 Uses ENV RPC config:', Object.keys(contractData.config.rpcConfig).length > 0);
    } else {
      const errorData = await noAbiResponse.json();
      console.log('   ❌ Contract creation failed:', errorData.message);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testContractCreation();
}

export { testContractCreation };