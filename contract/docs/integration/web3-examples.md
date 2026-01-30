# Web3.js Integration Examples

Complete examples for integrating MetaGauge using Web3.js.

## Setup

```javascript
const Web3 = require('web3');
const subscriptionABI = require('./abi/MetaGaugeSubscription.json');
const tokenABI = require('./abi/MetaGaugeToken.json');

// Connect to Lisk Sepolia
const web3 = new Web3('https://rpc.sepolia-api.lisk.com');

// Contract addresses
const SUBSCRIPTION_ADDRESS = '0x577d9A43D0fa564886379bdD9A56285769683C38';
const TOKEN_ADDRESS = '0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D';

// Initialize contracts
const subscription = new web3.eth.Contract(subscriptionABI, SUBSCRIPTION_ADDRESS);
const token = new web3.eth.Contract(tokenABI, TOKEN_ADDRESS);
```

## Subscription Operations

### Subscribe (ETH Mode)

```javascript
async function subscribeWithETH(tier, role, cycle, uuid) {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];
  
  // Get price for tier and cycle
  const planInfo = await subscription.methods.getPlanInfo(tier).call();
  const price = cycle === 0 ? planInfo.monthlyPrice : planInfo.yearlyPrice;
  
  // Subscribe
  const receipt = await subscription.methods.subscribe(
    tier,
    role,
    cycle,
    uuid,
    0 // PaymentCurrency.ETH
  ).send({
    from,
    value: price,
    gas: 300000
  });
  
  console.log('Subscription created:', receipt.transactionHash);
  return receipt;
}

// Example usage
await subscribeWithETH(
  1, // Starter
  0, // Startup
  0, // Monthly
  'user-uuid-123'
);
```

### Subscribe (Token Mode)

```javascript
async function subscribeWithToken(tier, role, cycle, uuid) {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];
  
  // Get price
  const planInfo = await subscription.methods.getPlanInfo(tier).call();
  const price = cycle === 0 ? planInfo.monthlyPrice : planInfo.yearlyPrice;
  
  // Step 1: Approve tokens
  await token.methods.approve(SUBSCRIPTION_ADDRESS, price).send({
    from,
    gas: 100000
  });
  
  console.log('Tokens approved');
  
  // Step 2: Subscribe
  const receipt = await subscription.methods.subscribe(
    tier,
    role,
    cycle,
    uuid,
    4 // PaymentCurrency.Token
  ).send({
    from,
    gas: 300000
  });
  
  console.log('Subscription created:', receipt.transactionHash);
  return receipt;
}

// Example usage
await subscribeWithToken(
  2, // Pro
  1, // Researcher
  1, // Yearly
  'researcher-uuid-456'
);
```

### Get Subscription Info

```javascript
async function getSubscriptionInfo(userAddress) {
  const info = await subscription.methods.getSubscriptionInfo(userAddress).call();
  
  return {
    userAddress: info.userAddress,
    tier: parseInt(info.tier),
    role: parseInt(info.role),
    billingCycle: parseInt(info.billingCycle),
    startTime: new Date(parseInt(info.startTime) * 1000),
    endTime: new Date(parseInt(info.endTime) * 1000),
    periodStart: new Date(parseInt(info.periodStart) * 1000),
    periodEnd: new Date(parseInt(info.periodEnd) * 1000),
    isActive: info.isActive,
    cancelAtPeriodEnd: info.cancelAtPeriodEnd,
    gracePeriodEnd: new Date(parseInt(info.gracePeriodEnd) * 1000),
    amountPaid: web3.utils.fromWei(info.amountPaid, 'ether'),
    currency: parseInt(info.currency)
  };
}

// Example usage
const info = await getSubscriptionInfo('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log('Subscription Info:', info);
```

### Check if Subscription is Active

```javascript
async function isActive(userAddress) {
  const active = await subscription.methods.isSubscriberActive(userAddress).call();
  return active;
}

// Example usage
const active = await isActive('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log('Is Active:', active);
```

### Cancel Subscription

```javascript
async function cancelSubscription() {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];
  
  const receipt = await subscription.methods.cancelSubscription().send({
    from,
    gas: 200000
  });
  
  console.log('Subscription cancelled:', receipt.transactionHash);
  
  // Check for refund in events
  const events = receipt.events.SubscriptionCancelled;
  if (events) {
    console.log('Cancellation confirmed for:', events.returnValues.user);
  }
  
  return receipt;
}

// Example usage
await cancelSubscription();
```

