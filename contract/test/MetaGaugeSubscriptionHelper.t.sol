// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/helpers/MetaGaugeSubscriptionHelper.sol";
import {MetaGaugeConstants} from "../src/libraries/MetaGaugeConstants.sol";
import {IMetaGaugeSubscription} from "../src/interfaces/IMetaGaugeSubscription.sol";

contract MockMetaGaugeSubscription is IMetaGaugeSubscription {
    struct MockSubscriber {
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
    
    struct MockPlan {
        string name;
        uint256 monthlyPrice;
        uint256 yearlyPrice;
        PlanFeatures features;
        PlanLimits limits;
        bool active;
    }
    
    mapping(address => MockSubscriber) public subscribers;
    mapping(SubscriptionTier => MockPlan) public plans;
    
    function setSubscriber(
        address user,
        SubscriptionTier tier,
        UserRole role,
        BillingCycle billingCycle,
        uint256 startTime,
        uint256 endTime,
        uint256 periodStart,
        uint256 periodEnd,
        bool isActive,
        bool cancelAtPeriodEnd,
        uint256 gracePeriodEnd,
        uint256 amountPaid,
        PaymentCurrency currency
    ) external {
        subscribers[user] = MockSubscriber({
            userAddress: user,
            tier: tier,
            role: role,
            billingCycle: billingCycle,
            startTime: startTime,
            endTime: endTime,
            periodStart: periodStart,
            periodEnd: periodEnd,
            isActive: isActive,
            cancelAtPeriodEnd: cancelAtPeriodEnd,
            gracePeriodEnd: gracePeriodEnd,
            amountPaid: amountPaid,
            currency: currency
        });
    }
    
    function setPlan(
        SubscriptionTier tier,
        string memory name,
        uint256 monthlyPrice,
        uint256 yearlyPrice,
        PlanFeatures memory features,
        PlanLimits memory limits,
        bool active
    ) external {
        plans[tier] = MockPlan(name, monthlyPrice, yearlyPrice, features, limits, active);
    }
    
    function isSubscriberActive(address user) external view override returns (bool) {
        MockSubscriber memory subscriber = subscribers[user];
        return subscriber.isActive && 
               (subscriber.endTime > block.timestamp || 
                block.timestamp <= subscriber.gracePeriodEnd);
    }
    
    function getPlanInfo(SubscriptionTier tier) external view override returns (SubscriptionPlan memory) {
        MockPlan memory mock = plans[tier];
        return SubscriptionPlan({
            name: mock.name,
            monthlyPrice: mock.monthlyPrice,
            yearlyPrice: mock.yearlyPrice,
            features: mock.features,
            limits: mock.limits,
            active: mock.active
        });
    }
    
    function getSubscriptionInfo(address user) external view returns (Subscriber memory) {
        MockSubscriber memory mock = subscribers[user];
        return Subscriber({
            userAddress: mock.userAddress,
            tier: mock.tier,
            role: mock.role,
            billingCycle: mock.billingCycle,
            startTime: mock.startTime,
            endTime: mock.endTime,
            periodStart: mock.periodStart,
            periodEnd: mock.periodEnd,
            isActive: mock.isActive,
            cancelAtPeriodEnd: mock.cancelAtPeriodEnd,
            gracePeriodEnd: mock.gracePeriodEnd,
            amountPaid: mock.amountPaid,
            currency: mock.currency
        });
    }
    
    // Stub implementations for interface compliance
    function subscribe(
        SubscriptionTier tier,
        UserRole role,
        BillingCycle billingCycle,
        string calldata userUUID,
        PaymentCurrency currency
    ) external payable {}
    
    function changeSubscription(
        SubscriptionTier newTier, 
        BillingCycle newBillingCycle
    ) external payable {}
    
    function renewSubscription() external payable {}
    function cancelSubscription() external {}
    function updateUserRole(UserRole newRole) external {}
}

contract MetaGaugeSubscriptionHelperTest is Test {
    MetaGaugeSubscriptionHelper public helper;
    MockMetaGaugeSubscription public mockSubscription;
    
    address user1 = address(0x1);
    address user2 = address(0x2);
    
    uint256 constant START_TIMESTAMP = 1000000000;
    
    function setUp() public {
        mockSubscription = new MockMetaGaugeSubscription();
        helper = new MetaGaugeSubscriptionHelper(address(mockSubscription));
        
        vm.warp(START_TIMESTAMP);
        
        // Setup plans
        IMetaGaugeSubscription.PlanFeatures memory proFeatures = IMetaGaugeSubscription.PlanFeatures({
            apiCallsPerMonth: 10000,
            maxProjects: 20,
            maxAlerts: 50,
            exportAccess: true,
            comparisonTool: true,
            walletIntelligence: true,
            apiAccess: true,
            prioritySupport: true,
            customInsights: false
        });
        
        IMetaGaugeSubscription.PlanLimits memory proLimits = IMetaGaugeSubscription.PlanLimits({
            historicalData: 365 days,
            teamMembers: 10,
            dataRefreshRate: 1 hours
        });
        
        mockSubscription.setPlan(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            "Pro",
            30 ether,
            300 ether,
            proFeatures,
            proLimits,
            true
        );
    }
    
    function testCanAccessFeatureActiveSubscriber() public {
        uint256 startTime = START_TIMESTAMP - 30 days;
        uint256 endTime = START_TIMESTAMP + 30 days;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            true,
            false,
            endTime + 7 days,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        assertTrue(helper.canAccessFeature(user1, "projects"));
    }
    
    function testCanAccessFeatureInactiveSubscriber() public {
        uint256 startTime = START_TIMESTAMP - 60 days;
        uint256 endTime = START_TIMESTAMP - 1 days;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            false,
            false,
            endTime + 7 days,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        assertFalse(helper.canAccessFeature(user1, "projects"));
    }
    
    function testGetRemainingQuotas() public {
        uint256 startTime = START_TIMESTAMP - 30 days;
        uint256 endTime = START_TIMESTAMP + 30 days;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            true,
            false,
            endTime + 7 days,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        (
            uint256 projectsRemaining,
            uint256 alertsRemaining,
            uint256 apiCallsRemaining,
            uint256 teamMembersRemaining
        ) = helper.getRemainingQuotas(user1);
        
        assertEq(projectsRemaining, 20);
        assertEq(alertsRemaining, 50);
        assertEq(apiCallsRemaining, 10000);
        assertEq(teamMembersRemaining, 10);
    }
    
    function testGetSubscriptionStatusActive() public {
        uint256 startTime = START_TIMESTAMP - 30 days;
        uint256 endTime = START_TIMESTAMP + 30 days;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            true,
            false,
            endTime + 7 days,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        (
            bool isActive,
            bool isInGracePeriod,
            uint256 daysRemaining,
            uint8 currentTier,
            uint8 billingCycle
        ) = helper.getSubscriptionStatus(user1);
        
        assertTrue(isActive);
        assertFalse(isInGracePeriod);
        assertEq(daysRemaining, 30);
        assertEq(currentTier, uint8(IMetaGaugeSubscription.SubscriptionTier.Pro));
        assertEq(billingCycle, uint8(IMetaGaugeSubscription.BillingCycle.Monthly));
    }
    
    function testGetSubscriptionStatusGracePeriod() public {
        uint256 startTime = START_TIMESTAMP - 60 days;
        uint256 endTime = START_TIMESTAMP - 1 days;
        uint256 gracePeriodEnd = START_TIMESTAMP + 6 days;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            false,
            false,
            gracePeriodEnd,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        (
            bool isActive,
            bool isInGracePeriod,
            uint256 daysRemaining,
            uint8 currentTier,
            uint8 billingCycle
        ) = helper.getSubscriptionStatus(user1);
        
        assertFalse(isActive);
        assertTrue(isInGracePeriod);
        assertEq(daysRemaining, 0);
        assertEq(currentTier, uint8(IMetaGaugeSubscription.SubscriptionTier.Pro));
    }
    
    function testGetSubscriptionStatusExpired() public {
        uint256 startTime = START_TIMESTAMP - 90 days;
        uint256 endTime = START_TIMESTAMP - 10 days;
        uint256 gracePeriodEnd = START_TIMESTAMP - 3 days;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            false,
            false,
            gracePeriodEnd,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        (
            bool isActive,
            bool isInGracePeriod,
            uint256 daysRemaining,
            uint8 currentTier,
            uint8 billingCycle
        ) = helper.getSubscriptionStatus(user1);
        
        assertFalse(isActive);
        assertFalse(isInGracePeriod);
        assertEq(daysRemaining, 0);
    }
    
    function testGetSubscriptionStatusEndingNow() public {
    uint256 startTime = START_TIMESTAMP - 30 days;
    uint256 endTime = START_TIMESTAMP;

    mockSubscription.setSubscriber(
        user1,
        IMetaGaugeSubscription.SubscriptionTier.Pro,
        IMetaGaugeSubscription.UserRole.Startup,
        IMetaGaugeSubscription.BillingCycle.Monthly,
        startTime,
        endTime,
        startTime,
        endTime,
        true,
        false,
        endTime + 7 days,
        30 ether,
        IMetaGaugeSubscription.PaymentCurrency.ETH
    );

    (
        bool isActive,
        bool isInGracePeriod,
        uint256 daysRemaining,
        uint8 currentTier,
        uint8 billingCycle
    ) = helper.getSubscriptionStatus(user1);

    console.log("=== At Exact End Time ===");
    console.log("Current timestamp:", block.timestamp);
    console.log("Subscription endTime:", endTime);
    console.log("Grace period end:", endTime + 7 days);
    console.log("isActive:", isActive);
    console.log("isInGracePeriod:", isInGracePeriod);
    console.log("daysRemaining:", daysRemaining);

    // ✅ CORRECTED: Subscription should be ACTIVE at exact end time (grace period applies)
    assertTrue(isActive, "Subscription should be active at exact end time due to grace period");
    assertFalse(isInGracePeriod, "Should not be in grace period at exact end time");
    assertEq(daysRemaining, 0, "No days should remain at exact end time");
    }

    function testGetSubscriptionStatusOneSecondAfterEnd() public {
    uint256 startTime = START_TIMESTAMP - 30 days;
    uint256 endTime = START_TIMESTAMP;

    mockSubscription.setSubscriber(
        user1,
        IMetaGaugeSubscription.SubscriptionTier.Pro,
        IMetaGaugeSubscription.UserRole.Startup,
        IMetaGaugeSubscription.BillingCycle.Monthly,
        startTime,
        endTime,
        startTime,
        endTime,
        true,
        false,
        endTime + 7 days,
        30 ether,
        IMetaGaugeSubscription.PaymentCurrency.ETH
    );

    // Move 1 second past the end time
    vm.warp(START_TIMESTAMP + 1);

    (
        bool isActive,
        bool isInGracePeriod,
        uint256 daysRemaining,
        uint8 currentTier,
        uint8 billingCycle
    ) = helper.getSubscriptionStatus(user1);

    console.log("=== 1 Second After End Time ===");
    console.log("Current timestamp:", block.timestamp);
    console.log("Subscription endTime:", endTime);
    console.log("isActive:", isActive);
    console.log("isInGracePeriod:", isInGracePeriod);

    // ✅ CORRECTED: Subscription should be ACTIVE but in grace period
    assertTrue(isActive, "Subscription should be active in grace period");
    assertTrue(isInGracePeriod, "Should be in grace period after end time");
    assertEq(daysRemaining, 0, "No days should remain after end time");
    }
    
    function testGetSubscriptionStatusOneSecondBeforeEnd() public {
        uint256 startTime = START_TIMESTAMP - 30 days;
        uint256 endTime = START_TIMESTAMP;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            true,
            false,
            endTime + 7 days,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        vm.warp(START_TIMESTAMP - 1);
        
        (
            bool isActive,
            bool isInGracePeriod,
            uint256 daysRemaining,
            uint8 currentTier,
            uint8 billingCycle
        ) = helper.getSubscriptionStatus(user1);
        
        console.log("=== 1 Second Before End Time ===");
        console.log("Current timestamp:", block.timestamp);
        console.log("Subscription endTime:", endTime);
        console.log("isActive:", isActive);
        console.log("isInGracePeriod:", isInGracePeriod);
        
        assertTrue(isActive, "Subscription should be active before end time");
        assertFalse(isInGracePeriod, "Should not be in grace period before end time");
        assertEq(daysRemaining, 0, "Days remaining should be 0 when less than a day remains");
    }
    
    function testTimeTravel() public {
        uint256 startTime = START_TIMESTAMP - 30 days;
        uint256 endTime = START_TIMESTAMP + 30 days;
        
        mockSubscription.setSubscriber(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            true,
            false,
            endTime + 7 days,
            30 ether, // amountPaid - ADDED
            IMetaGaugeSubscription.PaymentCurrency.ETH // currency - ADDED
        );
        
        (, , uint256 daysRemainingStart, , ) = helper.getSubscriptionStatus(user1);
        assertEq(daysRemainingStart, 30);
        
        vm.warp(START_TIMESTAMP + 15 days);
        
        (, , uint256 daysRemainingMiddle, , ) = helper.getSubscriptionStatus(user1);
        assertEq(daysRemainingMiddle, 15);
        
        vm.warp(endTime);
        
        (, , uint256 daysRemainingEnd, , ) = helper.getSubscriptionStatus(user1);
        assertEq(daysRemainingEnd, 0);
    }
    
    // ============ PROPERTY-BASED TESTS ============
    
    /**
     * @dev Property 14: Upgrade options correctness
     * Feature: test-coverage-100, Property 14: Upgrade options correctness
     * Validates: Requirements 3.1
     * 
     * For any user with active subscription below Enterprise tier,
     * getUpgradeOptions should return all tiers higher than current tier with correct prices.
     */
    function testFuzz_UpgradeOptionsCorrectness(uint8 currentTierValue) public {
        // Bound to valid tiers below Enterprise (0=Free, 1=Starter, 2=Pro)
        vm.assume(currentTierValue <= 2);
        
        IMetaGaugeSubscription.SubscriptionTier currentTier = IMetaGaugeSubscription.SubscriptionTier(currentTierValue);
        
        // Setup all plans with known prices
        _setupAllPlans();
        
        // Setup user with current tier
        uint256 startTime = START_TIMESTAMP - 30 days;
        uint256 endTime = START_TIMESTAMP + 30 days;
        
        mockSubscription.setSubscriber(
            user1,
            currentTier,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime,
            endTime,
            startTime,
            endTime,
            true,
            false,
            endTime + 7 days,
            30 ether,
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        // Get upgrade options
        (
            uint8[] memory availableTiers,
            uint256[] memory monthlyPrices,
            uint256[] memory yearlyPrices
        ) = helper.getUpgradeOptions(user1);
        
        // Calculate expected number of upgrade options
        uint256 expectedCount = 3 - currentTierValue; // Tiers above current up to Enterprise (3)
        
        // Verify correct number of options
        assertEq(availableTiers.length, expectedCount, "Wrong number of upgrade options");
        assertEq(monthlyPrices.length, expectedCount, "Wrong number of monthly prices");
        assertEq(yearlyPrices.length, expectedCount, "Wrong number of yearly prices");
        
        // Verify each option is higher than current tier and has correct prices
        for (uint256 i = 0; i < availableTiers.length; i++) {
            assertTrue(availableTiers[i] > currentTierValue, "Upgrade tier should be higher than current");
            assertTrue(availableTiers[i] <= 3, "Upgrade tier should not exceed Enterprise");
            
            // Verify prices match the plan
            IMetaGaugeSubscription.SubscriptionPlan memory plan = mockSubscription.getPlanInfo(
                IMetaGaugeSubscription.SubscriptionTier(availableTiers[i])
            );
            assertEq(monthlyPrices[i], plan.monthlyPrice, "Monthly price mismatch");
            assertEq(yearlyPrices[i], plan.yearlyPrice, "Yearly price mismatch");
        }
        
        // Verify tiers are in ascending order
        for (uint256 i = 1; i < availableTiers.length; i++) {
            assertTrue(availableTiers[i] > availableTiers[i-1], "Tiers should be in ascending order");
        }
    }
    
    // Helper function to setup all plans
    function _setupAllPlans() internal {
        // Free tier
        IMetaGaugeSubscription.PlanFeatures memory freeFeatures = IMetaGaugeSubscription.PlanFeatures({
            apiCallsPerMonth: 1000,
            maxProjects: 1,
            maxAlerts: 5,
            exportAccess: false,
            comparisonTool: false,
            walletIntelligence: false,
            apiAccess: false,
            prioritySupport: false,
            customInsights: false
        });
        
        IMetaGaugeSubscription.PlanLimits memory freeLimits = IMetaGaugeSubscription.PlanLimits({
            historicalData: 30 days,
            teamMembers: 1,
            dataRefreshRate: 24 hours
        });
        
        mockSubscription.setPlan(
            IMetaGaugeSubscription.SubscriptionTier.Free,
            "Free",
            0 ether,
            0 ether,
            freeFeatures,
            freeLimits,
            true
        );
        
        // Starter tier
        IMetaGaugeSubscription.PlanFeatures memory starterFeatures = IMetaGaugeSubscription.PlanFeatures({
            apiCallsPerMonth: 5000,
            maxProjects: 10,
            maxAlerts: 20,
            exportAccess: true,
            comparisonTool: false,
            walletIntelligence: false,
            apiAccess: false,
            prioritySupport: false,
            customInsights: false
        });
        
        IMetaGaugeSubscription.PlanLimits memory starterLimits = IMetaGaugeSubscription.PlanLimits({
            historicalData: 90 days,
            teamMembers: 3,
            dataRefreshRate: 6 hours
        });
        
        mockSubscription.setPlan(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            "Starter",
            10 ether,
            100 ether,
            starterFeatures,
            starterLimits,
            true
        );
        
        // Pro tier (already set up in setUp())
        // Enterprise tier
        IMetaGaugeSubscription.PlanFeatures memory enterpriseFeatures = IMetaGaugeSubscription.PlanFeatures({
            apiCallsPerMonth: 50000,
            maxProjects: 100,
            maxAlerts: 200,
            exportAccess: true,
            comparisonTool: true,
            walletIntelligence: true,
            apiAccess: true,
            prioritySupport: true,
            customInsights: true
        });
        
        IMetaGaugeSubscription.PlanLimits memory enterpriseLimits = IMetaGaugeSubscription.PlanLimits({
            historicalData: 730 days,
            teamMembers: 50,
            dataRefreshRate: 15 minutes
        });
        
        mockSubscription.setPlan(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise,
            "Enterprise",
            100 ether,
            1000 ether,
            enterpriseFeatures,
            enterpriseLimits,
            true
        );
    }
}