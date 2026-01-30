// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {MetaGaugeSubscription} from "../src/MetaGaugeSubscription.sol";
import {MetaGaugeErrors} from "../src/libraries/MetaGaugeErrors.sol";
import {MetaGaugeConstants} from "../src/libraries/MetaGaugeConstants.sol";
import {IMetaGaugeSubscription} from "../src/interfaces/IMetaGaugeSubscription.sol";
import {MetaGaugeToken} from "../src/MetaGaugeToken.sol";

contract MetaGaugeSubscriptionTest is Test {
    MetaGaugeSubscription public metaGaugeSubscription;
    MetaGaugeToken public mockToken; // Add this missing declaration
    address public owner = address(0xABCD);
    address public user1 = address(0x1234);

    function setUp() public {
        // Deploy mock token first
        mockToken = new MetaGaugeToken();
        
        // Use the actual mock token address, not the invalid syntax
        address tokenAddress = address(mockToken);
        bool useToken = true;
        
        // Deploy the contract with the owner address
        metaGaugeSubscription = new MetaGaugeSubscription(
            tokenAddress,  // _tokenAddress
            useToken       // _useToken
        );
        
        // Label addresses for clarity in test traces
        vm.label(owner, "Owner");
        vm.label(user1, "User1");
        vm.label(address(mockToken), "MockToken");
    }

    function testOwnerIsSet() public {
        address expectedOwner = address(this); // The test contract itself is the deployer
        assertEq(metaGaugeSubscription.owner(), expectedOwner, "Owner should be correctly set");
    }
    
    function testPlanInfo() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Free
        );

        assertEq(plan.name, "Free", "Tier 0 (Free) should have correct name");
    }
    
    function testProPlanInfo() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Pro
        );
        assertEq(plan.name, "Pro", "Pro plan name mismatch");
        // assertGt(plan.price, 0, "Pro plan should have a nonzero price");
    }
    function testFreePlanInfo() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Free
        );
        assertEq(plan.name, "Free", "free plan name mismatch");
        // assertGt(plan.price, 0, "Pro plan should have a nonzero price");
    }
    function testStarterPlanInfo() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Starter
        );
        assertEq(plan.name, "Starter", "Starter plan name mismatch");
        // assertGt(plan.price, 0, "Pro plan should have a nonzero price");
    }
    function testEnterprisePlanInfo() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise
        );
        assertEq(plan.name, "Enterprise", "Enterprise plan name mismatch");
        // assertGt(plan.price, 0, "Pro plan should have a nonzero price");
    }
    
    function testcreateStarterPlan() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Starter
        );
        
        // Assert plan name
        assertEq(plan.name, "Starter", "Plan name should be 'Starter'");
        
        // Assert prices are set
        assertGt(plan.monthlyPrice, 0, "Monthly price should be greater than 0");
        assertGt(plan.yearlyPrice, 0, "Yearly price should be greater than 0");
        assertGt(plan.yearlyPrice, plan.monthlyPrice, "Yearly price should be greater than monthly price");
        
        // Assert features are enabled for Starter tier
        assertTrue(plan.features.exportAccess, "Export access should be enabled");
        assertTrue(plan.features.comparisonTool, "Comparison tool should be enabled");
        assertFalse(plan.features.walletIntelligence, "Wallet intelligence should be disabled for Starter");
        assertFalse(plan.features.apiAccess, "API access should be disabled for Starter");
        assertFalse(plan.features.prioritySupport, "Priority support should be disabled for Starter");
        assertFalse(plan.features.customInsights, "Custom insights should be disabled for Starter");
        
        // Assert API calls and projects limits for Starter
        assertGt(plan.features.apiCallsPerMonth, 0, "API calls should be > 0");
        assertGt(plan.features.maxProjects, 0, "Max projects should be > 0");
        assertGt(plan.features.maxAlerts, 0, "Max alerts should be > 0");
        
        // Assert plan limits (historical data, team members, refresh rate)
        assertGt(plan.limits.historicalData, 0, "Historical data limit should be > 0");
        assertGt(plan.limits.teamMembers, 0, "Team members limit should be > 0");
        assertGt(plan.limits.dataRefreshRate, 0, "Data refresh rate should be > 0");
        
        // Assert plan is active
        assertTrue(plan.active, "Starter plan should be active");
    }
    
    function testcreateFreePlan() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Free
        );
        
        // Assert plan name
        assertEq(plan.name, "Free", "Plan name should be 'Free'");
        
        // Assert prices are zero for Free tier
        assertEq(plan.monthlyPrice, 0, "Monthly price should be 0 for Free");
        assertEq(plan.yearlyPrice, 0, "Yearly price should be 0 for Free");
        
        // Assert features are limited for Free tier
        assertFalse(plan.features.exportAccess, "Export access should be disabled for Free");
        assertFalse(plan.features.comparisonTool, "Comparison tool should be disabled for Free");
        assertFalse(plan.features.walletIntelligence, "Wallet intelligence should be disabled for Free");
        assertFalse(plan.features.apiAccess, "API access should be disabled for Free");
        assertFalse(plan.features.prioritySupport, "Priority support should be disabled for Free");
        assertFalse(plan.features.customInsights, "Custom insights should be disabled for Free");
        
        // Assert API calls and projects limits for Free
        assertGt(plan.features.apiCallsPerMonth, 0, "API calls should be > 0");
        assertGt(plan.features.maxProjects, 0, "Max projects should be > 0");
        assertGt(plan.features.maxAlerts, 0, "Max alerts should be > 0");
        
        // Assert plan limits (historical data, team members, refresh rate)
        assertGt(plan.limits.historicalData, 0, "Historical data limit should be > 0");
        assertGt(plan.limits.teamMembers, 0, "Team members limit should be > 0");
        assertGt(plan.limits.dataRefreshRate, 0, "Data refresh rate should be > 0");
        
        // Assert plan is active
        assertTrue(plan.active, "Free plan should be active");
    }
    
    function testcreateProPlan() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Pro
        );
        
        // Assert plan name
        assertEq(plan.name, "Pro", "Plan name should be 'Pro'");
        
        // Assert prices are set
        assertGt(plan.monthlyPrice, 0, "Monthly price should be greater than 0");
        assertGt(plan.yearlyPrice, 0, "Yearly price should be greater than 0");
        assertGt(plan.yearlyPrice, plan.monthlyPrice, "Yearly price should be greater than monthly price");
        
        // Assert features are enabled for Pro tier
        assertTrue(plan.features.exportAccess, "Export access should be enabled for Pro");
        assertTrue(plan.features.comparisonTool, "Comparison tool should be enabled for Pro");
        assertTrue(plan.features.walletIntelligence, "Wallet intelligence should be enabled for Pro");
        assertTrue(plan.features.apiAccess, "API access should be enabled for Pro");
        assertFalse(plan.features.prioritySupport, "Priority support should be disabled for Pro");
        assertFalse(plan.features.customInsights, "Custom insights should be disabled for Pro");
        
        // Assert API calls and projects limits for Pro (higher than Starter)
        assertGt(plan.features.apiCallsPerMonth, 0, "API calls should be > 0");
        assertGt(plan.features.maxProjects, 0, "Max projects should be > 0");
        assertGt(plan.features.maxAlerts, 0, "Max alerts should be > 0");
        
        // Assert plan limits (historical data, team members, refresh rate)
        assertGt(plan.limits.historicalData, 0, "Historical data limit should be > 0");
        assertGt(plan.limits.teamMembers, 0, "Team members limit should be > 0");
        assertGt(plan.limits.dataRefreshRate, 0, "Data refresh rate should be > 0");
        
        // Assert plan is active
        assertTrue(plan.active, "Pro plan should be active");
    }
    
    function testcreateEnterprisePlan() public {
        IMetaGaugeSubscription.SubscriptionPlan memory plan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise
        );
        
        // Assert plan name
        assertEq(plan.name, "Enterprise", "Plan name should be 'Enterprise'");
        
        // Assert prices are set
        assertGt(plan.monthlyPrice, 0, "Monthly price should be greater than 0");
        assertGt(plan.yearlyPrice, 0, "Yearly price should be greater than 0");
        assertGt(plan.yearlyPrice, plan.monthlyPrice, "Yearly price should be greater than monthly price");
        
        // Assert all features are enabled for Enterprise tier
        assertTrue(plan.features.exportAccess, "Export access should be enabled for Enterprise");
        assertTrue(plan.features.comparisonTool, "Comparison tool should be enabled for Enterprise");
        assertTrue(plan.features.walletIntelligence, "Wallet intelligence should be enabled for Enterprise");
        assertTrue(plan.features.apiAccess, "API access should be enabled for Enterprise");
        assertTrue(plan.features.prioritySupport, "Priority support should be enabled for Enterprise");
        assertTrue(plan.features.customInsights, "Custom insights should be enabled for Enterprise");
        
        // Assert API calls and projects limits for Enterprise (highest tier)
        assertGt(plan.features.apiCallsPerMonth, 0, "API calls should be > 0");
        assertGt(plan.features.maxProjects, 0, "Max projects should be > 0");
        assertGt(plan.features.maxAlerts, 0, "Max alerts should be > 0");
        
        // Assert plan limits (historical data, team members, refresh rate)
        assertGt(plan.limits.historicalData, 0, "Historical data limit should be > 0");
        assertGt(plan.limits.teamMembers, 0, "Team members limit should be > 0");
        assertGt(plan.limits.dataRefreshRate, 0, "Data refresh rate should be > 0");
        
        // Assert plan is active
        assertTrue(plan.active, "Enterprise plan should be active");
    }
    
    // ============ SUBSCRIBE TESTS ============
    
    function _mintAndApprove(address user, uint256 amount) internal {
        mockToken.mint(user, amount);
        vm.prank(user);
        mockToken.approve(address(metaGaugeSubscription), amount);
    }

    function testSubscribeStarterMonthly() public {
        address subscriber = address(0x5555);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-starter-monthly",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        IMetaGaugeSubscription.Subscriber memory sub = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertEq(uint(sub.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Starter), "Tier should be Starter");
        assertTrue(sub.isActive, "Subscription should be active");
        assertEq(sub.amountPaid, price, "Amount paid should match");
        assertEq(sub.userAddress, subscriber, "User address should match");
    }
    
    function testSubscribeProYearly() public {
        address subscriber = address(0x6666);
        uint256 price = MetaGaugeConstants.PRO_YEARLY_PRICE;
        _mintAndApprove(subscriber, price);
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Yearly,
            "uuid-pro-yearly",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        IMetaGaugeSubscription.Subscriber memory sub = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertEq(uint(sub.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Pro), "Tier should be Pro");
        assertEq(uint(sub.billingCycle), uint(IMetaGaugeSubscription.BillingCycle.Yearly), "Billing cycle should be Yearly");
    }
    
    function testSubscribeFreeTier() public {
        address subscriber = address(0x7777);
        _mintAndApprove(subscriber, 0);
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Free,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-free",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        IMetaGaugeSubscription.Subscriber memory sub = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertEq(uint(sub.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Free), "Tier should be Free");
        assertEq(sub.amountPaid, 0, "Free tier should have 0 amount paid");
    }
    
    function testSubscribeIncrementsTotalSubscribers() public {
        uint256 initialCount = metaGaugeSubscription.totalSubscribers();
        address subscriber = address(0x8888);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-increment",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        assertEq(metaGaugeSubscription.totalSubscribers(), initialCount + 1, "Total subscribers should increment");
    }
    
    function testSubscribeUpdatesTotalRevenue() public {
        uint256 initialRevenue = metaGaugeSubscription.totalRevenue();
        address subscriber = address(0x9999);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-revenue",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        assertEq(metaGaugeSubscription.totalRevenue(), initialRevenue + price, "Revenue should update");
    }
    
    // ============ CANCEL SUBSCRIPTION TESTS ============
    
    function testCancelSubscription() public {
        address subscriber = address(0xAAAA);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        // Subscribe first
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-cancel",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        IMetaGaugeSubscription.Subscriber memory subBefore = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertTrue(subBefore.isActive, "Subscription should be active before cancel");
        
        // Cancel subscription
        vm.prank(subscriber);
        metaGaugeSubscription.cancelSubscription();
        
        IMetaGaugeSubscription.Subscriber memory subAfter = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertFalse(subAfter.isActive, "Subscription should be inactive after cancel");
    }
    
    function testCancelSubscriptionDecrementsTotalSubscribers() public {
        address subscriber = address(0xBBBB);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-cancel-decrement",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 countAfterSubscribe = metaGaugeSubscription.totalSubscribers();
        
        vm.prank(subscriber);
        metaGaugeSubscription.cancelSubscription();
        
        assertEq(metaGaugeSubscription.totalSubscribers(), countAfterSubscribe - 1, "Total subscribers should decrement");
    }
    
    // ============ IS SUBSCRIBER ACTIVE TESTS ============
    
    function testIsSubscriberActive() public {
        address subscriber = address(0xCCCC);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        // Before subscribing
        assertFalse(metaGaugeSubscription.isSubscriberActive(subscriber), "Should not be active before subscribe");
        
        // After subscribing
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-active",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        assertTrue(metaGaugeSubscription.isSubscriberActive(subscriber), "Should be active after subscribe");
    }
    
    // ============ UPDATE PLAN STATUS TESTS ============
    
    function testUpdatePlanStatusByOwner() public {
        // Plan should start as active
        IMetaGaugeSubscription.SubscriptionPlan memory planBefore = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Pro
        );
        assertTrue(planBefore.active, "Pro plan should start as active");
        
        // Update plan status to inactive (only owner can do this)
        metaGaugeSubscription.updatePlanStatus(IMetaGaugeSubscription.SubscriptionTier.Pro, false);
        
        IMetaGaugeSubscription.SubscriptionPlan memory planAfter = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Pro
        );
        assertFalse(planAfter.active, "Pro plan should be inactive after update");
    }
    
    function testUpdatePlanStatusReactivates() public {
        // Deactivate
        metaGaugeSubscription.updatePlanStatus(IMetaGaugeSubscription.SubscriptionTier.Starter, false);
        IMetaGaugeSubscription.SubscriptionPlan memory deactivated = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Starter
        );
        assertFalse(deactivated.active, "Plan should be deactivated");
        
        // Reactivate
        metaGaugeSubscription.updatePlanStatus(IMetaGaugeSubscription.SubscriptionTier.Starter, true);
        IMetaGaugeSubscription.SubscriptionPlan memory reactivated = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Starter
        );
        assertTrue(reactivated.active, "Plan should be reactivated");
    }
    
    // ============ UPDATE USER ROLE TESTS ============
    
    function testUpdateUserRole() public {
        address subscriber = address(0xDDDD);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        // Subscribe with Startup role
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-role",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        IMetaGaugeSubscription.Subscriber memory subBefore = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertEq(uint(subBefore.role), uint(IMetaGaugeSubscription.UserRole.Startup), "Initial role should be Startup");
        
        // Update role to Researcher
        vm.prank(subscriber);
        metaGaugeSubscription.updateUserRole(IMetaGaugeSubscription.UserRole.Researcher);
        
        IMetaGaugeSubscription.Subscriber memory subAfter = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertEq(uint(subAfter.role), uint(IMetaGaugeSubscription.UserRole.Researcher), "Role should be updated to Researcher");
    }
    
    // ============ WITHDRAW FUNDS TESTS ============
    
    // Note: withdrawFunds() is designed for ETH-mode contracts.
    // Since the test contract is deployed in token-mode (useToken=true),
    // the withdraw function expects ETH but the contract doesn't accumulate ETH.
    // In a real scenario, you would test withdrawFunds() with an ETH-mode deployment.
    
    function testWithdrawTokens() public {
        address subscriber = address(0xEEEE);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        
        // Subscribe to add tokens to contract
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-withdraw-token",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 contractTokenBalanceBefore = mockToken.balanceOf(address(metaGaugeSubscription));
        assertGt(contractTokenBalanceBefore, 0, "Contract should have token balance after subscribe");
        
        uint256 ownerTokenBalanceBefore = mockToken.balanceOf(address(this));
        
        // Withdraw tokens (only owner can do this)
        metaGaugeSubscription.withdrawTokens(contractTokenBalanceBefore);
        
        assertEq(mockToken.balanceOf(address(metaGaugeSubscription)), 0, "Contract token balance should be 0 after withdraw");
        assertEq(mockToken.balanceOf(address(this)), ownerTokenBalanceBefore + contractTokenBalanceBefore, "Owner should receive tokens");
    }
    
    function testWithdrawTokensPartial() public {
        address subscriber = address(0xFFFF);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        
        // Subscribe to add tokens to contract
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-withdraw-partial",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 contractTokenBalanceBefore = mockToken.balanceOf(address(metaGaugeSubscription));
        uint256 withdrawAmount = contractTokenBalanceBefore / 2;
        
        // Withdraw partial tokens
        metaGaugeSubscription.withdrawTokens(withdrawAmount);
        
        assertEq(mockToken.balanceOf(address(metaGaugeSubscription)), contractTokenBalanceBefore - withdrawAmount, "Contract should have remaining tokens");
    }
    
    // ============ ERROR & REVERT TESTS ============
    
    function testSubscribeAlreadySubscribed() public {
        address subscriber = address(0x1111);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price * 2);
        
        // First subscription
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-first",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Try to subscribe again (should revert)
        vm.prank(subscriber);
        vm.expectRevert();
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-second",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
    }
    
    
    function testSubscribeEmptyUUID() public {
        address subscriber = address(0x4444);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        
        // Try to subscribe with empty UUID
        vm.prank(subscriber);
        vm.expectRevert();
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
    }
    
    function testCancelNonActiveSubscription() public {
        address subscriber = address(0x5566);
        
        // Try to cancel when not subscribed
        vm.prank(subscriber);
        vm.expectRevert();
        metaGaugeSubscription.cancelSubscription();
    }
    
    function testUpdatePlanStatusNonOwner() public {
        address nonOwner = address(0x6677);
        
        // Try to update plan as non-owner
        vm.prank(nonOwner);
        vm.expectRevert();
        metaGaugeSubscription.updatePlanStatus(IMetaGaugeSubscription.SubscriptionTier.Starter, false);
    }
    
    // ============ ADVANCED SCENARIO TESTS ============
    
    function testSubscribeAfterCancellation() public {
        address subscriber = address(0x7788);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        uint256 price2 = MetaGaugeConstants.PRO_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price + price2);
        
        // Subscribe
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-cancel-resub",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Cancel
        vm.prank(subscriber);
        metaGaugeSubscription.cancelSubscription();
        
        IMetaGaugeSubscription.Subscriber memory subAfterCancel = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertFalse(subAfterCancel.isActive, "Should be inactive after cancel");
        
        // Subscribe again (should work after cancellation)
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-resub",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        IMetaGaugeSubscription.Subscriber memory subAfterResub = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertTrue(subAfterResub.isActive, "Should be active after resubscription");
        assertEq(uint(subAfterResub.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Pro), "Tier should be Pro after resubscription");
    }
    
    // ============ EVENT EMISSION TESTS ============
    
    function testSubscriptionCancelledEventEmitted() public {
        address subscriber = address(0x99AA);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        _mintAndApprove(subscriber, price);
        
        // Subscribe first
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-cancel-event",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Cancel and expect event
        vm.prank(subscriber);
        vm.expectEmit(true, false, false, false);
        emit IMetaGaugeSubscription.SubscriptionCancelled(subscriber);
        metaGaugeSubscription.cancelSubscription();
    }
    
    function testPlanTierUpdatedEventEmitted() public {
        vm.expectEmit(true, false, false, true);
        emit IMetaGaugeSubscription.PlanTierUpdated(IMetaGaugeSubscription.SubscriptionTier.Pro, false);
        metaGaugeSubscription.updatePlanStatus(IMetaGaugeSubscription.SubscriptionTier.Pro, false);
    }
}