### Renew Subscription

```javascript
async function renewSubscription() {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];
  
  // Get current subscription info
  const info = await subscription.methods.getSubscriptionInfo(from).call();
  const planInfo = await subscription.methods.getPlanInfo(info.tier).call();
  
  // Calculate renewal price
  const price = info.billingCycle === '0' 
    ? planInfo.monthlyPrice 
    : planInfo.yearlyPrice;
  
  // Check if token mode
  const isTokenMode = await subscription.methods.isTokenPayment().call();
  
  if (isTokenMode) {
    // Approve tokens first
    await token.methods.approve(SUBSCRIPTION_ADDRESS, price).send({ from });
  }
  
  // Renew
  const receipt = await subscription.methods.renewSubscription().send({
    from,
    value: isTokenMode ? 0 : price,
    gas: 200000
  });
  
  console.log('Subscription renewed:', receipt.transactionHash);
  return receipt;
}

// Example usage
await renewSubscription();
```

### Change Subscription

```javascript
async function changeSubscription(newTier, newCycle) {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];
  
  // Get new plan price
  const planInfo = await subscription.methods.getPlanInfo(newTier).call();
  const newPrice = newCycle === 0 ? planInfo.monthlyPrice : planInfo.yearlyPrice;
  
  // Get current subscription
  const currentInfo = await subscription.methods.getSubscriptionInfo(from).call();
  
  // Check if token mode
  const isTokenMode = await subscription.methods.isTokenPayment().call();
  
  if (isTokenMode) {
    // Approve tokens (may need more for upgrade)
    await token.methods.approve(SUBSCRIPTION_ADDRESS, newPrice).send({ from });
  }
  
  // Change subscription
  const receipt = await subscription.methods.changeSubscription(
    newTier,
    newCycle
  ).send({
    from,
    value: isTokenMode ? 0 : newPrice,
    gas: 250000
  });
  
  console.log('Subscription changed:', receipt.transactionHash);
  return receipt;
}

// Example usage - Upgrade from Starter to Pro
await changeSubscription(2, 0); // Pro, Monthly
```

## Event Handling

### Listen for All Subscription Events

```javascript
function setupEventListeners() {
  // Subscription Created
  subscription.events.SubscriptionCreated({
    fromBlock: 'latest'
  })
  .on('data', (event) => {
    console.log('New Subscription:', {
      user: event.returnValues.user,
      tier: event.returnValues.tier,
      role: event.returnValues.role,
      billingCycle: event.returnValues.billingCycle,
      startTime: new Date(event.returnValues.startTime * 1000),
      endTime: new Date(event.returnValues.endTime * 1000)
    });
  })
  .on('error', console.error);
  
  // Subscription Cancelled
  subscription.events.SubscriptionCancelled({
    fromBlock: 'latest'
  })
  .on('data', (event) => {
    console.log('Subscription Cancelled:', event.returnValues.user);
  })
  .on('error', console.error);
  
  // Subscription Renewed
  subscription.events.SubscriptionRenewed({
    fromBlock: 'latest'
  })
  .on('data', (event) => {
    console.log('Subscription Renewed:', {
      user: event.returnValues.user,
      newEndTime: new Date(event.returnValues.newEndTime * 1000)
    });
  })
  .on('error', console.error);
  
  // Subscription Changed
  subscription.events.SubscriptionChanged({
    fromBlock: 'latest'
  })
  .on('data', (event) => {
    console.log('Subscription Changed:', {
      user: event.returnValues.user,
      newTier: event.returnValues.newTier,
      newCycle: event.returnValues.newCycle
    });
  })
  .on('error', console.error);
}

// Start listening
setupEventListeners();
```

### Get Past Events

```javascript
async function getPastSubscriptions(userAddress, fromBlock = 0) {
  const events = await subscription.getPastEvents('SubscriptionCreated', {
    filter: { user: userAddress },
    fromBlock,
    toBlock: 'latest'
  });
  
  return events.map(event => ({
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    user: event.returnValues.user,
    tier: event.returnValues.tier,
    startTime: new Date(event.returnValues.startTime * 1000),
    endTime: new Date(event.returnValues.endTime * 1000)
  }));
}

// Example usage
const history = await getPastSubscriptions('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log('Subscription History:', history);
```

