# MetaGaugeSubscription Contract Documentation

## Overview

`MetaGaugeSubscription` is the core subscription management contract for the Meta Gauge analytics platform. It handles user subscriptions across multiple tiers, manages billing cycles (monthly/yearly), supports both ETH and ERC20 token payments, and provides admin controls for plan management.

## Contract Architecture

### Inheritance
- `IMetaGaugeSubscription` - Interface defining all public functions and events
- `MetaGaugeAccessControl` - Role-based access control (owner functionality)

### Key Libraries
- `MetaGaugeUtils` - Utility functions for address operations and ETH transfers
- `MetaGaugeConstants` - System-wide constants (time, limits, prices)
- `MetaGaugeErrors` - Custom error definitions
- `MetaGaugePricing` - Pricing calculation utilities

---

## Data Structures

### Enums

#### `SubscriptionTier`
```solidity
enum SubscriptionTier { Free, Starter, Pro, Enterprise }
```
Defines four subscription tiers with increasing feature sets.

#### `UserRole`
```solidity
enum UserRole { Startup, Researcher, admin }
```
Categorizes user types for analytics and permissions.

#### `BillingCycle`
```solidity
enum BillingCycle { Monthly, Yearly }
```
Billing period options for subscriptions.

#### `PaymentCurrency`
```solidity
enum PaymentCurrency { ETH, USDC, LSK, NATIVE, Token }
```
Supported payment methods.

### Structs

#### `SubscriptionPlan`
```solidity
struct SubscriptionPlan {
    string name;                 // Plan name ("Free", "Starter", etc.)
    uint256 monthlyPrice;        // Monthly price in wei or token units
    uint256 yearlyPrice;         // Yearly price in wei or token units
    PlanFeatures features;       // Feature set for this plan
    PlanLimits limits;          // Resource limits
    bool active;                // Whether plan can be subscribed to
}
```

#### `PlanFeatures`
```solidity
struct PlanFeatures {
    uint256 apiCallsPerMonth;
    uint256 maxProjects;
    uint256 maxAlerts;
    bool exportAccess;
    bool comparisonTool;
    bool walletIntelligence;
    bool apiAccess;
    bool prioritySupport;
    bool customInsights;
}
```

#### `PlanLimits`
```solidity
struct PlanLimits {
    uint256 historicalData;      // Days of historical data access
    uint256 teamMembers;         // Max team members
    uint256 dataRefreshRate;     // Data refresh frequency
}
```

#### `Subscriber`
```solidity
struct Subscriber {
    address userAddress;
    SubscriptionTier tier;
    UserRole role;
    BillingCycle billingCycle;
    uint256 startTime;           // Original subscription start
    uint256 endTime;             // Original subscription end
    uint256 periodStart;         // Current period start
    uint256 periodEnd;           // Current period end
    bool isActive;
    bool cancelAtPeriodEnd;      // Cancellation flag
    uint256 gracePeriodEnd;      // Grace period expiration
    uint256 amountPaid;          // Total paid for current/last period
    PaymentCurrency currency;    // ETH or Token
}
```

---

## State Variables

### Configuration
```solidity
IERC20 public paymentToken;      // ERC20 token contract (if in token mode)
bool public isTokenPayment;      // True if using tokens, false if ETH
```

### Tracking
```solidity
uint256 public totalSubscribers; // Total active subscribers
uint256 public totalRevenue;     // Cumulative revenue collected
```

### Storage
```solidity
mapping(SubscriptionTier => SubscriptionPlan) public plans;
mapping(address => Subscriber) public subscribers;
mapping(address => string) public userUUIDs;
mapping(address => uint256) public userBalances;
```

---

## Core Functions

### Subscription Management

#### `subscribe()`
```solidity
function subscribe(
    SubscriptionTier tier,
    UserRole role,
    BillingCycle billingCycle,
    string calldata userUUID,
    PaymentCurrency currency
) external payable override whenNotPaused
```

**Purpose:** Create a new subscription or upgrade existing one

**Parameters:**
- `tier` - Subscription tier (Free to Enterprise)
- `role` - User role classification
- `billingCycle` - Monthly or Yearly
- `userUUID` - Unique user identifier
- `currency` - Payment method

**Requirements:**
- Valid tier and role
- Non-empty UUID
- Correct currency for deployment mode
- Payment amount matches tier price
- User not already subscribed with active subscription

**Effects:**
- Creates/updates `Subscriber` record
- Transfers payment (ETH or tokens)
- Increments `totalSubscribers` and `totalRevenue`
- Emits `SubscriptionCreated` event

**Example (ETH mode):**
```solidity
metaGaugeSubscription.subscribe{value: 0.01 ether}(
    SubscriptionTier.Starter,
    UserRole.Startup,
    BillingCycle.Monthly,
    "user-uuid-123",
    PaymentCurrency.ETH
);
```

