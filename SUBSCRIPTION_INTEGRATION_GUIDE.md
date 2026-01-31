# MetaGauge Subscription System Integration Guide

## Overview

This guide explains how the subscription payment system has been integrated into your MetaGauge application, following the payment flow you outlined.

## 🏗️ Architecture

### Smart Contracts
1. **MetaGaugeToken (MGT)** - ERC20 token for payments
2. **MetaGaugeSubscription** - Main subscription management contract
3. **MetaGaugeFaucet** - Testnet faucet for free tokens

### Frontend Components
1. **Web3Provider** - Wagmi configuration and wallet connection
2. **WalletConnect** - Wallet connection modal
3. **SubscriptionFlow** - Complete subscription journey
4. **PlanSelector** - Subscription tier selection
5. **SubscriptionStatus** - Dashboard subscription display

### Hooks
1. **useSubscription** - Subscription state management
2. **useMarathonSync** - Existing sync functionality (preserved)

## 🚀 User Journey Implementation

### 1. Onboarding Flow
```
Contract Setup → Indexing → Subscription Choice
                              ↓
                    [Choose Plan] or [Continue Free]
```

### 2. Subscription Flow
```
Connect Wallet → Check Balance → Faucet (if needed) → Select Plan → Approve → Subscribe → Success
```

### 3. Dashboard Integration
- Subscription status card showing current plan
- Usage metrics and limits
- Upgrade/manage buttons

## 📦 Installation & Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

New dependencies added:
- `ethers` - Ethereum library
- `wagmi` - React hooks for Ethereum
- `@wagmi/core` - Core wagmi functionality
- `@wagmi/connectors` - Wallet connectors
- `@tanstack/react-query` - Data fetching
- `viem` - TypeScript Ethereum library

### 2. Environment Configuration

Create `frontend/.env.local`:
```env
# Web3 Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Contract Addresses - Testnet
NEXT_PUBLIC_MGT_TOKEN_TESTNET=0x...
NEXT_PUBLIC_SUBSCRIPTION_TESTNET=0x...
NEXT_PUBLIC_FAUCET_TESTNET=0x...

# Contract Addresses - Mainnet (when ready)
NEXT_PUBLIC_MGT_TOKEN_MAINNET=0x...
NEXT_PUBLIC_SUBSCRIPTION_MAINNET=0x...
```

### 3. Deploy Contracts

```bash
cd contract
# Compile contracts (using your preferred method)
# Update deploy.js with compiled artifacts
node deploy.js
```

## 🎯 Subscription Tiers

| Tier | Price | API Calls | Projects | Features |
|------|-------|-----------|----------|----------|
| Free | 0 MGT | 100/month | 1 | Basic analytics |
| Starter | 12 MGT | 1,000/month | 3 | Export, Comparison |
| Pro | 20 MGT | 5,000/month | 10 | + Wallet Intelligence, API |
| Enterprise | 400 MGT | 50,000/month | 100 | + Priority Support, Custom |

## 🔧 Integration Points

### 1. Onboarding Page Updates
- Added subscription choice after contract indexing
- Users can choose plan or continue with free tier

### 2. Dashboard Enhancements
- Subscription status card
- Usage metrics display
- Plan management buttons

### 3. New Routes
- `/subscription` - Full subscription flow page
- Integrated with existing auth system

## 🧪 Testing Flow

### Testnet Testing
1. Connect wallet to testnet (Sepolia/Lisk Sepolia)
2. Use faucet to get test MGT tokens
3. Test subscription flow end-to-end
4. Verify subscription status on dashboard

### Local Development
```bash
# Start frontend
cd frontend
npm run dev

# Start backend (existing)
cd ..
npm run dev
```

## 🔐 Security Considerations

### Smart Contract Security
- ReentrancyGuard on all state-changing functions
- Access control with Ownable pattern
- Input validation and error handling
- Grace period for expired subscriptions

### Frontend Security
- Wallet connection validation
- Transaction confirmation flows
- Error handling for failed transactions
- Balance checks before operations

## 🎨 UI/UX Features

### Wallet Connection
- Multi-wallet support (MetaMask, WalletConnect)
- Connection status indicators
- Address display with copy functionality

### Subscription Flow
- Step-by-step progress indicator
- Clear error messages
- Transaction status tracking
- Auto-progression through steps

### Dashboard Integration
- Subscription status at a glance
- Usage tracking and limits
- Upgrade prompts and CTAs

## 🔄 State Management

### Subscription State
```typescript
interface SubscriptionInfo {
  tier: SubscriptionTier
  isActive: boolean
  endTime: bigint
  daysRemaining: number
  isInGracePeriod: boolean
}
```

### Integration with Existing Auth
- Preserves existing user authentication
- Links wallet address to user account
- Maintains session management

## 🚀 Deployment Checklist

### Testnet Deployment
- [ ] Deploy contracts to testnet
- [ ] Update environment variables
- [ ] Fund faucet with test tokens
- [ ] Test complete user journey
- [ ] Verify subscription enforcement

### Mainnet Deployment
- [ ] Deploy contracts to mainnet
- [ ] Update contract addresses
- [ ] Remove/disable faucet functionality
- [ ] Enable real token payments
- [ ] Monitor subscription metrics

## 🔧 Customization Options

### Plan Configuration
Update `SUBSCRIPTION_PLANS` in `web3-config.ts` to modify:
- Pricing
- Feature limits
- Plan names and descriptions

### UI Theming
All components use your existing design system:
- Tailwind CSS classes
- Radix UI components
- Consistent with current styling

### Contract Parameters
Modify contract constants for:
- Grace periods
- Plan pricing
- Feature limits

## 📊 Analytics Integration

### Subscription Metrics
Track in your existing analytics:
- Subscription conversions
- Plan upgrade/downgrade rates
- Churn analysis
- Revenue metrics

### Usage Enforcement
Backend integration points for:
- API call limiting
- Feature access control
- Usage tracking
- Subscription validation

## 🆘 Troubleshooting

### Common Issues

1. **Wallet Connection Fails**
   - Check network configuration
   - Verify WalletConnect project ID
   - Ensure wallet is on correct network

2. **Transaction Fails**
   - Check token balance
   - Verify contract addresses
   - Ensure sufficient gas

3. **Subscription Not Recognized**
   - Verify contract deployment
   - Check subscription status on-chain
   - Refresh subscription state

### Debug Tools
- Browser console for Web3 errors
- Etherscan/block explorer for transactions
- Wagmi dev tools for connection issues

## 🔮 Future Enhancements

### Planned Features
- NFT subscription passes
- Team/organization accounts
- Gasless renewals with meta-transactions
- Subscription gifting
- Usage-based pricing tiers

### Integration Opportunities
- Payment gateway for fiat purchases
- Subscription analytics dashboard
- Automated renewal reminders
- Loyalty rewards program

## 📞 Support

For implementation questions:
1. Check this guide first
2. Review component documentation
3. Test on testnet before mainnet
4. Monitor transaction logs for errors

The subscription system is now fully integrated and ready for testing! 🎉