# MetaGauge Contract ABIs

This directory contains the Application Binary Interfaces (ABIs) for all MetaGauge smart contracts. These ABIs are essential for integrating with the MetaGauge subscription system.

## Available Contracts

### MetaGaugeSubscription
The core subscription management contract handling user subscriptions, billing cycles, and payments.

**ABI File:** `MetaGaugeSubscription.json`

**Key Functions:**
- `subscribe(tier, role, billingCycle, userUUID, currency)` - Create a new subscription
- `cancelSubscription()` - Cancel active subscription with pro-rata refund
- `renewSubscription()` - Renew subscription for another billing period
- `changeSubscription(newTier, newCycle)` - Change subscription tier or billing cycle
- `getSubscriptionInfo(address)` - Get subscription details for a user
- `isSubscriberActive(address)` - Check if user has active subscription

### MetaGaugeToken
ERC20 token contract for the MetaGauge Token (MGT) used for subscription payments in token mode.

**ABI File:** `MetaGaugeToken.json`

**Key Functions:**
- Standard ERC20 functions: `transfer`, `approve`, `transferFrom`, `balanceOf`, etc.
- `mint(to, amount)` - Mint new tokens (owner only)
- `maxSupply()` - Get maximum token supply (500M MGT)

### MetaGaugeAccessControl
Access control contract providing owner and operator role management.

**ABI File:** `MetaGaugeAccessControl.json`

**Key Functions:**
- `addOperator(address)` - Add an operator
- `removeOperator(address)` - Remove an operator
- `pause()` - Pause contract operations
- `unpause()` - Resume contract operations

## Deployed Contract Addresses

See `addresses.json` for deployed contract addresses on all supported networks.

### Lisk Sepolia Testnet
- **Chain ID:** 4202
- **RPC URL:** https://rpc.sepolia-api.lisk.com
- **Explorer:** https://sepolia-blockscout.lisk.com
- **MetaGaugeToken:** `0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D`
- **MetaGaugeSubscription:** `0x577d9A43D0fa564886379bdD9A56285769683C38`

### Lisk Mainnet
- **Chain ID:** 1135
- **RPC URL:** https://rpc.api.lisk.com
- **Explorer:** https://blockscout.lisk.com
- **Status:** Not yet deployed

## Integration Examples

### Using Web3.js

```javascript
const Web3 = require('web3');
const subscriptionABI = require('./MetaGaugeSubscription.json');

// Connect to Lisk Sepolia
const web3 = new Web3('https://rpc.sepolia-api.lisk.com');

// Initialize contract
const subscriptionAddress = '0x577d9A43D0fa564886379bdD9A56285769683C38';
const subscription = new web3.eth.Contract(subscriptionABI, subscriptionAddress);

// Subscribe to Starter plan (monthly)
async function subscribe() {
  const accounts = await web3.eth.getAccounts();
  
  await subscription.methods.subscribe(
    1, // SubscriptionTier.Starter
    0, // UserRole.Startup
    0, // BillingCycle.Monthly
    'user-uuid-123',
    0  // PaymentCurrency.ETH
  ).send({
    from: accounts[0],
    value: web3.utils.toWei('0.01', 'ether')
  });
}

// Check subscription status
async function checkSubscription(userAddress) {
  const isActive = await subscription.methods.isSubscriberActive(userAddress).call();
  const info = await subscription.methods.getSubscriptionInfo(userAddress).call();
  
  console.log('Active:', isActive);
  console.log('Tier:', info.tier);
  console.log('End Time:', new Date(info.endTime * 1000));
}
```

### Using Ethers.js

```javascript
const { ethers } = require('ethers');
const subscriptionABI = require('./MetaGaugeSubscription.json');

// Connect to Lisk Sepolia
const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
const signer = provider.getSigner();

// Initialize contract
const subscriptionAddress = '0x577d9A43D0fa564886379bdD9A56285769683C38';
const subscription = new ethers.Contract(subscriptionAddress, subscriptionABI, signer);

// Subscribe to Pro plan (yearly)
async function subscribe() {
  const tx = await subscription.subscribe(
    2, // SubscriptionTier.Pro
    1, // UserRole.Researcher
    1, // BillingCycle.Yearly
    'researcher-uuid-456',
    0, // PaymentCurrency.ETH
    {
      value: ethers.parseEther('0.3')
    }
  );
  
  await tx.wait();
  console.log('Subscription created:', tx.hash);
}

// Get subscription details
async function getSubscription(userAddress) {
  const info = await subscription.getSubscriptionInfo(userAddress);
  
  return {
    tier: info.tier,
    role: info.role,
    billingCycle: info.billingCycle,
    startTime: new Date(Number(info.startTime) * 1000),
    endTime: new Date(Number(info.endTime) * 1000),
    isActive: info.isActive,
    amountPaid: ethers.formatEther(info.amountPaid)
  };
}
```