## Utility Functions

### Get Plan Details

```javascript
async function getPlanDetails(tier) {
  const plan = await subscription.methods.getPlanInfo(tier).call();
  
  return {
    name: plan.name,
    monthlyPrice: web3.utils.fromWei(plan.monthlyPrice, 'ether'),
    yearlyPrice: web3.utils.fromWei(plan.yearlyPrice, 'ether'),
    features: {
      apiCallsPerMonth: plan.features.apiCallsPerMonth,
      maxProjects: plan.features.maxProjects,
      maxAlerts: plan.features.maxAlerts,
      exportAccess: plan.features.exportAccess,
      comparisonTool: plan.features.comparisonTool,
      walletIntelligence: plan.features.walletIntelligence,
      apiAccess: plan.features.apiAccess,
      prioritySupport: plan.features.prioritySupport,
      customInsights: plan.features.customInsights
    },
    limits: {
      historicalData: plan.limits.historicalData,
      teamMembers: plan.limits.teamMembers,
      dataRefreshRate: plan.limits.dataRefreshRate
    },
    active: plan.active
  };
}

// Example usage
const starterPlan = await getPlanDetails(1);
console.log('Starter Plan:', starterPlan);
```

### Calculate Subscription Cost

```javascript
async function calculateCost(tier, cycle) {
  const plan = await subscription.methods.getPlanInfo(tier).call();
  const price = cycle === 0 ? plan.monthlyPrice : plan.yearlyPrice;
  return web3.utils.fromWei(price, 'ether');
}

// Example usage
const monthlyCost = await calculateCost(2, 0); // Pro, Monthly
console.log('Pro Monthly Cost:', monthlyCost, 'ETH');
```

### Check Token Balance

```javascript
async function checkTokenBalance(userAddress) {
  const balance = await token.methods.balanceOf(userAddress).call();
  return web3.utils.fromWei(balance, 'ether');
}

// Example usage
const balance = await checkTokenBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log('Token Balance:', balance, 'MGT');
```

## Complete Example: Subscription Flow

```javascript
async function completeSubscriptionFlow() {
  const accounts = await web3.eth.getAccounts();
  const userAddress = accounts[0];
  
  console.log('Starting subscription flow for:', userAddress);
  
  // 1. Check if already subscribed
  const isCurrentlyActive = await subscription.methods.isSubscriberActive(userAddress).call();
  if (isCurrentlyActive) {
    console.log('User already has an active subscription');
    return;
  }
  
  // 2. Get plan details
  const tier = 1; // Starter
  const cycle = 0; // Monthly
  const planDetails = await getPlanDetails(tier);
  console.log('Selected Plan:', planDetails);
  
  // 3. Subscribe
  console.log('Subscribing...');
  await subscribeWithETH(tier, 0, cycle, `user-${Date.now()}`);
  
  // 4. Verify subscription
  const info = await getSubscriptionInfo(userAddress);
  console.log('Subscription Active:', info);
  
  // 5. Setup event listeners
  setupEventListeners();
  
  console.log('Subscription flow complete!');
}

// Run the flow
completeSubscriptionFlow().catch(console.error);
```

## Error Handling

```javascript
async function safeSubscribe(tier, role, cycle, uuid) {
  try {
    await subscribeWithETH(tier, role, cycle, uuid);
    return { success: true };
  } catch (error) {
    // Parse error message
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('AlreadySubscribed')) {
      return { success: false, error: 'User already has an active subscription' };
    } else if (errorMessage.includes('InsufficientPayment')) {
      return { success: false, error: 'Payment amount is incorrect' };
    } else if (errorMessage.includes('InvalidSubscriptionTier')) {
      return { success: false, error: 'Invalid subscription tier' };
    } else if (errorMessage.includes('TierNotActive')) {
      return { success: false, error: 'This subscription tier is not currently available' };
    } else {
      return { success: false, error: errorMessage };
    }
  }
}

// Example usage
const result = await safeSubscribe(1, 0, 0, 'user-uuid');
if (result.success) {
  console.log('Subscription successful!');
} else {
  console.error('Subscription failed:', result.error);
}
```

## Next Steps

- [Ethers.js Examples](./ethers-examples.md) - Ethers.js integration examples
- [API Reference](./api-reference.md) - Complete function reference
- [Getting Started](./getting-started.md) - Basic integration guide
