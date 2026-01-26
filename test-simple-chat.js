/**
 * Simple test for chat system
 */

import dotenv from 'dotenv';
dotenv.config();

async function testSimple() {
  console.log('🧪 Testing simple chat import...\n');

  try {
    // Test import
    const chatModule = await import('./src/api/database/chatStorage.js');
    console.log('✅ Chat module imported');
    console.log('Available exports:', Object.keys(chatModule));

    // Test ChatSession model
    const sessionModule = await import('./src/api/models/ChatSession.js');
    console.log('✅ ChatSession model imported');
    console.log('Available exports:', Object.keys(sessionModule));

    // Test AI service
    const aiModule = await import('./src/services/ChatAIService.js');
    console.log('✅ ChatAI service imported');
    console.log('AI enabled:', aiModule.default.isEnabled());

    console.log('\n🎉 All imports successful!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testSimple();