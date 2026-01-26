/**
 * Test script for Frontend Chat Integration
 * Tests the complete frontend chat functionality
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

// Test user credentials
const testUser = {
  email: 'frontendtest@example.com',
  password: 'testpassword123',
  name: 'Frontend Test User'
};

// Test contract data
const testContract = {
  address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
  chain: 'lisk',
  name: 'USDT Contract'
};

let authToken = '';

async function testFrontendChatIntegration() {
  console.log('🧪 Testing Frontend Chat Integration...\n');

  try {
    // Step 1: Authenticate user
    console.log('1. Authenticating user...');
    try {
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email, password: testUser.password })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        authToken = loginData.token;
        console.log('✅ User authenticated successfully');
      } else {
        // Try to register if login fails
        const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testUser)
        });
        
        if (registerResponse.ok) {
          const registerData = await registerResponse.json();
          authToken = registerData.token;
          console.log('✅ User registered successfully');
        } else {
          throw new Error('Failed to authenticate user');
        }
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return;
    }

    // Step 2: Create a contract configuration for testing
    console.log('\n2. Creating contract configuration...');
    try {
      const contractResponse = await fetch(`${API_URL}/api/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: testContract.name,
          description: 'Test contract for chat integration',
          targetContract: {
            address: testContract.address,
            chain: testContract.chain,
            name: testContract.name
          },
          tags: ['test', 'defi']
        })
      });

      if (contractResponse.ok) {
        const contractData = await contractResponse.json();
        console.log('✅ Contract configuration created:', contractData.contract.id);
      } else {
        console.log('ℹ️ Contract might already exist, continuing...');
      }
    } catch (error) {
      console.log('ℹ️ Contract creation failed, but continuing with test...');
    }

    // Step 3: Test chat session creation via API
    console.log('\n3. Testing chat session creation...');
    const sessionResponse = await fetch(`${API_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        contractAddress: testContract.address,
        contractChain: testContract.chain,
        contractName: testContract.name
      })
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      throw new Error(`Failed to create session: ${error}`);
    }

    const sessionData = await sessionResponse.json();
    console.log('✅ Chat session created successfully');
    console.log('   Session ID:', sessionData.session.id);
    console.log('   Contract:', sessionData.session.contractAddress);
    console.log('   Chain:', sessionData.session.contractChain);

    const sessionId = sessionData.session.id;

    // Step 4: Test message sending
    console.log('\n4. Testing message sending...');
    const messageResponse = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        content: 'Hello! Can you tell me about this contract?'
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      throw new Error(`Failed to send message: ${error}`);
    }

    const messageData = await messageResponse.json();
    console.log('✅ Message sent and AI response received');
    console.log('   User message:', messageData.userMessage.content);
    console.log('   AI response preview:', messageData.assistantMessage.content.substring(0, 100) + '...');

    // Step 5: Test getting all sessions
    console.log('\n5. Testing session retrieval...');
    const sessionsResponse = await fetch(`${API_URL}/api/chat/sessions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!sessionsResponse.ok) {
      throw new Error('Failed to get sessions');
    }

    const sessionsData = await sessionsResponse.json();
    console.log('✅ Sessions retrieved successfully');
    console.log('   Total sessions:', sessionsData.sessions.length);

    // Step 6: Test getting messages
    console.log('\n6. Testing message retrieval...');
    const messagesResponse = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
    