# Onboarding Components

This directory contains components for the user onboarding flow, specifically designed for the multi-chain wallet indexing system.

## Components

### UnifiedOnboardingForm

A comprehensive form that combines project creation and wallet indexing in a single step. This streamlines the onboarding process by eliminating the need for separate forms.

**Features:**
- Single unified form with logical field ordering
- Real-time address format validation
- Multi-chain wallet address support
- Integrated error handling
- Single-step project creation and wallet indexing

**Field Order:**
1. Company Name (required)
2. Utility Type (required) - DeFi, NFT, Gaming, DAO, Infrastructure, Other
3. Blockchain Network (required) - Multi-chain support
4. Wallet Address (required) - Real-time validation
5. Contract ABI (optional) - Enhanced transaction decoding
6. Wallet Description (optional) - Identification helper

**Usage:**
```tsx
import { UnifiedOnboardingForm } from '@/components/onboarding'

function OnboardingPage() {
  const handleComplete = (projectId: string, walletId: string) => {
    // Handle successful onboarding
    router.push('/dashboard')
  }

  const handleError = (error: string) => {
    // Handle onboarding errors
    console.error('Onboarding failed:', error)
  }

  return (
    <UnifiedOnboardingForm
      onComplete={handleComplete}
      onError={handleError}
    />
  )
}
```

### WalletOnboardingForm

A standalone wallet addition form for adding additional wallets to existing projects.

**Features:**
- Multi-chain support (EVM and Starknet)
- Real-time address validation
- Chain-specific format hints
- Optional wallet descriptions

### OnboardingCard

A wrapper component that provides consistent styling and step indicators for onboarding flows.

### StepIndicator

A visual component showing progress through multi-step onboarding flows.

## Supported Chains

The onboarding system supports the following blockchain networks:

**EVM Chains:**
- Ethereum
- Polygon
- Lisk
- Arbitrum
- Optimism
- BNB Smart Chain

**Starknet:**
- Starknet Mainnet
- Starknet Sepolia

## Address Validation

The system automatically validates wallet addresses based on the selected chain:

- **EVM addresses**: 42-character hexadecimal strings starting with `0x`
- **Starknet addresses**: 64+ character hexadecimal strings starting with `0x`

Real-time validation provides immediate feedback with visual indicators (green checkmark for valid, red X for invalid).

## Flow Overview

1. **Unified Onboarding**: User fills out project info and wallet details in one form
2. **Project Creation**: System creates project with provided information
3. **Wallet Addition**: System adds wallet to project and starts indexing
4. **Dashboard Redirect**: User is redirected to dashboard to monitor indexing progress

## Error Handling

The components include comprehensive error handling:

- Form validation errors (missing fields, invalid formats)
- API errors (network issues, server errors)
- Authentication errors (missing or invalid tokens)
- User-friendly error messages with actionable feedback

## Testing

Components include comprehensive test coverage:

- Form validation testing
- Address format validation
- API integration testing
- Error handling scenarios
- User interaction flows

Run tests with:
```bash
npm test -- onboarding
```