### Token Mode Integration

When using token mode, you need to approve tokens before subscribing:

```javascript
const tokenABI = require('./MetaGaugeToken.json');
const tokenAddress = '0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D';
const token = new ethers.Contract(tokenAddress, tokenABI, signer);

// Approve tokens for subscription
async function approveAndSubscribe() {
  // Approve tokens
  const amount = ethers.parseEther('0.01'); // Starter monthly price
  const approveTx = await token.approve(subscriptionAddress, amount);
  await approveTx.wait();
  
  // Subscribe
  const subscribeTx = await subscription.subscribe(
    1, // SubscriptionTier.Starter
    0, // UserRole.Startup
    0, // BillingCycle.Monthly
    'user-uuid-789',
    4  // PaymentCurrency.Token
  );
  
  await subscribeTx.wait();
}
```

## Subscription Tiers

```javascript
const SubscriptionTier = {
  Free: 0,
  Starter: 1,
  Pro: 2,
  Enterprise: 3
};
```

## User Roles

```javascript
const UserRole = {
  Startup: 0,
  Researcher: 1,
  Admin: 2
};
```

## Billing Cycles

```javascript
const BillingCycle = {
  Monthly: 0,
  Yearly: 1
};
```

## Payment Currency

```javascript
const PaymentCurrency = {
  ETH: 0,
  USDC: 1,
  LSK: 2,
  NATIVE: 3,
  Token: 4
};
```

## Pricing

### ETH Mode Pricing

| Tier | Monthly | Yearly |
|------|---------|--------|
| Free | 0 ETH | 0 ETH |
| Starter | 0.01 ETH | 0.1 ETH |
| Pro | 0.034 ETH | 0.3 ETH |
| Enterprise | 0.103 ETH | 1.0 ETH |

### Token Mode Pricing

Same pricing structure applies when using MGT tokens (1 MGT = 1 wei equivalent).

## Events

### SubscriptionCreated
Emitted when a new subscription is created.

```javascript
subscription.on('SubscriptionCreated', (user, tier, role, billingCycle, startTime, endTime) => {
  console.log(`New subscription for ${user}`);
  console.log(`Tier: ${tier}, Cycle: ${billingCycle}`);
});
```

### SubscriptionCancelled
Emitted when a subscription is cancelled.

```javascript
subscription.on('SubscriptionCancelled', (user) => {
  console.log(`Subscription cancelled for ${user}`);
});
```

### SubscriptionRenewed
Emitted when a subscription is renewed.

```javascript
subscription.on('SubscriptionRenewed', (user, newEndTime) => {
  console.log(`Subscription renewed for ${user} until ${new Date(newEndTime * 1000)}`);
});
```

### SubscriptionChanged
Emitted when a subscription tier or billing cycle is changed.

```javascript
subscription.on('SubscriptionChanged', (user, newTier, newCycle) => {
  console.log(`Subscription changed for ${user} to tier ${newTier}`);
});
```

## Error Handling

The contracts use custom errors for gas efficiency. Common errors include:

- `AlreadySubscribed()` - User already has an active subscription
- `NoActiveSubscription()` - User doesn't have an active subscription
- `InvalidSubscriptionTier()` - Invalid tier specified
- `InvalidUserRole()` - Invalid role specified
- `TierNotActive()` - Subscription tier is not currently active
- `InsufficientPayment(required, provided)` - Payment amount doesn't match required amount
- `RenewalNotAvailable()` - Subscription cannot be renewed at this time
- `SubscriptionCancelled()` - Subscription has been cancelled

## Support

For integration support:
- Documentation: See `/docs` directory
- Issues: GitHub Issues
- Community: [Discord/Telegram link]

## License

MIT License - See LICENSE file for details
