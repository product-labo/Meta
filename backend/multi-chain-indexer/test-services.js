#!/usr/bin/env node

const { createClient } = require('redis');
const { Kafka } = require('kafkajs');

async function testServices() {
    console.log('🔍 Testing Redis and Kafka Services...\n');
    
    let redisOk = false;
    let kafkaOk = false;

    // Test Redis
    try {
        const redis = createClient({
            socket: { host: 'localhost', port: 6379, connectTimeout: 5000 }
        });
        
        await redis.connect();
        await redis.set('test', 'hello');
        const result = await redis.get('test');
        await redis.del('test');
        await redis.disconnect();
        
        if (result === 'hello') {
            console.log('✅ Redis: Connected and working');
            redisOk = true;
        }
        
    } catch (error) {
        console.log('❌ Redis: Failed -', error.message);
    }

    // Test Kafka
    try {
        const kafka = new Kafka({
            clientId: 'test-client',
            brokers: ['localhost:9092']
        });
        
        const admin = kafka.admin();
        await admin.connect();
        const topics = await admin.listTopics();
        await admin.disconnect();
        
        console.log(`✅ Kafka: Connected (${topics.length} topics)`);
        kafkaOk = true;
        
    } catch (error) {
        console.log('❌ Kafka: Failed -', error.message);
    }

    console.log('\n' + '='.repeat(40));
    if (redisOk && kafkaOk) {
        console.log('✅ All services ready for robust indexing!');
        process.exit(0);
    } else {
        console.log('⚠️ Some services failed. Run ./setup-services.sh');
        process.exit(1);
    }
}

testServices();
