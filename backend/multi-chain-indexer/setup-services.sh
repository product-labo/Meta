#!/bin/bash

echo "🚀 Setting up Redis and Kafka services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start services
echo "📦 Starting Redis and Kafka..."
docker-compose -f docker-compose-services.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check Redis
echo "🔍 Testing Redis connection..."
if docker exec indexer-redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis failed to start"
fi

# Check Kafka
echo "🔍 Testing Kafka connection..."
if docker exec indexer-kafka kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1; then
    echo "✅ Kafka is ready"
    
    # Create topics
    echo "📋 Creating Kafka topics..."
    docker exec indexer-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic blockchain.transactions --partitions 3 --replication-factor 1 --if-not-exists
    docker exec indexer-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic blockchain.blocks --partitions 3 --replication-factor 1 --if-not-exists
    docker exec indexer-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic blockchain.events --partitions 3 --replication-factor 1 --if-not-exists
    
    echo "✅ Kafka topics created"
else
    echo "❌ Kafka failed to start"
fi

echo ""
echo "🎯 Services Status:"
echo "   Redis: localhost:6379"
echo "   Kafka: localhost:9092"
echo ""
echo "📊 To view logs: docker-compose -f docker-compose-services.yml logs -f"
echo "🛑 To stop: docker-compose -f docker-compose-services.yml down"
