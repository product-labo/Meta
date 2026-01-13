#!/bin/bash

echo "🏁 RPC Client Tests Checkpoint - Task 5"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "📋 Running comprehensive RPC client property tests..."
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# RPC endpoint connectivity
echo "🌐 Testing RPC endpoint connectivity..."
if curl -s -X POST https://rpc.starknet.lava.build \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"starknet_blockNumber","params":[],"id":1}' \
  --max-time 10 | grep -q "result"; then
    echo -e "${GREEN}✅ RPC endpoint: OK${NC}"
else
    echo -e "${RED}❌ RPC endpoint: FAILED${NC}"
    echo "Cannot connect to Starknet RPC endpoint. Check network connectivity."
    exit 1
fi

# TypeScript compilation
echo "🔨 Checking TypeScript compilation..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript compilation: OK${NC}"
else
    echo -e "${RED}❌ TypeScript compilation: FAILED${NC}"
    echo "Please fix TypeScript errors before running tests"
    exit 1
fi

echo ""
echo "🧪 Running RPC Client Property Tests..."
echo "====================================="

# List of RPC client property test files
RPC_TESTS=(
    "rpc-connection.test.ts"
    "rpc-retry.test.ts"
    "request-formatting.test.ts"
    "response-parsing.test.ts"
    "block-retrieval.test.ts"
    "transaction-retrieval.test.ts"
)

# Run each test file individually for better reporting
for test_file in "${RPC_TESTS[@]}"; do
    echo ""
    echo "📝 Running: $test_file"
    echo "----------------------------------------"
    
    if npm test -- --testPathPattern="$test_file" --verbose --testTimeout=180000; then
        echo -e "${GREEN}✅ PASSED: $test_file${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ FAILED: $test_file${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
done

echo ""
echo "📊 RPC Client Test Results Summary"
echo "=================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL RPC CLIENT TESTS PASSED!${NC}"
    echo ""
    echo "✅ Connection Management: Validated"
    echo "✅ Retry Logic: Tested with exponential backoff"
    echo "✅ Request Formatting: Starknet RPC spec compliant"
    echo "✅ Response Parsing: JSON schema validation working"
    echo "✅ Block Retrieval: Complete with all required fields"
    echo "✅ Transaction Retrieval: Comprehensive data validation"
    echo ""
    echo "🚀 RPC Client is production-ready!"
    echo ""
    echo "Next steps:"
    echo "- Task 6: Complete data ingestion pipeline"
    echo "- Task 8: Complete query interface"
    echo "- Task 10: Final integration and validation"
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME RPC CLIENT TESTS FAILED${NC}"
    echo ""
    echo "Please review and fix the failing tests before proceeding."
    echo "Common issues:"
    echo "- Network connectivity to Starknet RPC endpoint"
    echo "- RPC endpoint rate limiting or timeouts"
    echo "- Blockchain data availability for test blocks/transactions"
    
    exit 1
fi
