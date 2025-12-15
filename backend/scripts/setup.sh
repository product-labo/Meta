#!/bin/bash

# Lisk Paywall SDK Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Lisk Paywall SDK..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo "✅ PostgreSQL detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before starting the server"
else
    echo "✅ .env file already exists"
fi

# Check if database exists
DB_NAME=${DB_NAME:-liskpaywall}
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "🗄️  Creating database '$DB_NAME'..."
    createdb "$DB_NAME" || {
        echo "❌ Failed to create database. Please check PostgreSQL permissions."
        exit 1
    }
fi

# Run database schema
echo "🗄️  Setting up database schema..."
psql -d "$DB_NAME" -f schema.sql || {
    echo "❌ Failed to setup database schema."
    exit 1
}

echo "✅ Database schema applied successfully"

# Create test database
TEST_DB_NAME="${DB_NAME}_test"
if psql -lqt | cut -d \| -f 1 | grep -qw "$TEST_DB_NAME"; then
    echo "✅ Test database '$TEST_DB_NAME' already exists"
else
    echo "🧪 Creating test database '$TEST_DB_NAME'..."
    createdb "$TEST_DB_NAME" || {
        echo "⚠️  Failed to create test database. Tests may not work properly."
    }
    
    if [ $? -eq 0 ]; then
        psql -d "$TEST_DB_NAME" -f schema.sql || {
            echo "⚠️  Failed to setup test database schema."
        }
    fi
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Lisk Service URL and network settings"
echo "2. Ensure Lisk Service is accessible"
echo "3. Run 'npm start' to start the server"
echo "4. Visit http://localhost:3000/health to verify everything works"
echo ""
echo "Useful commands:"
echo "  npm start          - Start the server"
echo "  npm run dev        - Start in development mode"
echo "  npm test           - Run tests"
echo "  npm run test:watch - Run tests in watch mode"
echo ""
echo "Documentation:"
echo "  Health check: http://localhost:3000/health"
echo "  API docs:     http://localhost:3000/api"
echo ""