# Getting Started with MetaGauge Integration

This guide will help you integrate MetaGauge subscription contracts into your application.

## Prerequisites

- Node.js 16+ installed
- Basic knowledge of Web3.js or Ethers.js
- MetaGauge contract addresses (see [addresses.json](../../abi/addresses.json))
- Contract ABIs (see [/abi directory](../../abi/))

## Installation

### Using Web3.js

```bash
npm install web3
```

### Using Ethers.js

```bash
npm install ethers
```

## Quick Start

### 1. Connect to Lisk Network

```javascript
// Web3.js
const Web3 = require('web3');
const web3 = new Web3('https://rpc.sepolia-api.lisk.com');

// Ethers.js
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
```

### 2. Load Contract ABI

```javascript
const subscriptionABI = require('./abi/MetaGaugeSubscription.json');
const subscriptionAddress = '0x577d9A43D0fa564886379bdD9A56285769683C38'; // Lisk Sepolia
```

### 3. Initialize Contract

```javascript
// Web3.js
const subscription = new web3.eth.Contract(subscriptionABI, subscriptionAddress);

// Ethers.js
const subscription = new ethers.Contract(subscriptionAddress, subscriptionABI, provider);
```

## Basic Operations

### Subscribe to a Plan

```javascript
// ETH Mode
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
```

### Check Subscription Status

```javascript
async function checkStatus(userAddress) {
  const isActive = await subscription.methods.isSubscriberActive(userAddress).call();
  const info = await subscription.methods.getSubscriptionInfo(userAddress).call();
  
  return {
    isActive,
    tier: info.tier,
    endTime: new Date(info.endTime * 1000)
  };
}
```

### Cancel Subscription

```javascript
async function cancel() {
  const accounts = await web3.eth.getAccounts();
  await subscription.methods.cancelSubscription().send({ from: accounts[0] });
}
```

## Enums and Constants

```javascript
const SubscriptionTier = {
  Free: 0,
  Starter: 1,
  Pro: 2,
  Enterprise: 3
};

const UserRole = {
  Startup: 0,
  Researcher: 1,
  Admin: 2
};

const BillingCycle = {
  Monthly: 0,
  Yearly: 1
};

const PaymentCurrency = {
  ETH: 0,
  USDC: 1,
  LSK: 2,
  NATIVE: 3,
  Token: 4
};
```

## Event Listening

```javascript
// Listen for new subscriptions
subscription.events.SubscriptionCreated({
  fromBlock: 'latest'
}, (error, event) => {
  if (error) console.error(error);
  console.log('New subscription:', event.returnValues);
});

// Listen for cancellations
subscription.events.SubscriptionCancelled({
  fromBlock: 'latest'
}, (error, event) => {
  if (error) console.error(error);
  console.log('Subscription cancelled:', event.returnValues.user);
});
```

## Error Handling

```javascript
async function safeSubscribe() {
  try {
    await subscribe();
    console.log('Subscription successful!');
  } catch (error) {
    if (error.message.includes('AlreadySubscribed')) {
      console.error('User already has an active subscription');
    } else if (error.message.includes('InsufficientPayment')) {
      console.error('Payment amount is incorrect');
    } else {
      console.error('Subscription failed:', error.message);
    }
  }
}
```

## Next Steps

- [Web3.js Examples](./web3-examples.md) - Detailed Web3.js integration examples
- [Ethers.js Examples](./ethers-examples.md) - Detailed Ethers.js integration examples
- [API Reference](./api-reference.md) - Complete function reference
- [Contract ABIs](../../abi/) - Contract interfaces

## Support

- GitHub Issues: Report bugs or request features
- Documentation: See [/docs](../) for comprehensive guides
- Community: Join our Discord/Telegram for support
