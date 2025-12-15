#!/bin/bash

###############################################################################
# End-to-End Integration Test Runner
# Task 43.1: Write end-to-end integration tests
#
# This script runs all end-to-end integration tests covering:
# 1. Registration → Onboarding → Analytics flow
# 2. Subscription upgrade flow
# 3. Data monetization flow
# 4. Withdrawal flow
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
TEST_ENV="${TEST_ENV:-test}"

echo ""
echo "================================================================================"
echo "  End-to-End Integration Test Suite"
echo "================================================================================"
echo ""
echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Environment: $TEST_ENV"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo "================================================================================"
    echo "  $1"
    echo "================================================================================"
    echo ""
}

# Function to check if server is running
check_server() {
    echo -n "Checking if server is running at $BASE_URL... "
    if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not running${NC}"
        echo ""
        echo "Please start the backend server first:"
        echo "  cd backend && npm start"
        echo ""
        return 1
    fi
}

# Function to run backend e2e tests
run_backend_tests() {
    print_section "Running Backend E2E Tests"
    
    cd "$(dirname "$0")/.."
    
    if [ -f "tests/integration/e2e-flows.test.js" ]; then
        echo "Running Jest tests..."
        NODE_ENV=$TEST_ENV BASE_URL=$BASE_URL npx jest tests/integration/e2e-flows.test.js --verbose
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Backend E2E tests passed${NC}"
            return 0
        else
            echo -e "${RED}✗ Backend E2E tests failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Backend E2E test file not found${NC}"
        return 1
    fi
}

# Function to run frontend e2e tests
run_frontend_tests() {
    print_section "Running Frontend E2E Tests"
    
    cd "$(dirname "$0")/../.."
    
    if [ -f "src/__tests__/integration/e2e-flows.test.tsx" ]; then
        echo "Running Vitest tests..."
        npm run test -- src/__tests__/integration/e2e-flows.test.tsx --run
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Frontend E2E tests passed${NC}"
            return 0
        else
            echo -e "${RED}✗ Frontend E2E tests failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Frontend E2E test file not found${NC}"
        return 1
    fi
}

# Function to run integration test script
run_integration_script() {
    print_section "Running Integration Test Script"
    
    cd "$(dirname "$0")"
    
    if [ -f "test-final-integration.js" ]; then
        echo "Running integration script..."
        NODE_ENV=$TEST_ENV BASE_URL=$BASE_URL node test-final-integration.js
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Integration script passed${NC}"
            return 0
        else
            echo -e "${RED}✗ Integration script failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Integration script not found${NC}"
        return 1
    fi
}

# Main execution
main() {
    local backend_result=0
    local frontend_result=0
    local script_result=0
    
    # Check if server is running
    if ! check_server; then
        exit 1
    fi
    
    # Run backend tests
    if ! run_backend_tests; then
        backend_result=1
    fi
    
    # Run frontend tests
    if ! run_frontend_tests; then
        frontend_result=1
    fi
    
    # Run integration script
    if ! run_integration_script; then
        script_result=1
    fi
    
    # Print summary
    print_section "Test Summary"
    
    echo "Results:"
    if [ $backend_result -eq 0 ]; then
        echo -e "  Backend E2E Tests:     ${GREEN}✓ PASSED${NC}"
    else
        echo -e "  Backend E2E Tests:     ${RED}✗ FAILED${NC}"
    fi
    
    if [ $frontend_result -eq 0 ]; then
        echo -e "  Frontend E2E Tests:    ${GREEN}✓ PASSED${NC}"
    else
        echo -e "  Frontend E2E Tests:    ${RED}✗ FAILED${NC}"
    fi
    
    if [ $script_result -eq 0 ]; then
        echo -e "  Integration Script:    ${GREEN}✓ PASSED${NC}"
    else
        echo -e "  Integration Script:    ${RED}✗ FAILED${NC}"
    fi
    
    echo ""
    
    # Exit with error if any tests failed
    if [ $backend_result -ne 0 ] || [ $frontend_result -ne 0 ] || [ $script_result -ne 0 ]; then
        echo -e "${RED}Some tests failed. Please review the output above.${NC}"
        exit 1
    else
        echo -e "${GREEN}All E2E tests passed successfully! 🎉${NC}"
        exit 0
    fi
}

# Run main function
main
