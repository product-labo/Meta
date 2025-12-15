#!/bin/bash

# Comprehensive Endpoint Testing with curl
# Tests all Zcash Paywall API endpoints

BASE_URL="http://localhost:3000"
TEST_EMAIL="curl-test@example.com"
API_KEY=""
USER_ID=""
INVOICE_ID=""
WITHDRAWAL_ID=""
KEY_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
log() {
    echo -e "${2:-$NC}$1${NC}"
}

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local auth_header="$5"
    local expected_status="${6:-200}"
    
    TOTAL=$((TOTAL + 1))
    log "🧪 Testing: $name" "$CYAN"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ ! -z "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
    fi
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    local response=$(eval $curl_cmd)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log "✅ PASS: $name (Status: $status_code)" "$GREEN"
        PASSED=$((PASSED + 1))
        echo "$body"
        return 0
    else
        log "❌ FAIL: $name (Expected: $expected_status, Got: $status_code)" "$RED"
        log "Response: $body" "$RED"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

extract_field() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -o "\"$field\":\"[^\"]*\"" | cut -d'"' -f4
}

extract_field_unquoted() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -o "\"$field\":[^,}]*" | cut -d':' -f2 | tr -d ' '
}

log "🚀 Starting Comprehensive Endpoint Testing with curl" "$BOLD"
log "📍 Base URL: $BASE_URL" "$BLUE"
log "📧 Test Email: $TEST_EMAIL" "$BLUE"

# Check if server is running
log "\n📊 Testing Health & Info Endpoints" "$BOLD"

if ! test_endpoint "Health Check" "GET" "/health"; then
    log "💥 Server is not running or not responding. Please start the server first." "$RED"
    exit 1
fi

test_endpoint "API Info" "GET" "/api"

# Test User Endpoints
log "\n👤 Testing User Endpoints" "$BOLD"

# Create user
user_data='{"email":"'$TEST_EMAIL'","name":"Curl Test User"}'
response=$(test_endpoint "Create User" "POST" "/api/users/create" "$user_data")
if [ $? -eq 0 ]; then
    USER_ID=$(extract_field "$response" "id")
    log "📝 Created user ID: $USER_ID" "$BLUE"
fi

if [ ! -z "$USER_ID" ]; then
    test_endpoint "Get User by ID" "GET" "/api/users/$USER_ID"
    test_endpoint "Get User by Email" "GET" "/api/users/email/$TEST_EMAIL"
    
    update_data='{"name":"Updated Curl Test User"}'
    test_endpoint "Update User" "PUT" "/api/users/$USER_ID" "$update_data"
    
    test_endpoint "Get User Balance" "GET" "/api/users/$USER_ID/balance"
fi

# Test API Key Endpoints
log "\n🔑 Testing API Key Endpoints" "$BOLD"

if [ ! -z "$USER_ID" ]; then
    # Create API key
    key_data='{"user_id":"'$USER_ID'","name":"Curl Test Key","permissions":["read","write","admin"],"expires_in_days":30}'
    response=$(test_endpoint "Create API Key" "POST" "/api/keys/create" "$key_data")
    if [ $? -eq 0 ]; then
        API_KEY=$(extract_field "$response" "api_key")
        KEY_ID=$(extract_field "$response" "id")
        log "🔑 Created API key: ${API_KEY:0:20}..." "$BLUE"
        log "📝 Key ID: $KEY_ID" "$BLUE"
    fi
    
    if [ ! -z "$API_KEY" ]; then
        test_endpoint "List User API Keys" "GET" "/api/keys/user/$USER_ID" "" "$API_KEY"
        
        if [ ! -z "$KEY_ID" ]; then
            test_endpoint "Get API Key Details" "GET" "/api/keys/$KEY_ID" "" "$API_KEY"
            
            update_key_data='{"name":"Updated Curl Test Key"}'
            test_endpoint "Update API Key" "PUT" "/api/keys/$KEY_ID" "$update_key_data" "$API_KEY"
            
            response=$(test_endpoint "Regenerate API Key" "POST" "/api/keys/$KEY_ID/regenerate" "" "$API_KEY")
            if [ $? -eq 0 ]; then
                NEW_API_KEY=$(extract_field "$response" "api_key")
                if [ ! -z "$NEW_API_KEY" ]; then
                    API_KEY="$NEW_API_KEY"
                    log "🔄 Updated API key: ${API_KEY:0:20}..." "$BLUE"
                fi
            fi
        fi
    fi
fi

# Test Invoice Endpoints
log "\n🧾 Testing Invoice Endpoints" "$BOLD"

