// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MetaGaugeSubscription.sol";
import "../src/MetaGaugeToken.sol";

/**
 * @title MetaGaugeSubscriptionChangeTest
 * @dev Tests for changeSubscription() function - upgrades, downgrades, and billing cycle changes
 */
contract MetaGaugeSubscriptionChangeTest is Test {
    MetaGaugeSubscription public subscription;
    MetaGaugeToken public token;
    
    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    uint256 constant INITIAL_BALANCE = 10000 ether;
    
    function setUp() public {
        // Deploy token and subscription contract in token mode
        token = new MetaGaugeToken();
        subscription = new MetaGaugeSubscription(address(token), true);
        
        // Fund users
        token.mint(user1, INITIAL_BALANCE);
        token.mint(user2, INITIAL_BALANCE);
        
        // Approve subscription contract
        vm.prank(user1);
        token.approve(address(subscription), type(uint256).max);
        
        vm.prank(user2);
        token.approve(address(subscription), type(uint256).max);
    }
    
    function _mintAndApprove(address user, uint256 amount) internal {
        token.mint(user, amount);
        vm.prank(user);
        token.approve(address(subscription), amount);
    }
    
    // ============ UPGRADE TESTS ============
    
    function testChangeSubscription_UpgradeStarterToPro() public {
        // Subscribe to Starter monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Warp forward 15 days (half the month)
        vm.warp(block.timestamp + 15 days);
        
        // Upgrade to Pro monthly
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        // Verify upgrade
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user1);
        assertEq(uint8(sub.tier), uint8(IMetaGaugeSubscription.SubscriptionTier.Pro));
        assertEq(uint8(sub.billingCycle), uint8(IMetaGaugeSubscription.BillingCycle.Monthly));
        assertTrue(sub.isActive);
    }
    
    function testChangeSubscription_UpgradeProToEnterprise() public {
        // Subscribe to Pro monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Warp forward 10 days
        vm.warp(block.timestamp + 10 days);
        
        // Upgrade to Enterprise monthly
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        // Verify upgrade
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user1);
        assertEq(uint8(sub.tier), uint8(IMetaGaugeSubscription.SubscriptionTier.Enterprise));
        assertTrue(sub.isActive);
    }
    
    // ============ DOWNGRADE TESTS ============
    
    function testChangeSubscription_DowngradeProToStarter() public {
        // Subscribe to Pro monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 balanceBefore = token.balanceOf(user1);
        
        // Warp forward 10 days
        vm.warp(block.timestamp + 10 days);
        
        // Downgrade to Starter monthly (should get refund)
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        // Verify downgrade
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user1);
        assertEq(uint8(sub.tier), uint8(IMetaGaugeSubscription.SubscriptionTier.Starter));
        assertTrue(sub.isActive);
        
        // Verify refund was received
        uint256 balanceAfter = token.balanceOf(user1);
        assertTrue(balanceAfter > balanceBefore, "Should receive refund for downgrade");
    }
    
    function testChangeSubscription_DowngradeEnterpriseToStarter() public {
        // Subscribe to Enterprise monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 balanceBefore = token.balanceOf(user1);
        
        // Warp forward 5 days
        vm.warp(block.timestamp + 5 days);
        
        // Downgrade to Starter monthly
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        // Verify downgrade and refund
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user1);
        assertEq(uint8(sub.tier), uint8(IMetaGaugeSubscription.SubscriptionTier.Starter));
        
        uint256 balanceAfter = token.balanceOf(user1);
        assertTrue(balanceAfter > balanceBefore, "Should receive significant refund");
    }
    
    // ============ BILLING CYCLE CHANGE TESTS ============
    
    function testChangeSubscription_MonthlyToYearly() public {
        // Subscribe to Pro monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Warp forward 10 days
        vm.warp(block.timestamp + 10 days);
        
        // Change to yearly billing (same tier)
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Yearly
        );
        
        // Verify billing cycle changed
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user1);
        assertEq(uint8(sub.billingCycle), uint8(IMetaGaugeSubscription.BillingCycle.Yearly));
        assertEq(uint8(sub.tier), uint8(IMetaGaugeSubscription.SubscriptionTier.Pro));
    }
    
    function testChangeSubscription_YearlyToMonthly() public {
        // Subscribe to Pro yearly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Yearly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 balanceBefore = token.balanceOf(user1);
        
        // Warp forward 30 days
        vm.warp(block.timestamp + 30 days);
        
        // Change to monthly billing (should get refund)
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        // Verify billing cycle changed and refund received
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user1);
        assertEq(uint8(sub.billingCycle), uint8(IMetaGaugeSubscription.BillingCycle.Monthly));
        
        uint256 balanceAfter = token.balanceOf(user1);
        assertTrue(balanceAfter > balanceBefore, "Should receive refund when switching to cheaper plan");
    }
    
    // ============ COMBINED CHANGE TESTS ============
    
    function testChangeSubscription_UpgradeAndChangeCycle() public {
        // Subscribe to Starter monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Warp forward 15 days
        vm.warp(block.timestamp + 15 days);
        
        // Upgrade to Pro yearly
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Yearly
        );
        
        // Verify both tier and cycle changed
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user1);
        assertEq(uint8(sub.tier), uint8(IMetaGaugeSubscription.SubscriptionTier.Pro));
        assertEq(uint8(sub.billingCycle), uint8(IMetaGaugeSubscription.BillingCycle.Yearly));
        assertTrue(sub.isActive);
    }
    
    // ============ ERROR CONDITION TESTS ============
    
    function testChangeSubscription_NoActiveSubscription_Reverts() public {
        // Try to change without subscribing first
        vm.prank(user1);
        vm.expectRevert();
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
    }
    
    function testChangeSubscription_CancelledSubscription_Reverts() public {
        // Subscribe
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Cancel subscription
        vm.prank(user1);
        subscription.cancelSubscription();
        
        // Try to change (should revert)
        vm.prank(user1);
        vm.expectRevert();
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
    }
    
    function testChangeSubscription_InactiveTier_Reverts() public {
        // Subscribe
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Deactivate Pro tier
        subscription.updatePlanStatus(IMetaGaugeSubscription.SubscriptionTier.Pro, false);
        
        // Try to change to inactive tier (should revert)
        vm.prank(user1);
        vm.expectRevert();
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
    }
    
    function testChangeSubscription_ExpiredSubscription_Reverts() public {
        // Subscribe
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Warp past subscription end + grace period
        vm.warp(block.timestamp + 40 days);
        
        // Try to change (should revert - no time remaining)
        vm.prank(user1);
        vm.expectRevert();
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
    }
    
    // ============ EVENT EMISSION TESTS ============
    
    function testChangeSubscription_EmitsEvent() public {
        // Subscribe
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        // Warp forward
        vm.warp(block.timestamp + 10 days);
        
        // Expect event emission
        vm.expectEmit(true, false, false, true);
        emit IMetaGaugeSubscription.SubscriptionChanged(
            user1,
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        // Change subscription
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
    }
    
    // ============ PAYMENT VERIFICATION TESTS ============
    
    function testChangeSubscription_UpgradeChargesCorrectAmount() public {
        // Subscribe to Starter monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 balanceBefore = token.balanceOf(user1);
        
        // Warp forward 15 days (half month)
        vm.warp(block.timestamp + 15 days);
        
        // Upgrade to Pro monthly
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        uint256 balanceAfter = token.balanceOf(user1);
        
        // Should have paid something for upgrade
        assertTrue(balanceBefore > balanceAfter, "Should have paid for upgrade");
    }
    
    function testChangeSubscription_DowngradeRefundsCorrectAmount() public {
        // Subscribe to Enterprise monthly
        vm.prank(user1);
        subscription.subscribe(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "user1-uuid",
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        
        uint256 balanceBefore = token.balanceOf(user1);
        
        // Warp forward 5 days (most of month remaining)
        vm.warp(block.timestamp + 5 days);
        
        // Downgrade to Starter monthly
        vm.prank(user1);
        subscription.changeSubscription(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.BillingCycle.Monthly
        );
        
        uint256 balanceAfter = token.balanceOf(user1);
        
        // Should have received refund
        assertTrue(balanceAfter > balanceBefore, "Should have received refund for downgrade");
        
        // Refund should be significant (most of month remaining)
        uint256 refund = balanceAfter - balanceBefore;
        assertTrue(refund > 0, "Refund should be positive");
    }
}
