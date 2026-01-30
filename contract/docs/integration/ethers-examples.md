# Ethers.js Integration Examples

Complete examples for integrating MetaGauge using Ethers.js v6.

## Setup

```javascript
const { ethers } = require('ethers');
const subscriptionABI = require('./abi/MetaGaugeSubscription.json');
const tokenABI = require('./abi/MetaGaugeToken.json');

// Connect to Lisk Sepolia
const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
const signer = await provider.getSigner();

// Contract addresses
const SUBSCRIPTION_ADDRESS = '0x577d9A43D0fa564886379bdD9A56285769683C38';
const TOKEN_ADDRESS = '0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D';

// Initialize contracts
const subscription = new ethers.Contract(SUBSCRIPTION_ADDRESS, subscriptionABI, signer);
const token = new ethers.Contract(TOKEN_ADDRESS, tokenABI, signer);
```

## Subscribe (ETH Mode)

```javascript
async function subscribeWithETH(tier, role, cycle, uuid) {
  // Get price
  const planInfo = await subscription.getPlanInfo(tier);
  const price = cycle === 0 ? planInfo.monthlyPrice : planInfo.yearlyPrice;
  
  // Subscribe
  const tx = await subscription.subscribe(
    tier,
    role,
    cycle,
    uuid,
    0, // PaymentCurrency.ETH
    { value: price }
  );
  
  const receipt = await tx.wait();
  console.log('Subscription created:', receipt.hash);
  return receipt;
}

// Example
await subscribeWithETH(1, 0, 0, 'user-uuid-123');
```

## Subscribe (Token Mode)

```javascript
async function subscribeWithToken(tier, role, cycle, uuid) {
  // Get price
  const planInfo = await subscription.getPlanInfo(tier);
  const price = cycle === 0 ? planInfo.monthlyPrice : planInfo.yearlyPrice;
  
  // Approve tokens
  const approveTx = await token.approve(SUBSCRIPTION_ADDRESS, price);
  await approveTx.wait();
  
  // Subscribe
  const tx = await subscription.subscribe(tier, role, cycle, uuid, 4);
  const receipt = await tx.wait();
  
  console.log('Subscription created:', receipt.hash);
  return receipt;
}

// Example
await subscribeWithToken(2, 1, 1, 'researcher-uuid-456');
```

## Get Subscription Info

```javascript
async function getSubscriptionInfo(userAddress) {
  const info = await subscription.getSubscriptionInfo(userAddress);
  
  return {
    userAddress: info.userAddress,
    tier: Number(info.tier),
    role: Number(info.role),
    billingCycle: Number(info.billingCycle),
    startTime: new Date(Number(info.startTime) * 1000),
    endTime: new Date(Number(info.endTime) * 1000),
    isActive: info.isActive,
    amountPaid: ethers.formatEther(info.amountPaid)
  };
}

const info = await getSubscriptionInfo('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log(info);
```

## Cancel Subscription

```javascript
async function cancelSubscription() {
  const tx = await subscription.cancelSubscription();
  const receipt = await tx.wait();
  console.log('Cancelled:', receipt.hash);
  return receipt;
}
```

## Renew Subscription

```javascript
async function renewSubscription() {
  const userAddress = await signer.getAddress();
  const info = await subscription.getSubscriptionInfo(userAddress);
  const planInfo = await subscription.getPlanInfo(info.tier);
  
  const price = info.billingCycle === 0n 
    ? planInfo.monthlyPrice 
    : planInfo.yearlyPrice;
  
  const isTokenMode = await subscription.isTokenPayment();
  
  if (isTokenMode) {
    const approveTx = await token.approve(SUBSCRIPTION_ADDRESS, price);
    await approveTx.wait();
  }
  
  const tx = await subscription.renewSubscription({ value: isTokenMode ? 0 : price });
  const receipt = await tx.wait();
  
  console.log('Renewed:', receipt.hash);
  return receipt;
}
```

## Event Listening

```javascript
// Listen for new subscriptions
subscription.on('SubscriptionCreated', (user, tier, role, billingCycle, startTime, endTime) => {
  console.log('New subscription:', {
    user,
    tier: Number(tier),
    startTime: new Date(Number(startTime) * 1000),
    endTime: new Date(Number(endTime) * 1000)
  });
});

// Listen for cancellations
subscription.on('SubscriptionCancelled', (user) => {
  console.log('Subscription cancelled:', user);
});

// Listen for renewals
subscription.on('SubscriptionRenewed', (user, newEndTime) => {
  console.log('Subscription renewed:', {
    user,
    newEndTime: new Date(Number(newEndTime) * 1000)
  });
});
```

## Query Past Events

```javascript
async function getPastSubscriptions(userAddress) {
  const filter = subscription.filters.SubscriptionCreated(userAddress);
  const events = await subscription.queryFilter(filter, 0, 'latest');
  
  return events.map(event => ({
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    user: event.args.user,
    tier: Number(event.args.tier),
    startTime: new Date(Number(event.args.startTime) * 1000),
    endTime: new Date(Number(event.args.endTime) * 1000)
  }));
}

const history = await getPastSubscriptions('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log(history);
```

## Complete Example

```javascript
async function completeFlow() {
  const userAddress = await signer.getAddress();
  console.log('User:', userAddress);
  
  // Check if already subscribed
  const isActive = await subscription.isSubscriberActive(userAddress);
  if (isActive) {
    console.log('Already subscribed');
    return;
  }
  
  // Subscribe to Starter plan
  await subscribeWithETH(1, 0, 0, `user-${Date.now()}`);
  
  // Verify
  const info = await getSubscriptionInfo(userAddress);
  console.log('Subscription active:', info);
  
  // Setup listeners
  subscription.on('SubscriptionCreated', (user) => {
    console.log('Event: New subscription for', user);
  });
  
  console.log('Flow complete!');
}

completeFlow().catch(console.error);
```

## Next Steps

- [Web3.js Examples](./web3-examples.md) - Web3.js integration examples
- [API Reference](./api-reference.md) - Complete function reference
- [Getting Started](./getting-started.md) - Basic integration guide