if [ ! -z "$USER_ID" ]; then
    # Create invoice
    invoice_data='{"user_id":"'$USER_ID'","type":"one_time","amount_zec":0.01,"description":"Curl test invoice"}'
    response=$(test_endpoint "Create Invoice" "POST" "/api/invoice/create" "$invoice_data" "$API_KEY")
    if [ $? -eq 0 ]; then
        INVOICE_ID=$(extract_field "$response" "id")
        log "📝 Created invoice ID: $INVOICE_ID" "$BLUE"
    fi
    
    if [ ! -z "$INVOICE_ID" ]; then
        test_endpoint "Get Invoice by ID" "GET" "/api/invoice/$INVOICE_ID" "" "$API_KEY"
        test_endpoint "Get Invoice QR Code" "GET" "/api/invoice/$INVOICE_ID/qr" "" "$API_KEY"
        test_endpoint "Get Payment URI" "GET" "/api/invoice/$INVOICE_ID/uri" "" "$API_KEY"
        
        check_data='{"invoice_id":"'$INVOICE_ID'"}'
        test_endpoint "Check Payment Status" "POST" "/api/invoice/check" "$check_data" "$API_KEY"
        
        test_endpoint "Get User Invoices" "GET" "/api/invoice/user/$USER_ID" "" "$API_KEY"
    fi
fi

# Test Withdrawal Endpoints
log "\n💰 Testing Withdrawal Endpoints" "$BOLD"

if [ ! -z "$USER_ID" ]; then
    # Fee estimate
    fee_data='{"amount_zec":0.01,"to_address":"zs1test..."}'
    test_endpoint "Estimate Withdrawal Fee" "POST" "/api/withdraw/fee-estimate" "$fee_data" "$API_KEY"
    
    # Create withdrawal
    withdrawal_data='{"user_id":"'$USER_ID'","amount_zec":0.005,"to_address":"zs1test...","description":"Curl test withdrawal"}'
    response=$(test_endpoint "Create Withdrawal" "POST" "/api/withdraw/create" "$withdrawal_data" "$API_KEY")
    if [ $? -eq 0 ]; then
        WITHDRAWAL_ID=$(extract_field "$response" "id")
        log "📝 Created withdrawal ID: $WITHDRAWAL_ID" "$BLUE"
    fi
    
    if [ ! -z "$WITHDRAWAL_ID" ]; then
        test_endpoint "Get Withdrawal by ID" "GET" "/api/withdraw/$WITHDRAWAL_ID" "" "$API_KEY"
        test_endpoint "Get User Withdrawals" "GET" "/api/withdraw/user/$USER_ID" "" "$API_KEY"
    fi
fi

# Test Admin Endpoints
log "\n👑 Testing Admin Endpoints" "$BOLD"

if [ ! -z "$API_KEY" ]; then
    test_endpoint "Get Admin Stats" "GET" "/api/admin/stats" "" "$API_KEY"
    test_endpoint "Get Pending Withdrawals" "GET" "/api/admin/withdrawals/pending" "" "$API_KEY"
    test_endpoint "Get Admin Balances" "GET" "/api/admin/balances" "" "$API_KEY"
    test_endpoint "Get Revenue" "GET" "/api/admin/revenue" "" "$API_KEY"
    test_endpoint "Get Subscriptions" "GET" "/api/admin/subscriptions" "" "$API_KEY"
    test_endpoint "Get Node Status" "GET" "/api/admin/node-status" "" "$API_KEY"
    test_endpoint "List All Users (Admin)" "GET" "/api/users" "" "$API_KEY"
    
    if [ ! -z "$WITHDRAWAL_ID" ]; then
        # This might fail due to insufficient funds, which is expected
        test_endpoint "Process Withdrawal (Admin)" "POST" "/api/withdraw/process/$WITHDRAWAL_ID" "" "$API_KEY" "200|400|500"
    fi
fi

# Test Authentication Scenarios
log "\n🔐 Testing Authentication Scenarios" "$BOLD"

# Test unauthorized access
test_endpoint "Unauthorized Admin Access" "GET" "/api/admin/stats" "" "" "401"

# Test invalid API key
test_endpoint "Invalid API Key" "GET" "/api/admin/stats" "" "zp_invalid_key_12345" "401"

# Cleanup
log "\n🧹 Cleaning up..." "$BLUE"

if [ ! -z "$API_KEY" ] && [ ! -z "$KEY_ID" ]; then
    test_endpoint "Deactivate API Key" "DELETE" "/api/keys/$KEY_ID" "" "$API_KEY"
fi

# Print summary
log "\n📊 Test Results Summary" "$BOLD"
log "✅ Passed: $PASSED" "$GREEN"
log "❌ Failed: $FAILED" "$RED"
log "📊 Total: $TOTAL" "$BLUE"

if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED * 100) / TOTAL ))
    if [ $SUCCESS_RATE -gt 80 ]; then
        log "🎯 Success Rate: ${SUCCESS_RATE}%" "$GREEN"
    else
        log "🎯 Success Rate: ${SUCCESS_RATE}%" "$RED"
    fi
fi

if [ $FAILED -gt 0 ]; then
    log "\n⚠️  Some tests failed. Check the output above for details." "$YELLOW"
    exit 1
else
    log "\n🎉 All tests passed!" "$GREEN"
    exit 0
fi