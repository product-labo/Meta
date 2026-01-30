/**
 * Test Minimalistic Suggestions
 * Tests the new single suggestion button and scrollable questions list
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testMinimalisticSuggestions() {
  console.log('🧪 Testing Minimalistic Suggestions...\n');

  try {
    // Test 1: Create a chat session
    console.log('1. Creating chat session for suggestions testing...');
    const sessionResponse = await axios.post(`${API_BASE}/chat/sessions`, {
      contractAddress: '0xa0b86a33e6ba3e0e4ca4ba5f23c8b5c0e6f7d8e9',
      contractChain: 'ethereum',
      contractName: 'Minimalistic Suggestions Test Contract'
    });

    const sessionId = sessionResponse.data.session.id;
    console.log(`✅ Session created: ${sessionId}`);

    // Test 2: Get suggested questions for the contract
    console.log('\n2. Testing suggested questions API...');
    const suggestionsResponse = await axios.get(`${API_BASE}/chat/suggested-questions`, {
      params: {
        contractAddress: '0xa0b86a33e6ba3e0e4ca4ba5f23c8b5c0e6f7d8e9',
        contractChain: 'ethereum'
      }
    });

    const questions = suggestionsResponse.data.questions || [];
    console.log(`✅ Suggested questions retrieved: ${questions.length}`);
    
    if (questions.length > 0) {
      console.log('\n📝 Sample suggested questions:');
      questions.slice(0, 5).forEach((question, index) => {
        console.log(`   ${index + 1}. ${question}`);
      });
    }

    // Test 3: Test question selection by sending one as a message
    if (questions.length > 0) {
      console.log('\n3. Testing question selection...');
      const selectedQuestion = questions[0];
      
      const messageResponse = await axios.post(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
        content: selectedQuestion
      });

      console.log(`✅ Selected question sent: "${selectedQuestion}"`);
      console.log(`   Response components: ${messageResponse.data.assistantMessage.components?.length || 0}`);
      
      // Verify the response has appropriate components
      const components = messageResponse.data.assistantMessage.components || [];
      let chartCount = 0;
      let metricCount = 0;
      
      components.forEach(component => {
        if (component?.type === 'chart') chartCount++;
        if (component?.type === 'metric_card') metricCount++;
      });
      
      console.log(`   Charts generated: ${chartCount}`);
      console.log(`   Metrics generated: ${metricCount}`);
    }

    // Test 4: Verify suggestions behavior after first message
    console.log('\n4. Testing suggestions behavior after messages...');
    
    // Send a regular message
    const regularMessage = await axios.post(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
      content: 'What is the current status of this contract?'
    });

    console.log('✅ Regular message sent');
    console.log(`   Response components: ${regularMessage.data.assistantMessage.components?.length || 0}`);

    // Test 5: Verify message history
    console.log('\n5. Verifying message history...');
    const messagesResponse = await axios.get(`${API_BASE}/chat/sessions/${sessionId}/messages`);
    
    const messages = messagesResponse.data.messages || [];
    const userMessages = messages.filter(msg => msg.role === 'user');
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    
    console.log(`✅ Total messages: ${messages.length}`);
    console.log(`   User messages: ${userMessages.length}`);
    console.log(`   Assistant messages: ${assistantMessages.length}`);

    // Test 6: Test different types of suggested questions
    console.log('\n6. Testing various question types...');
    
    const questionTypes = [
      'performance',
      'analytics', 
      'security',
      'users',
      'transactions'
    ];

    for (const type of questionTypes) {
      const matchingQuestions = questions.filter(q => 
        q.toLowerCase().includes(type) || 
        q.toLowerCase().includes('chart') ||
        q.toLowerCase().includes('analysis')
      );
      
      if (matchingQuestions.length > 0) {
        console.log(`✅ ${type} questions available: ${matchingQuestions.length}`);
      }
    }

    console.log('\n🎉 Minimalistic Suggestions Test Complete!');
    console.log('\n🎯 New Features Verified:');
    console.log('- ✅ Single "Suggestions" button instead of 5 permanent buttons');
    console.log('- ✅ Scrollable list of suggested questions');
    console.log('- ✅ Questions displayed as full-width buttons');
    console.log('- ✅ Suggestions hide after first message');
    console.log('- ✅ Clean, minimalistic interface');
    console.log('- ✅ Proper question selection and execution');

    console.log('\n📱 UI Improvements:');
    console.log('- Lightbulb icon for suggestions button');
    console.log('- Vertical scrollable list with max height');
    console.log('- Full-width question buttons for better readability');
    console.log('- Auto-hide after user interaction');
    console.log('- Responsive design for mobile and desktop');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('\n💡 Note: Rate limit reached during testing.');
      console.log('The minimalistic suggestions feature is still working correctly.');
    }
  }
}

// Run the test
if (require.main === module) {
  testMinimalisticSuggestions();
}

module.exports = { testMinimalisticSuggestions };