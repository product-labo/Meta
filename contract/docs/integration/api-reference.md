# MetaGauge API Reference

Complete reference for all MetaGauge contract functions.

## MetaGaugeSubscription Contract

### Write Functions

#### subscribe()
```solidity
function subscribe(
    SubscriptionTier tier,
    UserRole role,
    BillingCycle billingCycle,
    string calldata userUUID,
    PaymentCurrency currency
) external payable
```

Creates a new subscription or upgrades existing one.

**Parameters:**
- `tier`: Subscription tier (0=Free, 1=Starter, 2=Pro, 3=Enterprise)
- `role`: User role (0=Startup, 1=Researcher, 2=Admin)
- `billingCycle`: Billing cycle (0=Monthly, 1=Yearly)
- `userUUID`: Unique user identifier
- `currency`: Payment currency (0=ETH, 4=Token)

**Requirements:**
- Valid tier and role
- Non-empty UUID
- Correct payment amount
- No active subscription

**Events:** `SubscriptionCreated`

---

#### cancelSubscription()
```solidity
function cancelSubscription() external
```

Cancels active subscription with pro-rata refund.

**Requirements:**
- Active subscription exists
- Not already cancelled

**Events:** `SubscriptionCancelled`

---

#### renewSubscription()
```solidity
function renewSubscription() external payable
```

Renews subscription for another billing period.

**Requirements:**
- Active subscription
- Within renewal window (7 days before end) or grace period
- Correct payment amount

**Events:** `SubscriptionRenewed`

---

#### changeSubscription()
```solidity
function changeSubscription(
    SubscriptionTier newTier,
    BillingCycle newCycle
) external payable
```

Changes subscription tier and/or billing cycle.

**Parameters:**
- `newTier`: New subscription tier
- `newCycle`: New billing cycle

**Requirements:**
- Active subscription
- Valid new tier
- Correct payment for upgrade (or receives refund for downgrade)

**Events:** `SubscriptionChanged`

---

#### updateUserRole()
```solidity
function updateUserRole(UserRole newRole) external
```

Updates user's role.

**Parameters:**
- `newRole`: New user role

---

### Read Functions

#### getSubscriptionInfo()
```solidity
function getSubscriptionInfo(address user) 
    external view 
    returns (Subscriber memory)
```

Returns complete subscription details for a user.

**Returns:** Subscriber struct with all subscription data

---

#### isSubscriberActive()
```solidity
function isSubscriberActive(address user) 
    external view 
    returns (bool)
```

Checks if user has an active subscription.

**Returns:** `true` if subscription is active

---

#### getPlanInfo()
```solidity
function getPlanInfo(SubscriptionTier tier) 
    external view 
    returns (SubscriptionPlan memory)
```

Returns plan details for a specific tier.

**Returns:** SubscriptionPlan struct with pricing and features

---

### Admin Functions

#### updatePlanStatus()
```solidity
function updatePlanStatus(SubscriptionTier tier, bool active) 
    external onlyOwner
```

Activates or deactivates a subscription tier.

**Access:** Owner only

---

#### withdrawFunds()
```solidity
function withdrawFunds(uint256 amount) external onlyOwner
```

Withdraws ETH from contract (ETH mode).

**Access:** Owner only

---

#### withdrawTokens()
```solidity
function withdrawTokens(uint256 amount) external onlyOwner
```

Withdraws tokens from contract (Token mode).

**Access:** Owner only

---

## MetaGaugeToken Contract

Standard ERC20 functions plus:

#### mint()
```solidity
function mint(address to, uint256 amount) external onlyOwner
```

Mints new tokens up to max supply.

**Access:** Owner only

---

#### maxSupply()
```solidity
function maxSupply() external view returns (uint256)
```

Returns maximum token supply (500M MGT).

---

## Events

### SubscriptionCreated
```solidity
event SubscriptionCreated(
    address indexed user,
    SubscriptionTier tier,
    UserRole role,
    BillingCycle billingCycle,
    uint256 startTime,
    uint256 endTime
)
```

### SubscriptionCancelled
```solidity
event SubscriptionCancelled(address indexed user)
```

### SubscriptionRenewed
```solidity
event SubscriptionRenewed(address indexed user, uint256 newEndTime)
```

### SubscriptionChanged
```solidity
event SubscriptionChanged(
    address indexed user,
    SubscriptionTier newTier,
    BillingCycle newCycle
)
```

### FundsWithdrawn
```solidity
event FundsWithdrawn(address indexed owner, uint256 amount)
```

---

## Custom Errors

- `AlreadySubscribed()` - User already has active subscription
- `NoActiveSubscription()` - No active subscription found
- `InvalidSubscriptionTier()` - Invalid tier specified
- `InvalidUserRole()` - Invalid role specified
- `TierNotActive()` - Tier is not currently active
- `InsufficientPayment(uint256 required, uint256 provided)` - Incorrect payment amount
- `RenewalNotAvailable()` - Cannot renew at this time
- `SubscriptionCancelled()` - Subscription has been cancelled
- `InvalidSubscriptionState()` - Invalid state for operation

---

## Data Types

### SubscriptionTier
```solidity
enum SubscriptionTier { Free, Starter, Pro, Enterprise }
```

### UserRole
```solidity
enum UserRole { Startup, Researcher, Admin }
```

### BillingCycle
```solidity
enum BillingCycle { Monthly, Yearly }
```

### PaymentCurrency
```solidity
enum PaymentCurrency { ETH, USDC, LSK, NATIVE, Token }
```

### Subscriber
```solidity
struct Subscriber {
    address userAddress;
    SubscriptionTier tier;
    UserRole role;
    BillingCycle billingCycle;
    uint256 startTime;
    uint256 endTime;
    uint256 periodStart;
    uint256 periodEnd;
    bool isActive;
    bool cancelAtPeriodEnd;
    uint256 gracePeriodEnd;
    uint256 amountPaid;
    PaymentCurrency currency;
}
```

---

## See Also

- [Getting Started](./getting-started.md) - Basic integration guide
- [Web3.js Examples](./web3-examples.md) - Web3.js code examples
- [Ethers.js Examples](./ethers-examples.md) - Ethers.js code examples
- [Contract ABIs](../../abi/) - Contract interfaces
