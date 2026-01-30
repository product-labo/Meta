// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IMetaGaugeSubscription.sol";
import "./libraries/MetaGaugeErrors.sol";
import "./libraries/MetaGaugeConstants.sol";
import "./libraries/MetaGaugeUtils.sol";
import "./utils/MetaGaugePricing.sol";
import "./MetaGaugeAccessControl.sol";
import "openzeppelin/token/ERC20/IERC20.sol";
import "openzeppelin/security/ReentrancyGuard.sol";

/**
 * @title MetaGaugeSubscription
 * @dev Core subscription contract for Meta Gauge analytics platform
 */
contract MetaGaugeSubscription is IMetaGaugeSubscription, MetaGaugeAccessControl, ReentrancyGuard {
    using MetaGaugeUtils for address;

    IERC20 public paymentToken;
    bool public isTokenPayment;

    uint256 public totalSubscribers;
    uint256 public totalRevenue;

    mapping(SubscriptionTier => SubscriptionPlan) public plans;
    mapping(address => Subscriber) public subscribers;
    mapping(address => string) public userUUIDs;
    mapping(address => uint256) public userBalances;

    constructor(address _tokenAddress, bool _useToken) MetaGaugeAccessControl(msg.sender) {
        if (_useToken) {
            require(_tokenAddress != address(0), "Invalid token address");
            paymentToken = IERC20(_tokenAddress);
            isTokenPayment = true;
        }
        _initializePlans();
    }

    // ============ INITIALIZATION ============
    function _initializePlans() internal {
        plans[SubscriptionTier.Free] = _createFreePlan();
        plans[SubscriptionTier.Starter] = _createStarterPlan();
        plans[SubscriptionTier.Pro] = _createProPlan();
        plans[SubscriptionTier.Enterprise] = _createEnterprisePlan();
    }

    function _createFreePlan() internal pure returns (SubscriptionPlan memory) {
        return SubscriptionPlan({
            name: "Free",
            monthlyPrice: 0,
            yearlyPrice: 0,
            features: PlanFeatures({
                apiCallsPerMonth: MetaGaugeConstants.MAX_API_CALLS_FREE,
                maxProjects: MetaGaugeConstants.MAX_PROJECTS_FREE,
                maxAlerts: MetaGaugeConstants.MAX_ALERTS_FREE,
                exportAccess: false,
                comparisonTool: false,
                walletIntelligence: false,
                apiAccess: false,
                prioritySupport: false,
                customInsights: false
            }),
            limits: PlanLimits({
                historicalData: 30 days,
                teamMembers: 1,
                dataRefreshRate: 24 hours
            }),
            active: true
        });
    }

    function _createStarterPlan() internal pure returns (SubscriptionPlan memory) {
        return SubscriptionPlan({
            name: "Starter",
            monthlyPrice: MetaGaugeConstants.STARTER_MONTHLY_PRICE,
            yearlyPrice: MetaGaugeConstants.STARTER_YEARLY_PRICE,
            features: PlanFeatures({
                apiCallsPerMonth: MetaGaugeConstants.MAX_API_CALLS_STARTER,
                maxProjects: MetaGaugeConstants.MAX_PROJECTS_STARTER,
                maxAlerts: MetaGaugeConstants.MAX_ALERTS_STARTER,
                exportAccess: true,
                comparisonTool: true,
                walletIntelligence: false,
                apiAccess: false,
                prioritySupport: false,
                customInsights: false
            }),
            limits: PlanLimits({
                historicalData: 90 days,
                teamMembers: 3,
                dataRefreshRate: 12 hours
            }),
            active: true
        });
    }

    function _createProPlan() internal pure returns (SubscriptionPlan memory) {
        return SubscriptionPlan({
            name: "Pro",
            monthlyPrice: MetaGaugeConstants.PRO_MONTHLY_PRICE,
            yearlyPrice: MetaGaugeConstants.PRO_YEARLY_PRICE,
            features: PlanFeatures({
                apiCallsPerMonth: MetaGaugeConstants.MAX_API_CALLS_PRO,
                maxProjects: MetaGaugeConstants.MAX_PROJECTS_PRO,
                maxAlerts: MetaGaugeConstants.MAX_ALERTS_PRO,
                exportAccess: true,
                comparisonTool: true,
                walletIntelligence: true,
                apiAccess: true,
                prioritySupport: false,
                customInsights: false
            }),
            limits: PlanLimits({
                historicalData: 365 days,
                teamMembers: 10,
                dataRefreshRate: 6 hours
            }),
            active: true
        });
    }

    function _createEnterprisePlan() internal pure returns (SubscriptionPlan memory) {
        return SubscriptionPlan({
            name: "Enterprise",
            monthlyPrice: MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE,
            yearlyPrice: MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE,
            features: PlanFeatures({
                apiCallsPerMonth: MetaGaugeConstants.MAX_API_CALLS_ENTERPRISE,
                maxProjects: MetaGaugeConstants.MAX_PROJECTS_ENTERPRISE,
                maxAlerts: MetaGaugeConstants.MAX_ALERTS_ENTERPRISE,
                exportAccess: true,
                comparisonTool: true,
                walletIntelligence: true,
                apiAccess: true,
                prioritySupport: true,
                customInsights: true
            }),
            limits: PlanLimits({
                historicalData: 730 days,
                teamMembers: 50,
                dataRefreshRate: 1 hours
            }),
            active: true
        });
    }

    // ============ SUBSCRIPTION FUNCTIONS ============

    function subscribe(
        SubscriptionTier tier,
        UserRole role,
        BillingCycle billingCycle,
        string calldata userUUID,
        PaymentCurrency currency
    ) external payable override whenNotPaused nonReentrant {
        _validateSubscriptionInput(tier, role, billingCycle, userUUID, currency);

        SubscriptionPlan memory plan = plans[tier];
        if (!plan.active) revert MetaGaugeErrors.TierNotActive();

        uint256 requiredAmount = billingCycle == BillingCycle.Monthly ? plan.monthlyPrice : plan.yearlyPrice;
        uint256 paidAmount = _processPayment(msg.sender, requiredAmount, currency);

        _processSubscription(msg.sender, tier, role, billingCycle, userUUID, paidAmount);
        totalRevenue += paidAmount;
    }

    function _validateSubscriptionInput(
        SubscriptionTier tier,
        UserRole role,
        BillingCycle billingCycle,
        string calldata userUUID,
        PaymentCurrency currency
    ) internal view {
        if (tier > SubscriptionTier.Enterprise) revert MetaGaugeErrors.InvalidSubscriptionTier();
        if (role > UserRole.Researcher) revert MetaGaugeErrors.InvalidUserRole();
        if (bytes(userUUID).length == 0) revert MetaGaugeErrors.InvalidAddress();

        if (isTokenPayment) require(currency == PaymentCurrency.Token, "Invalid currency for token mode");
        else require(currency == PaymentCurrency.ETH, "Invalid currency for ETH mode");

        if (subscribers[msg.sender].isActive && subscribers[msg.sender].endTime > block.timestamp)
            revert MetaGaugeErrors.AlreadySubscribed();
    }

    function _processPayment(
        address user,
        uint256 requiredAmount,
        PaymentCurrency currency
    ) internal returns (uint256 paidAmount) {
        if (isTokenPayment) {
            require(currency == PaymentCurrency.Token, "Invalid currency for token mode");
            require(paymentToken.allowance(user, address(this)) >= requiredAmount, "Insufficient allowance");
            bool success = paymentToken.transferFrom(user, address(this), requiredAmount);
            require(success, "Token transfer failed");
            paidAmount = requiredAmount;
        } else {
            require(currency == PaymentCurrency.ETH, "Invalid currency for ETH mode");
            MetaGaugeUtils.validatePaymentAmount(requiredAmount, msg.value);
            paidAmount = msg.value;
        }
    }

    function _processSubscription(
    address user,
    SubscriptionTier tier,
    UserRole role,
    BillingCycle billingCycle,
    string calldata userUUID,
    uint256 amount
) internal {
    uint256 startTime = block.timestamp;
    uint256 duration = billingCycle == BillingCycle.Monthly
        ? MetaGaugeConstants.SECONDS_PER_MONTH
        : MetaGaugeConstants.SECONDS_PER_YEAR;
    uint256 endTime = startTime + duration;

    subscribers[user] = Subscriber({
        userAddress: user,
        tier: tier,
        role: role,
        billingCycle: billingCycle,
        startTime: startTime,
        endTime: endTime,
        periodStart: startTime,
        periodEnd: endTime,
        isActive: true,
        cancelAtPeriodEnd: false,
        gracePeriodEnd: endTime + MetaGaugeConstants.GRACE_PERIOD,
        amountPaid: amount,  // newly added
        currency: isTokenPayment ? PaymentCurrency.Token : PaymentCurrency.ETH // ✅ optional
    });

    userUUIDs[user] = userUUID;
    totalSubscribers++;
}

    // ============ CANCELLATION LOGIC ============

    function cancelSubscription() external override whenNotPaused nonReentrant {
        Subscriber storage subscriber = subscribers[msg.sender];
        if (!subscriber.isActive) revert MetaGaugeErrors.NoActiveSubscription();
        if (subscriber.cancelAtPeriodEnd) revert MetaGaugeErrors.InvalidSubscriptionState();

        uint256 startTime = subscriber.periodStart;
        uint256 endTime = subscriber.periodEnd;
        uint256 totalPeriod = endTime - startTime;
        if (totalPeriod == 0) revert MetaGaugeErrors.InvalidSubscriptionState();

        uint256 elapsed = block.timestamp > startTime ? block.timestamp - startTime : 0;
        if (elapsed > totalPeriod) elapsed = totalPeriod;

        uint256 refundAmount = 0;
        if (elapsed * 2 < totalPeriod) {
            uint256 unusedTime = totalPeriod - elapsed;
            refundAmount = (subscriber.amountPaid * unusedTime) / totalPeriod;
        }

        subscriber.isActive = false;
        subscriber.cancelAtPeriodEnd = false;
        subscriber.periodEnd = block.timestamp;
        subscriber.gracePeriodEnd = block.timestamp;
        totalSubscribers = totalSubscribers > 0 ? totalSubscribers - 1 : 0;

        if (refundAmount > 0) {
            if (isTokenPayment) {
                bool success = paymentToken.transfer(msg.sender, refundAmount);
                require(success, "Token refund failed");
            } else {
                MetaGaugeUtils.safeTransferETH(msg.sender, refundAmount);
            }
        }

        emit SubscriptionCancelled(msg.sender);
    }

    // ============ ADMIN & VIEW FUNCTIONS ============

    function isSubscriberActive(address user) external view override returns (bool) {
        Subscriber memory s = subscribers[user];
        return s.isActive && (s.endTime > block.timestamp || block.timestamp <= s.gracePeriodEnd);
    }

    function getSubscriptionInfo(address user)
        external
        view
        override
        returns (Subscriber memory)
    {
        return subscribers[user];
    }

    function getPlanInfo(SubscriptionTier tier)
        external
        view
        override
        returns (SubscriptionPlan memory)
    {
        return plans[tier];
    }

    function updatePlanStatus(SubscriptionTier tier, bool active) external onlyOwner {
        plans[tier].active = active;
        emit PlanTierUpdated(tier, active);
    }
    function updateUserRole(UserRole newRole) external override {
    subscribers[msg.sender].role = newRole;
    // Optional: emit event if you track role updates
    // emit UserRoleUpdated(msg.sender, newRole);
}
    /**
     * @notice Change subscription tier and/or billing cycle
     * @dev Handles upgrades, downgrades, and billing cycle changes with prorated pricing
     * @param newTier The new subscription tier
     * @param newCycle The new billing cycle
     */
    function changeSubscription(
        SubscriptionTier newTier,
        BillingCycle newCycle
    ) external payable override whenNotPaused nonReentrant {
        Subscriber storage subscriber = subscribers[msg.sender];
        
        // Validate subscriber has active subscription
        if (!subscriber.isActive) revert MetaGaugeErrors.NoActiveSubscription();
        if (subscriber.cancelAtPeriodEnd) revert MetaGaugeErrors.SubscriptionCancelled();
        
        // Validate new tier
        if (newTier > SubscriptionTier.Enterprise) revert MetaGaugeErrors.InvalidSubscriptionTier();
        
        // Get current and new plan info
        SubscriptionPlan memory currentPlan = plans[subscriber.tier];
        SubscriptionPlan memory newPlan = plans[newTier];
        
        if (!newPlan.active) revert MetaGaugeErrors.TierNotActive();
        
        // Calculate time remaining in current subscription
        uint256 timeRemaining = subscriber.periodEnd > block.timestamp 
            ? subscriber.periodEnd - block.timestamp 
            : 0;
        
        if (timeRemaining == 0) revert MetaGaugeErrors.InvalidSubscriptionState();
        
        // Calculate prorated credit from current subscription
        uint256 totalPeriod = subscriber.periodEnd - subscriber.periodStart;
        uint256 unusedTime = timeRemaining;
        uint256 currentPlanPrice = subscriber.billingCycle == BillingCycle.Monthly 
            ? currentPlan.monthlyPrice 
            : currentPlan.yearlyPrice;
        uint256 proratedCredit = (subscriber.amountPaid * unusedTime) / totalPeriod;
        
        // Calculate new subscription cost
        uint256 newPlanPrice = newCycle == BillingCycle.Monthly 
            ? newPlan.monthlyPrice 
            : newPlan.yearlyPrice;
        
        // Determine if upgrade or downgrade
        bool isUpgrade = newTier > subscriber.tier;
        
        // Calculate payment required or refund due
        if (newPlanPrice > proratedCredit) {
            // User needs to pay difference
            uint256 amountDue = newPlanPrice - proratedCredit;
            uint256 paidAmount = _processPayment(
                msg.sender, 
                amountDue, 
                isTokenPayment ? PaymentCurrency.Token : PaymentCurrency.ETH
            );
            
            // Update subscription
            _updateSubscriptionPlan(subscriber, newTier, newCycle, newPlanPrice);
            totalRevenue += paidAmount;
            
        } else if (newPlanPrice < proratedCredit) {
            // User gets refund for downgrade
            uint256 refundAmount = proratedCredit - newPlanPrice;
            
            // Update subscription first
            _updateSubscriptionPlan(subscriber, newTier, newCycle, newPlanPrice);
            
            // Process refund
            if (refundAmount > 0) {
                if (isTokenPayment) {
                    bool success = paymentToken.transfer(msg.sender, refundAmount);
                    require(success, "Token refund failed");
                } else {
                    MetaGaugeUtils.safeTransferETH(msg.sender, refundAmount);
                }
            }
        } else {
            // Exact match - no payment or refund needed
            _updateSubscriptionPlan(subscriber, newTier, newCycle, newPlanPrice);
        }
        
        emit SubscriptionChanged(msg.sender, newTier, newCycle);
    }
    
    /**
     * @dev Internal function to update subscription plan details
     */
    function _updateSubscriptionPlan(
        Subscriber storage subscriber,
        SubscriptionTier newTier,
        BillingCycle newCycle,
        uint256 newPrice
    ) internal {
        uint256 newDuration = newCycle == BillingCycle.Monthly
            ? MetaGaugeConstants.SECONDS_PER_MONTH
            : MetaGaugeConstants.SECONDS_PER_YEAR;
        
        uint256 newStartTime = block.timestamp;
        uint256 newEndTime = newStartTime + newDuration;
        
        subscriber.tier = newTier;
        subscriber.billingCycle = newCycle;
        subscriber.periodStart = newStartTime;
        subscriber.periodEnd = newEndTime;
        subscriber.endTime = newEndTime;
        subscriber.gracePeriodEnd = newEndTime + MetaGaugeConstants.GRACE_PERIOD;
        subscriber.amountPaid = newPrice;
    }
    function renewSubscription() external payable override whenNotPaused nonReentrant {
    Subscriber storage subscriber = subscribers[msg.sender];
    
    // Validate subscription can be renewed
    _validateRenewal(subscriber);
    
    // Calculate required payment amount
    uint256 requiredAmount = _calculateRenewalAmount(subscriber);
    
    // Process payment
    uint256 paidAmount = _processPayment(
        msg.sender, 
        requiredAmount, 
        isTokenPayment ? PaymentCurrency.Token : PaymentCurrency.ETH
    );
    
    // Extend subscription period
    _extendSubscription(subscriber, paidAmount);
    
    // Update revenue
    totalRevenue += paidAmount;
    
    emit SubscriptionRenewed(msg.sender,  subscriber.endTime);
}
function _validateRenewal(Subscriber storage subscriber) internal view {
    if (!subscriber.isActive) revert MetaGaugeErrors.NoActiveSubscription();
    
    // Check if subscription is already cancelled
    if (subscriber.cancelAtPeriodEnd) revert MetaGaugeErrors.SubscriptionCancelled();
    
    // Determine renewal eligibility window
    uint256 renewalWindowStart = _calculateRenewalWindowStart(subscriber);
    
    // Allow renewal if within renewal window or in grace period
    bool canRenew = (block.timestamp >= renewalWindowStart && block.timestamp <= subscriber.periodEnd) ||
                   (block.timestamp > subscriber.periodEnd && block.timestamp <= subscriber.gracePeriodEnd);
    
    if (!canRenew) revert MetaGaugeErrors.RenewalNotAvailable();
}

function _calculateRenewalWindowStart(Subscriber storage subscriber) internal view returns (uint256) {
    // Allow renewal starting from 7 days before period ends
    uint256 renewalWindow = 7 days;
    
    if (subscriber.periodEnd > renewalWindow) {
        return subscriber.periodEnd - renewalWindow;
    }
    return subscriber.periodStart; // If period is too short, allow renewal anytime
}

function _calculateRenewalAmount(Subscriber storage subscriber) internal view returns (uint256) {
    SubscriptionPlan memory plan = plans[subscriber.tier];
    
    // Return price based on current billing cycle
    return subscriber.billingCycle == BillingCycle.Monthly 
        ? plan.monthlyPrice 
        : plan.yearlyPrice;
}

function _extendSubscription(Subscriber storage subscriber, uint256 paidAmount) internal {
    uint256 extension = subscriber.billingCycle == BillingCycle.Monthly
        ? MetaGaugeConstants.SECONDS_PER_MONTH
        : MetaGaugeConstants.SECONDS_PER_YEAR;
    
    // If renewing before period ends, extend from current end time
    // If in grace period, extend from current time
    uint256 newStartTime = block.timestamp > subscriber.periodEnd 
        ? block.timestamp 
        : subscriber.periodEnd;
    
    subscriber.periodStart = newStartTime;
    subscriber.periodEnd = newStartTime + extension;
    subscriber.endTime = subscriber.periodEnd;
    subscriber.gracePeriodEnd = subscriber.periodEnd + MetaGaugeConstants.GRACE_PERIOD;
    subscriber.amountPaid += paidAmount;
    subscriber.cancelAtPeriodEnd = false; // Reset cancellation if renewing
    
    // Reactivate if was in grace period
    if (!subscriber.isActive) {
        subscriber.isActive = true;
        totalSubscribers++;
    }
}

    function withdrawFunds(uint256 amount) external onlyOwner nonReentrant {
        if (amount > address(this).balance) revert MetaGaugeErrors.InsufficientContractBalance();
        MetaGaugeUtils.safeTransferETH(msg.sender, amount);
        emit FundsWithdrawn(msg.sender, amount);
    }

    function withdrawTokens(uint256 amount) external onlyOwner nonReentrant {
        require(isTokenPayment, "Only available in token mode");
        require(amount <= paymentToken.balanceOf(address(this)), "Insufficient token balance");
        bool success = paymentToken.transfer(msg.sender, amount);
        require(success, "Token withdrawal failed");
        emit FundsWithdrawn(msg.sender, amount);
    }

    receive() external payable {}
}
