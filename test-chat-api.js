/**
 * Test script for Chat API endpoints
 * Tests the complete chat API functionality
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000';

// Test user credentials
const testUser = {
  email: 'chattest@example.com',
  password: 'testpassword123',
  name: 'Chat Test User'
};

// Test contract data
const testContract = {
  address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
  chain: 'lisk',
  name: 'USDT Contract'
};

let authToken = '';

async function testChatAPI() {
  console.log('🧪 Testing Chat API Endpoints...\n');

  try {
    // Step 1: Register/Login user
    console.log('1. Authenticating user...');
    try {
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
        // User might already exist, try login
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          authToken = loginData.token;
          console.log('✅ User logged in successfully');
        } else {
          throw new Error('Failed to authenticate user');
        }
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return;
    }

    // Step 2: Test chat session creation
    console.log('\n2. Creating chat session...');
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
    console.log('✅ Chat session created:', {
      id: sessionData.session.id,
      contractAddress: sessionData.session.contractAddress,
      contractChain: sessionData.session.contractChain
    });

    const sessionId = sessionData.session.id;

    // Step 3: Test getting chat sessions
    console.log('\n3. Getting chat sessions...');
    const sessionsResponse = await fetch(`${API_URL}/api/chat/sessions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!sessionsResponse.ok) {
      throw new Error('Failed to get sessions');
    }

    const sessionsData = await sessionsResponse.json();
    console.log('✅ Sessions retrieved:', sessionsData.sessions.length, 'sessions');

    // Step 4: Test sending a message
    console.log('\n4. Sending chat message...');
    const messageResponse = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        content: 'What is the overall performance of this contract?'
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      throw new Error(`Failed to send message: ${error}`);
    }

    const messageData = await messageResponse.json();
    console.log('✅ Message sent and AI response received:');
    console.log('User message:', messageData.userMessage.content);
    console.log('AI response:', messageData.assistantMessage.content.substring(0, 100) + '...');
    console.log('Components:', messageData.assistantMessage.components.length);

    // Step 5: Test getting messages
    console.log('\n5. Getting chat messages...');
    const messagesResponse = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to get messages');
    }

    const messagesData = await messagesResponse.json();
    console.log('✅ Messages retrieved:', messagesData.messages.length, 'messages');

    // Step 6: Test session update
    console.log('\n6. Updating session title...');
    const updateResponse = await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'Updated Chat Title'
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update session');
    }

    const updateData = await updateResponse.json();
    console.log('✅ Session updated:', updateData.session.title);

    console.log('\n🎉 All Chat API tests passed!\n');

    // Summary
    console.log('📊 Test Summary:');
    console.log(`- Authentication: ✅ Working`);
    console.log(`- Session creation: ✅ Working`);
    console.log(`- Session retrieval: ✅ Working`);
    console.log(`- Message sending: ✅ Working`);
    console.log(`- AI responses: ✅ Working`);
    console.log(`- Message retrieval: ✅ Working`);
    console.log(`- Session updates: ✅ Working`);
    console.log('');

    console.log('🚀 Chat API is ready for frontend integration!');

  } catch (error) {
    console.error('❌ Chat API test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testChatAPI().catch(console.error);