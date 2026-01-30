// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IMetaGaugeSubscription
 * @dev Interface for Meta Gauge Subscription core functionality
 */
interface IMetaGaugeSubscription {
    // ============ ENUMS ============
    enum UserRole { Startup,Researcher, admin }
    enum SubscriptionTier { Free, Starter, Pro, Enterprise }
    enum BillingCycle { Monthly, Yearly }
    enum PaymentCurrency { ETH, USDC, LSK, NATIVE,Token}
    
    // ============ STRUCTS ============
    struct SubscriptionPlan {
        string name;
        uint256 monthlyPrice;
        uint256 yearlyPrice;
        PlanFeatures features;
        PlanLimits limits;
        bool active;
    }
    
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
    
    struct PlanLimits {
        uint256 historicalData;
        uint256 teamMembers;
        uint256 dataRefreshRate;
    }
    
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
        uint256 amountPaid;         // 💰 Added field
        PaymentCurrency currency;   // 💱 (optional, if you support both ETH & MGT)
    }
    
    // ============ EVENTS ============
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
    event SubscriptionChanged(address indexed user, SubscriptionTier newTier, BillingCycle newCycle);
    event UserRoleUpdated(address indexed user, UserRole newRole);
    event PlanTierUpdated(SubscriptionTier tier, bool active);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    // ============ FUNCTIONS ============
    function subscribe(
        SubscriptionTier tier,
        UserRole role,
        BillingCycle billingCycle,
        string calldata userUUID,
        PaymentCurrency currency
    ) external payable;
    
    function changeSubscription(
        SubscriptionTier newTier, 
        BillingCycle newBillingCycle
    ) external payable;
    
    function renewSubscription() external payable;
    function cancelSubscription() external;
    function updateUserRole(UserRole newRole) external;
    function isSubscriberActive(address user) external view returns (bool);
    function getSubscriptionInfo(address user) external view returns (Subscriber memory);
    function getPlanInfo(SubscriptionTier tier) external view returns (SubscriptionPlan memory);
}

