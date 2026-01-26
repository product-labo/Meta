/**
 * Test script for the Chat AI System
 * Tests the complete chat functionality including sessions, messages, and AI responses
 */

import chatStorage from './src/api/database/chatStorage.js';
import ChatAIService from './src/services/ChatAIService.js';
import dotenv from 'dotenv';

const { initializeChatStorage, ChatSessionStorage, ChatMessageStorage } = chatStorage;

dotenv.config();

async function testChatSystem() {
  console.log('🧪 Testing Chat AI System...\n');

  try {
    // Initialize storage
    console.log('1. Initializing chat storage...');
    await initializeChatStorage();
    console.log('✅ Chat storage initialized\n');

    // Test user data
    const testUserId = 'test-user-123';
    const testContract = {
      address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
      chain: 'lisk',
      name: 'USDT Contract'
    };

    // Test 1: Create chat session
    console.log('2. Creating chat session...');
    const session = await ChatSessionStorage.create({
      userId: testUserId,
      contractAddress: testContract.address,
      contractChain: testContract.chain,
      contractName: testContract.name,
      title: `Chat: ${testContract.name}`
    });
    console.log('✅ Session created:', {
      id: session.id,
      contractAddress: session.contractAddress,
      contractChain: session.contractChain
    });
    console.log('');

    // Test 2: Add welcome message
    console.log('3. Adding welcome message...');
    const welcomeMessage = await ChatMessageStorage.create({
      sessionId: session.id,
      role: 'assistant',
      content: `Hello! I'm your AI assistant for analyzing the contract ${testContract.address} on ${testContract.chain}. What would you like to know?`,
      components: [{
        type: 'insight_card',
        data: {
          title: 'Welcome to Contract Chat',
          insight: 'Ask me anything about this contract\'s performance, security, users, or competitive position.',
          confidence: 100,
          category: 'info'
        }
      }]
    });
    console.log('✅ Welcome message added:', welcomeMessage.id);
    console.log('');

    // Test 3: Simulate user message
    console.log('4. Adding user message...');
    const userMessage = await ChatMessageStorage.create({
      sessionId: session.id,
      role: 'user',
      content: 'What is the overall performance of this contract?',
      components: []
    });
    console.log('✅ User message added:', userMessage.id);
    console.log('');

    // Test 4: Test AI service
    console.log('5. Testing AI service...');
    const aiEnabled = ChatAIService.isEnabled();
    console.log(`AI Service enabled: ${aiEnabled}`);
    
    if (aiEnabled) {
      console.log('6. Getting contract context...');
      const contractContext = await ChatAIService.getContractContext(
        testUserId, 
        testContract.address, 
        testContract.chain
      );
      console.log('✅ Contract context retrieved:', {
        hasRecentAnalysis: contractContext.hasRecentAnalysis,
        lastAnalyzed: contractContext.lastAnalyzed
      });

      console.log('7. Generating AI response...');
      const sessionContext = {
        contractAddress: testContract.address,
        contractChain: testContract.chain,
        contractData: contractContext.contractData,
        analysisData: contractContext.analysisData,
        chatHistory: [
          { role: 'assistant', content: welcomeMessage.content },
          { role: 'user', content: userMessage.content }
        ]
      };

      const aiResponse = await ChatAIService.generateChatResponse(
        userMessage.content,
        sessionContext,
        testUserId
      );

      console.log('✅ AI response generated:');
      console.log('Content:', aiResponse.content.substring(0, 100) + '...');
      console.log('Components:', aiResponse.components.length);
      console.log('Model:', aiResponse.metadata?.model);

      // Save AI response
      const assistantMessage = await ChatMessageStorage.create({
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.content,
        components: aiResponse.components,
        metadata: aiResponse.metadata
      });
      console.log('✅ AI response saved:', assistantMessage.id);
    } else {
      console.log('⚠️  AI service disabled - configure GEMINI_API_KEY to test AI responses');
    }
    console.log('');

    // Test 5: Retrieve messages
    console.log('8. Retrieving chat messages...');
    const messages = await ChatMessageStorage.findBySessionId(session.id);
    console.log('✅ Messages retrieved:', messages.length);
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
    });
    console.log('');

    // Test 6: Test session retrieval
    console.log('9. Testing session retrieval...');
    const retrievedSession = await ChatSessionStorage.findById(session.id);
    console.log('✅ Session retrieved:', {
      id: retrievedSession.id,
      messageCount: retrievedSession.messageCount,
      lastMessageAt: retrievedSession.lastMessageAt
    });
    console.log('');

    // Test 7: Test user sessions
    console.log('10. Testing user sessions...');
    const userSessions = await ChatSessionStorage.findByUserId(testUserId);
    console.log('✅ User sessions:', userSessions.length);
    console.log('');

    // Test 8: Test contract-specific session
    console.log('11. Testing contract-specific session...');
    const contractSession = await ChatSessionStorage.findByContract(
      testUserId, 
      testContract.address, 
      testContract.chain
    );
    console.log('✅ Contract session found:', contractSession ? contractSession.id : 'none');
    console.log('');

    console.log('🎉 All chat system tests passed!\n');

    // Summary
    console.log('📊 Test Summary:');
    console.log(`- Chat session created: ${session.id}`);
    console.log(`- Messages created: ${messages.length}`);
    console.log(`- AI service enabled: ${aiEnabled}`);
    console.log(`- Session message count: ${retrievedSession.messageCount}`);
    console.log('');

    console.log('🚀 Chat system is ready for production use!');

  } catch (error) {
    console.error('❌ Chat system test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testChatSystem().catch(console.error);