**Example (Token mode):**
```solidity
// First: approve tokens
token.approve(address(metaGaugeSubscription), amount);

// Then: subscribe
metaGaugeSubscription.subscribe(
    SubscriptionTier.Starter,
    UserRole.Startup,
    BillingCycle.Monthly,
    "user-uuid-456",
    PaymentCurrency.Token
);
```

#### `cancelSubscription()`
```solidity
function cancelSubscription() external override whenNotPaused
```

**Purpose:** Cancel active subscription with pro-rata refund

**Requirements:**
- User must have active subscription
- Subscription must not already be cancelled

**Refund Logic:**
- If less than 50% of period used: full pro-rata refund
- If 50%+ of period used: no refund
- Calculation: `(amountPaid * unusedTime) / totalPeriod`

**Effects:**
- Marks subscription as inactive
- Decrements `totalSubscribers`
- Transfers refund (ETH or tokens)
- Emits `SubscriptionCancelled` event

#### `renewSubscription()`
```solidity
function renewSubscription() external payable override whenNotPaused
```

**Purpose:** Extend subscription for another billing period

**Renewal Window:**
- Can renew 7 days before period end
- Can renew during grace period (7 days after end)
- Cannot renew outside these windows

**Requirements:**
- Subscription must be active
- Must be within renewal window or grace period
- Payment must equal current tier price

**Effects:**
- Extends `periodEnd` by 1 month or 1 year
- Updates grace period
- Reactivates if was in grace period
- Emits `SubscriptionRenewed` event

---

## Administrative Functions

### Plan Management

#### `updatePlanStatus()`
```solidity
function updatePlanStatus(SubscriptionTier tier, bool active) external onlyOwner
```

**Purpose:** Activate or deactivate a subscription tier

**Access:** Owner only

**Effects:**
- Updates plan's active status
- New subscriptions cannot use deactivated plans
- Existing subscriptions unaffected
- Emits `PlanTierUpdated` event

#### `_initializePlans()`
```solidity
function _initializePlans() internal
```

**Called in:** Constructor

**Sets up four default plans:**
- **Free**: $0/month, limited features, 1 team member, 30 days history
- **Starter**: $0.01 ETH/month, export + comparison, 3 team members, 90 days history
- **Pro**: $0.034 ETH/month, all above + wallet intelligence + API access, 10 team members, 1 year history
- **Enterprise**: $0.103 ETH/month, all features, 50 team members, 2 years history

---

## User Functions

#### `updateUserRole()`
```solidity
function updateUserRole(UserRole newRole) external override
```

**Purpose:** Allow user to change their role

**Access:** User can call for themselves

**Effects:**
- Updates `subscribers[msg.sender].role`

#### `getSubscriptionInfo()`
```solidity
function getSubscriptionInfo(address user) 
    external view override 
    returns (Subscriber memory)
```

**Purpose:** Retrieve subscription details for a user

**Returns:** Full `Subscriber` struct including:
- Tier, role, billing cycle
- Start/end times
- Payment amount
- Active status

#### `isSubscriberActive()`
```solidity
function isSubscriberActive(address user) 
    external view override 
    returns (bool)
```

**Purpose:** Check if user has active subscription

**Returns:** `true` if:
- `isActive == true` AND
- Current time <= `endTime` OR within grace period

---

## Withdrawal Functions

### ETH Mode

#### `withdrawFunds()`
```solidity
function withdrawFunds(uint256 amount) external onlyOwner
```

**Purpose:** Owner withdraws accumulated ETH

**Requirements:**
- `amount <= address(this).balance`
- Caller is owner

**Effects:**
- Transfers ETH to owner
- Emits `FundsWithdrawn` event

### Token Mode

#### `withdrawTokens()`
```solidity
function withdrawTokens(uint256 amount) external onlyOwner
```

**Purpose:** Owner withdraws accumulated tokens (NEW)

**Requirements:**
- Contract in token mode (`isTokenPayment == true`)
- `amount <= paymentToken.balanceOf(address(this))`
- Caller is owner

**Effects:**
- Transfers tokens to owner
- Emits `FundsWithdrawn` event

---

## Events

```solidity
event SubscriptionCreated(
    address indexed user,
    SubscriptionTier tier,
    UserRole role,
    BillingCycle billingCycle,
    uint256 startTime,
    uint256 endTime
);

event SubscriptionUpdated(
    address indexed user,
    SubscriptionTier oldTier,
    SubscriptionTier newTier,
    BillingCycle billingCycle
);

event SubscriptionCancelled(address indexed user);

event SubscriptionRenewed(address indexed user, uint256 newEndTime);

event UserRoleUpdated(address indexed user, UserRole newRole);

event PlanTierUpdated(SubscriptionTier tier, bool active);

event FundsWithdrawn(address indexed owner, uint256 amount);
```

---

## Deployment Modes

