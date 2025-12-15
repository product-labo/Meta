#!/bin/bash

# Final Integration Test Runner
# This script checks prerequisites and runs the final integration tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Final Integration Test Runner${NC}"
echo -e "${BLUE}Task 43: Final integration testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: backend directory not found${NC}"
    echo -e "${YELLOW}Please run this script from the project root${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Warning: backend/.env file not found${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✅ Created backend/.env${NC}"
    else
        echo -e "${RED}❌ Error: backend/.env.example not found${NC}"
        exit 1
    fi
fi

# Check if PostgreSQL is running
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if pg_isready -q; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    echo -e "${YELLOW}Please start PostgreSQL:${NC}"
    echo -e "  sudo systemctl start postgresql"
    exit 1
fi

# Check if backend server is running
echo -e "${BLUE}Checking backend server...${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Backend server is not running${NC}"
    echo -e "${YELLOW}Starting backend server...${NC}"
    
    # Start backend server in background
    cd backend
    npm start > /tmp/backend-server.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for server to start
    echo -e "${BLUE}Waiting for server to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend server started (PID: $BACKEND_PID)${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
    
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to start backend server${NC}"
        echo -e "${YELLOW}Check logs: tail -f /tmp/backend-server.log${NC}"
        exit 1
    fi
fi

# Run the integration tests
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running Integration Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

node backend/tests/test-final-integration.js

TEST_EXIT_CODE=$?

# Cleanup
if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo -e "${YELLOW}Stopping backend server (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
fi

# Exit with test exit code
exit $TEST_EXIT_CODE
