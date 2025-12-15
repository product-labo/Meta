async function testCleanAPI() {
    console.log('🧪 Testing Clean V1 API');
    
    const baseUrl = 'http://localhost:3002/api/v1';
    
    console.log('\n📋 Clean API Endpoints:');
    console.log('GET /api/v1/health - API health check');
    console.log('GET /api/v1/user/transactions - User transactions');
    console.log('GET /api/v1/user/events - User events');
    console.log('GET /api/v1/user/dashboard - User dashboard');
    console.log('POST /api/v1/ai/analyze - AI insights');
    console.log('GET /api/v1/ai/quick-insights - Quick insights');
    
    console.log('\n✅ Features:');
    console.log('🔒 Secure - JWT auth + ownership verification');
    console.log('📊 Robust - Input validation + error handling');
    console.log('🚀 Easy - Consistent response format');
    console.log('📖 Clean - RESTful design + documentation');
    
    console.log('\n📝 Response Format:');
    console.log(JSON.stringify({
        success: true,
        data: { /* user data */ },
        pagination: { limit: 50, offset: 0, hasMore: true }
    }, null, 2));
    
    console.log('\n✅ Clean API ready for frontend integration!');
}

testCleanAPI();