### ETH Mode
```solidity
MetaGaugeSubscription sub = new MetaGaugeSubscription(
    address(0),  // No token
    false        // useToken = false
);
```
- Payments in ETH
- Use `withdrawFunds()` to withdraw
- Gas-efficient for users

### Token Mode
```solidity
IERC20 token = IERC20(tokenAddress);
MetaGaugeSubscription sub = new MetaGaugeSubscription(
    tokenAddress,  // ERC20 token address
    true           // useToken = true
);
```
- Payments in ERC20 tokens
- Use `withdrawTokens()` to withdraw
- Requires user token approval
- Centralizes payment to single token

---

## Security Features

### Access Control
- Owner-only functions: plan updates, withdrawals
- User-specific operations: subscribe, cancel, renew
- `whenNotPaused` modifier on critical functions (inherited from `MetaGaugeAccessControl`)

### Input Validation
- UUID non-empty check
- Tier and role range validation
- Payment currency matching deployment mode
- Duplicate subscription prevention

### Error Handling
- Custom errors for clear revert reasons
- Validation at subscription start
- Refund calculation safety checks
- Token transfer failure handling

---

## Constants Used

From `MetaGaugeConstants.sol`:
```solidity
SECONDS_PER_MONTH = 2,592,000  // 30 days
SECONDS_PER_YEAR = 31,536,000   // 365 days
GRACE_PERIOD = 7 days           // Post-expiry grace window

// Pricing (ETH)
STARTER_MONTHLY_PRICE = 0.01 ether
STARTER_YEARLY_PRICE = 0.1 ether
PRO_MONTHLY_PRICE = 0.034 ether
PRO_YEARLY_PRICE = 0.3 ether
ENTERPRISE_MONTHLY_PRICE = 0.103 ether
ENTERPRISE_YEARLY_PRICE = 1.0 ether

// Tier Limits
MAX_API_CALLS_FREE = 1,000
MAX_API_CALLS_STARTER = 10,000
MAX_API_CALLS_PRO = 50,000
MAX_API_CALLS_ENTERPRISE = 250,000
```

---

## Usage Examples

### Subscribe to Starter Plan (ETH Mode)
```solidity
// User has 0.01 ETH
metaGaugeSubscription.subscribe{value: 0.01 ether}(
    IMetaGaugeSubscription.SubscriptionTier.Starter,
    IMetaGaugeSubscription.UserRole.Startup,
    IMetaGaugeSubscription.BillingCycle.Monthly,
    "my-uuid-12345",
    IMetaGaugeSubscription.PaymentCurrency.ETH
);
```

### Subscribe to Pro Plan (Token Mode)
```solidity
// User has tokens and approves contract
IERC20 token = IERC20(tokenAddress);
token.approve(address(metaGaugeSubscription), 0.034 ether);

metaGaugeSubscription.subscribe(
    IMetaGaugeSubscription.SubscriptionTier.Pro,
    IMetaGaugeSubscription.UserRole.Researcher,
    IMetaGaugeSubscription.BillingCycle.Monthly,
    "researcher-uuid-789",
    IMetaGaugeSubscription.PaymentCurrency.Token
);
```

### Check Subscription Status
```solidity
// Is user subscribed?
bool active = metaGaugeSubscription.isSubscriberActive(userAddress);

// Get full subscription details
IMetaGaugeSubscription.Subscriber memory sub = 
    metaGaugeSubscription.getSubscriptionInfo(userAddress);

console.log("Tier:", uint(sub.tier));
console.log("Period End:", sub.periodEnd);
console.log("Active:", sub.isActive);
```

### Renew Subscription
```solidity
// If in token mode, approve tokens first
if (isTokenMode) {
    token.approve(address(metaGaugeSubscription), priceAmount);
}

// Renew (works within 7-day window or grace period)
metaGaugeSubscription.renewSubscription{value: ethAmount}();
```

### Cancel Subscription
```solidity
// User cancels, receives pro-rata refund
metaGaugeSubscription.cancelSubscription();

// New subscription can be made afterward
```

---

## Testing

See `TEST_SUMMARY.md` for comprehensive test coverage:
- 172+ unit tests
- All functions covered
- Error scenarios tested
- Both payment modes tested
- Event emissions verified

---

## Gas Optimization Notes

1. **Subscription Struct**: Uses tight packing for storage efficiency
2. **Mappings**: Direct address lookup for O(1) access
3. **View Functions**: No state modifications
4. **Batch Operations**: Consider for multiple user updates

---

## Future Enhancements

Potential improvements:
1. **Dynamic Pricing**: Adjust prices based on demand
2. **Discounts**: Volume discounts, loyalty programs
3. **Upgrades/Downgrades**: Change tiers mid-period
4. **Multiple Subscriptions**: Allow users multiple tier subscriptions
5. **Staking**: Reward token holders
6. **Analytics**: Track subscription metrics on-chain

---

**Contract Version:** 1.0  
**Solidity Version:** ^0.8.19  
**Last Updated:** November 11, 2025  
**License:** MIT
