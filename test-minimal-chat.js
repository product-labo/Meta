/**
 * Minimal test for chat functionality
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000';

async function testMinimalChat() {
  console.log('🧪 Testing Minimal Chat Functionality...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing API health...');
    const healthResponse = await fetch(`${API_URL}/health`);
    if (healthResponse.ok) {
      console.log('✅ API is healthy');
    } else {
      throw new Error('API health check failed');
    }

    // Test 2: Register a test user
    console.log('\n2. Creating test user...');
    const testUser = {
      email: 'testchat@example.com',
      password: 'testpass123',
      name: 'Test Chat User'
    };

    let authToken = '';
    try {
      const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      if (registerResponse.ok) {
        const data = await registerResponse.json();
        authToken = data.token;
        console.log('✅ User registered successfully');
      } else {
        // Try login if register fails
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });

        if (loginResponse.ok) {
          const data = await loginResponse.json();
          authToken = data.token;
          console.log('✅ User logged in successfully');
        } else {
          throw new Error('Failed to authenticate');
        }
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return;
    }

    // Test 3: Create chat session
    console.log('\n3. Creating chat session...');
    const sessionData = {
      contractAddress: '0x05D032ac25d322df992303dCa074EE7392C117b9',
      contractChain: 'lisk',
      contractName: 'Test Contract'
    };

    const sessionResponse = await fetch(`${API_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(sessionData)
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      throw new Error(`Session creation failed: ${error}`);
    }

    const session = await sessionResponse.json();
    console.log('✅ Chat session created:', session.session.id);

    // Test 4: Send a message
    console.log('\n4. Sending test message...');
    const messageResponse = await fetch(`${API_URL}/api/chat/sessions/${session.session.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        content: 'Hello, can you analyze this contract?'
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      throw new Error(`Message sending failed: ${error}`);
    }

    const messageData = await messageResponse.json();
    console.log('✅ Message sent successfully');
    console.log('   User message:', messageData.userMessage.content);
    console.log('   AI response preview:', messageData.assistantMessage.content.substring(0, 100) + '...');

    // Test 5: Get messages
    console.log('\n5. Retrieving messages...');
    const messagesResponse = await fetch(`${API_URL}/api/chat/sessions/${session.session.id}/messages`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to retrieve messages');
    }

    const messages = await messagesResponse.json();
    console.log('✅ Messages retrieved:', messages.messages.length, 'messages');

    console.log('\n🎉 All chat functionality tests passed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ API Health Check');
    console.log('- ✅ User Authentication');
    console.log('- ✅ Chat Session Creation');
    console.log('- ✅ Message Sending');
    console.log('- ✅ AI Response Generation');
    console.log('- ✅ Message Retrieval');
    console.log('\n🚀 Chat system is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMinimalChat().catch(console.error);