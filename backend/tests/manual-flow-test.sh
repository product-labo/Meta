#!/bin/bash

# Manual Flow Test Script
# Run each step manually to test the complete user journey

BASE_URL="http://localhost:3000"
API_KEY="test-api-key"

echo "🚀 Manual Flow Test for Zcash Paywall"
echo "====================================="
echo "Base URL: $BASE_URL"
echo "API Key: $API_KEY"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📝 STEP 1: Create User${NC}"
echo "=========================="

USER_DATA='{
  "email": "testuser@example.com",
  "name": "Test User"
}'

echo "Creating user..."
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$USER_DATA")

echo "Response: $USER_RESPONSE"

# Extract user ID (you might need to adjust this based on your response format)
USER_ID=$(echo $USER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo -e "${GREEN}User ID: $USER_ID${NC}"

echo ""
echo -e "${BLUE}🧾 STEP 2: Create Invoice${NC}"
echo "=========================="

INVOICE_DATA="{
  \"user_id\": $USER_ID,
  \"type\": \"one_time\",
  \"amount_zec\": 0.001,
  \"item_id\": \"test-item-001\"
}"

echo "Creating invoice..."
INVOICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/invoice/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$INVOICE_DATA")

echo "Response: $INVOICE_RESPONSE"

# Extract invoice details
INVOICE_ID=$(echo $INVOICE_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
Z_ADDRESS=$(echo $INVOICE_RESPONSE | grep -o '"z_address":"[^"]*"' | cut -d'"' -f4)

echo ""
echo -e "${YELLOW}⚠️  PAYMENT REQUIRED ⚠️${NC}"
echo "======================="
echo -e "${GREEN}Invoice ID: $INVOICE_ID${NC}"
echo -e "${GREEN}Payment Address: $Z_ADDRESS${NC}"
echo -e "${GREEN}Amount: 0.001 ZEC${NC}"
echo ""
echo -e "${RED}🎯 ACTION: Send exactly 0.001 ZEC to the address above!${NC}"
echo ""

echo -e "${BLUE}💳 STEP 3: Check Payment (run after sending ZEC)${NC}"
echo "=============================================="

CHECK_PAYMENT_DATA="{\"invoice_id\": $INVOICE_ID}"

echo "Command to check payment:"
echo "curl -X POST \"$BASE_URL/api/invoice/check\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"X-API-Key: $API_KEY\" \\"
echo "  -d '$CHECK_PAYMENT_DATA'"

echo ""
echo -e "${BLUE}💰 STEP 4: Check User Balance${NC}"
echo "============================="

echo "Command to check balance:"
echo "curl -X GET \"$BASE_URL/api/users/$USER_ID/balance\" \\"
echo "  -H \"X-API-Key: $API_KEY\""

echo ""
echo -e "${BLUE}💸 STEP 5: Create Withdrawal${NC}"
echo "============================"

WITHDRAWAL_DATA="{
  \"user_id\": $USER_ID,
  \"to_address\": \"t1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN\",
  \"amount_zec\": 0.0005
}"

echo "Command to create withdrawal:"
echo "curl -X POST \"$BASE_URL/api/withdraw/create\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"X-API-Key: $API_KEY\" \\"
echo "  -d '$WITHDRAWAL_DATA'"

echo ""
echo -e "${BLUE}⚙️  STEP 6: Process Withdrawal (Admin)${NC}"
echo "====================================="

echo "Command to process withdrawal (replace WITHDRAWAL_ID):"
echo "curl -X POST \"$BASE_URL/api/withdraw/process/WITHDRAWAL_ID\" \\"
echo "  -H \"X-API-Key: $API_KEY\""

echo ""
echo -e "${GREEN}📋 Summary${NC}"
echo "=========="
echo "1. User created with ID: $USER_ID"
echo "2. Invoice created with ID: $INVOICE_ID"
echo "3. Send 0.001 ZEC to: $Z_ADDRESS"
echo "4. Check payment status using the curl command above"
echo "5. Create and process withdrawal"

echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "- Use a Zcash testnet faucet to get test ZEC"
echo "- Monitor the payment with the check command"
echo "- Ensure your backend is running on $BASE_URL"
echo "- Check logs for any errors"