# Contract Requirements Update

## Summary of Changes

This update implements the requested changes to make contract creation more robust and remove pre-configured analysis options.

## Backend Changes

### 1. Required Fields Validation
- **`name`** and **`targetContract`** are now required fields for all contract configurations
- Removed the ability to create contracts without providing these essential details
- Updated validation to return clear error messages when required fields are missing

### 2. Environment-Based RPC Configuration
- **All contracts now use RPC configuration from environment variables**
- Removed `rpcConfig` from required request parameters
- Backend automatically applies RPC endpoints from `.env` file:
  - Ethereum: `ETHEREUM_RPC_URL`, `ETHEREUM_RPC_URL_FALLBACK`
  - Lisk: `LISK_RPC_URL1`, `LISK_RPC_URL2`, `LISK_RPC_URL3`, `LISK_RPC_URL4`
  - Starknet: `STARKNET_RPC_URL1`, `STARKNET_RPC_URL2`, `STARKNET_RPC_URL3`

### 3. ABI Collection and Storage
- **Automatic ABI file saving** for both target contracts and competitors
- When ABI is provided as JSON string, it's automatically saved to `./abis/` directory
- Generated filename format: `{contract-name}-{timestamp}.json`
- Falls back to provided file path if ABI is already a file reference
- Supports both target contract and competitor ABI storage

### 4. API Documentation Updates
- Updated Swagger documentation to reflect new required fields
- Removed `rpcConfig` from required parameters
- Added detailed descriptions for ABI handling

## Frontend Changes

### 1. Removed Pre-configured Analysis
- **Eliminated "Quick Start" option** that used pre-configured USDT analysis
- Removed `useDefaultConfig` state and related UI components
- Deleted `mock-data.ts` file containing hardcoded analysis data

### 2. Enhanced Form Validation
- **Contract address is now required** (marked with asterisk)
- Updated form schema to enforce address requirement
- Improved validation triggers to include address field

### 3. ABI Input Enhancement
- Added **dedicated ABI textarea** for both target contract and competitors
- Clear labeling indicating ABI is optional
- Helpful placeholder text and instructions
- Proper formatting with monospace font for JSON input

### 4. Streamlined User Experience
- Simplified wizard flow without default configuration option
- All users must provide their own contract details
- Consistent validation across all steps
- Better error messaging for missing required fields

## File Changes

### Modified Files
- `src/api/routes/contracts.js` - Updated validation, RPC config, and ABI handling
- `frontend/app/analyzer/page.tsx` - Removed default config, enhanced validation
- `frontend/components/analyzer/chain-selector.tsx` - Cleaned up props

### Deleted Files
- `frontend/components/analyzer/mock-data.ts` - No longer needed

### New Files
- `test-contract-creation.js` - Test script to verify new functionality
- `CONTRACT_REQUIREMENTS_UPDATE.md` - This documentation

## API Changes

### Request Format (Before)
```json
{
  "name": "optional",
  "targetContract": "optional", 
  "rpcConfig": "required"
}
```

### Request Format (After)
```json
{
  "name": "required",
  "targetContract": {
    "address": "required",
    "chain": "required", 
    "name": "required",
    "abi": "optional - JSON string or file path"
  },
  "competitors": [
    {
      "name": "optional",
      "address": "optional",
      "chain": "optional",
      "abi": "optional - JSON string or file path"
    }
  ]
}
```

## Benefits

1. **Consistency**: All users follow the same configuration process
2. **Security**: RPC endpoints managed centrally through environment variables
3. **Flexibility**: Support for custom ABIs while maintaining ease of use
4. **Data Integrity**: Required fields ensure complete contract information
5. **Scalability**: ABI storage system supports growing number of contracts

## Testing

Use the provided `test-contract-creation.js` script to verify:
- Required field validation
- ABI saving functionality  
- Environment-based RPC configuration
- Error handling for invalid inputs

```bash
node test-contract-creation.js
```

## Migration Notes

- Existing contracts with missing required fields will need to be updated
- Frontend users will need to provide contract address (previously optional)
- No more "quick start" option - all analyses require custom configuration