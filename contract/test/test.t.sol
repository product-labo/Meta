// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {MetaGaugeSubscription} from "../src/MetaGaugeSubscription.sol";
import {MetaGaugeErrors} from "../src/libraries/MetaGaugeErrors.sol";
import {IMetaGaugeSubscription} from "../src/interfaces/IMetaGaugeSubscription.sol";
import {MetaGaugeToken} from "../src/MetaGaugeToken.sol";
import {MetaGaugeConstants} from "../src/libraries/MetaGaugeConstants.sol";

contract MetaGaugeSubscriptionTest is Test {
    MetaGaugeSubscription public metaGaugeSubscription;
    MetaGaugeToken public mockToken;
    address public owner = address(0xABCD);
    address public user1 = address(0x1234);
    address public user2 = address(0x5678);

    // Test UUIDs
    string constant USER1_UUID = "user-123-uuid";
    string constant USER2_UUID = "user-456-uuid";

    function setUp() public {
        // Deploy mock token first
        mockToken = new MetaGaugeToken();
        
        // Deploy subscription contract with token payments enabled
        metaGaugeSubscription = new MetaGaugeSubscription(
            address(mockToken),  // _tokenAddress
            true                 // _useToken = true (use token payments)
        );
        
        // Label addresses for clarity in test traces
        vm.label(owner, "Owner");
        vm.label(user1, "User1");
        vm.label(user2, "User2");
        vm.label(address(mockToken), "MockToken");

        // Fund users with tokens for testing
        mockToken.transfer(user1, 10000 * 10**18);
        mockToken.transfer(user2, 10000 * 10**18);
    }

    function testUserSubscribeToProPlanMonthly() public {
        // Get initial subscription info
        IMetaGaugeSubscription.Subscriber memory initialSubscription = 
            metaGaugeSubscription.getSubscriptionInfo(user1);
        
        assertFalse(initialSubscription.isActive, "User should not be active initially");

        // Prepare for subscription
        vm.startPrank(user1);
        
        // Approve the subscription contract to spend tokens
        uint256 requiredAmount = MetaGaugeConstants.PRO_MONTHLY_PRICE;
        mockToken.approve(address(metaGaugeSubscription), requiredAmount);

        // Subscribe to Pro plan monthly
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );

        vm.stopPrank();

        // Check subscription details after subscription
        IMetaGaugeSubscription.Subscriber memory finalSubscription = 
            metaGaugeSubscription.getSubscriptionInfo(user1);

        assertEq(uint(finalSubscription.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Pro), "User should now have Pro tier");
        assertEq(uint(finalSubscription.role), uint(IMetaGaugeSubscription.UserRole.Startup), "User should have Startup role");
        assertEq(uint(finalSubscription.billingCycle), uint(IMetaGaugeSubscription.BillingCycle.Monthly), "Should be monthly billing");
        assertTrue(finalSubscription.isActive, "Subscription should be active");
        assertTrue(finalSubscription.endTime > block.timestamp, "Subscription should have future expiry");
        
        // Check that tokens were transferred
        uint256 contractBalance = mockToken.balanceOf(address(metaGaugeSubscription));
        assertTrue(contractBalance >= requiredAmount, "Contract should have received payment");
    }


    function testSubscribeWithInsufficientAllowance_Debug() public {
    vm.startPrank(user1);
    
    // Check the actual Pro plan price
    uint256 proPrice = MetaGaugeConstants.PRO_MONTHLY_PRICE;
    console.log("Pro monthly price:", proPrice);
    
    // Check user's token balance
    uint256 userBalance = mockToken.balanceOf(user1);
    console.log("User token balance:", userBalance);
    
    // Approve only 10 tokens (insufficient)
    uint256 smallAllowance = 10 * 10**18;
    mockToken.approve(address(metaGaugeSubscription), smallAllowance);
    
    // Check allowance was set correctly
    uint256 actualAllowance = mockToken.allowance(user1, address(metaGaugeSubscription));
    console.log("Allowance set to:", actualAllowance);
    
    console.log("About to call subscribe...");
    
    // Try the subscription - let's see what happens
    try metaGaugeSubscription.subscribe{value: 0}(
        IMetaGaugeSubscription.SubscriptionTier.Pro,
        IMetaGaugeSubscription.UserRole.Startup,
        IMetaGaugeSubscription.BillingCycle.Monthly,
        USER1_UUID,
        IMetaGaugeSubscription.PaymentCurrency.Token
    ) {
        console.log(" SUBSCRIBE SUCCEEDED (this should not happen!)");
        
        // Check if user actually got subscribed
        IMetaGaugeSubscription.Subscriber memory sub = metaGaugeSubscription.getSubscriptionInfo(user1);
        console.log("User subscribed:", sub.isActive);
        console.log("User tier:", uint(sub.tier));
        
        // Check token balances after
        uint256 userBalanceAfter = mockToken.balanceOf(user1);
        uint256 contractBalanceAfter = mockToken.balanceOf(address(metaGaugeSubscription));
        console.log("User balance after:", userBalanceAfter);
        console.log("Contract balance after:", contractBalanceAfter);
        console.log("Tokens transferred:", userBalance - userBalanceAfter);
        
    } catch Error(string memory reason) {
        console.log(" Reverted with reason:", reason);
    } catch (bytes memory lowLevelData) {
        console.log(" Reverted with low level data");
        console.logBytes(lowLevelData);
    }

    vm.stopPrank();
}

    function testUserSubscribeToEnterprisePlanYearly() public {
        vm.startPrank(user2);
        
        // Approve and subscribe to Enterprise plan yearly
        uint256 requiredAmount = MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE;
        mockToken.approve(address(metaGaugeSubscription), requiredAmount);
        
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Yearly,
            USER2_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );

        vm.stopPrank();

        // Verify subscription
        IMetaGaugeSubscription.Subscriber memory subscription = 
            metaGaugeSubscription.getSubscriptionInfo(user2);

        assertEq(uint(subscription.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Enterprise), "User should have Enterprise tier");
        assertEq(uint(subscription.role), uint(IMetaGaugeSubscription.UserRole.Researcher), "User should have Researcher role");
        assertEq(uint(subscription.billingCycle), uint(IMetaGaugeSubscription.BillingCycle.Yearly), "Should be yearly billing");
        assertTrue(subscription.endTime > block.timestamp + 365 days - 1 days, "Yearly subscription should have ~1 year duration");
    }

    function testSubscribeWithInsufficientAllowance() public {
    vm.startPrank(user1);
    
    // Set allowance to LESS than the required amount
    uint256 proPrice = MetaGaugeConstants.PRO_MONTHLY_PRICE;
    uint256 insufficientAllowance = proPrice - 1; // Set allowance to 1 wei less than required
    
    mockToken.approve(address(metaGaugeSubscription), insufficientAllowance);
    
    console.log("Pro price:", proPrice);
    console.log("Allowance set:", insufficientAllowance);
    
    // This should now fail with insufficient allowance
    vm.expectRevert();
    metaGaugeSubscription.subscribe{value: 0}(
        IMetaGaugeSubscription.SubscriptionTier.Pro,
        IMetaGaugeSubscription.UserRole.Startup,
        IMetaGaugeSubscription.BillingCycle.Monthly,
        USER1_UUID,
        IMetaGaugeSubscription.PaymentCurrency.Token
    );

    vm.stopPrank();
}

    function testSubscribeToFreePlan() public {
        vm.startPrank(user1);

        // Subscribe to Free tier (should work without payment)
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Free,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );

        vm.stopPrank();

        // Verify subscription
        IMetaGaugeSubscription.Subscriber memory subscription = 
            metaGaugeSubscription.getSubscriptionInfo(user1);

        assertEq(uint(subscription.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Free), "User should have Free tier");
        assertTrue(subscription.isActive, "Free subscription should be active");
    }

    function testSubscribeWithWrongCurrency() public {
        vm.startPrank(user1);
        
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);

        // Try to subscribe with ETH currency but in token mode - should fail
        vm.expectRevert("Invalid currency for token mode");
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.ETH  // Wrong currency for token mode
        );

        vm.stopPrank();
    }

    function testSubscribeWithEmptyUUID() public {
        vm.startPrank(user1);
        
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);

        // Try to subscribe with empty UUID - should fail
        vm.expectRevert(); // Should revert with InvalidAddress error
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "",  // Empty UUID
            IMetaGaugeSubscription.PaymentCurrency.Token
        );

        vm.stopPrank();
    }

    function testAlreadySubscribed() public {
        // First subscription
        vm.startPrank(user1);
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        vm.stopPrank();

        // Try to subscribe again - should fail
        vm.startPrank(user1);
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);
        
        vm.expectRevert(); // Should revert with AlreadySubscribed error
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );

        vm.stopPrank();
    }

   function testIsSubscriberActive() public {
    // Subscribe first
    vm.startPrank(user1);
    mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);
    metaGaugeSubscription.subscribe{value: 0}(
        IMetaGaugeSubscription.SubscriptionTier.Pro,
        IMetaGaugeSubscription.UserRole.Startup,
        IMetaGaugeSubscription.BillingCycle.Monthly,
        USER1_UUID,
        IMetaGaugeSubscription.PaymentCurrency.Token
    );
    vm.stopPrank();

    // Check if active
    bool isActive = metaGaugeSubscription.isSubscriberActive(user1);
    assertTrue(isActive, "User should be active after subscription");

    // Move time forward past subscription end (but check grace period first)
    IMetaGaugeSubscription.Subscriber memory sub = metaGaugeSubscription.getSubscriptionInfo(user1);
    
    // Move past grace period to ensure subscription is truly expired
    vm.warp(sub.gracePeriodEnd + 1 days);

    // Check if still active (should be false now)
    bool isStillActive = metaGaugeSubscription.isSubscriberActive(user1);
    assertFalse(isStillActive, "User should not be active after subscription and grace period expire");
}

    function testGetPlanInfo() public {
        // Test Free plan
        IMetaGaugeSubscription.SubscriptionPlan memory freePlan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Free
        );
        assertEq(freePlan.name, "Free", "Free plan should have correct name");
        assertEq(freePlan.monthlyPrice, 0, "Free plan should be free");

        // Test Pro plan
        IMetaGaugeSubscription.SubscriptionPlan memory proPlan = metaGaugeSubscription.getPlanInfo(
            IMetaGaugeSubscription.SubscriptionTier.Pro
        );
        assertEq(proPlan.name, "Pro", "Pro plan should have correct name");
        assertTrue(proPlan.monthlyPrice > 0, "Pro plan should have a price");
    }

    function testUpdateUserRole() public {
        // Subscribe first
        vm.startPrank(user1);
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,  // Start as Startup
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        vm.stopPrank();

        // Update role to Researcher
        vm.startPrank(user1);
        metaGaugeSubscription.updateUserRole(IMetaGaugeSubscription.UserRole.Researcher);
        vm.stopPrank();

        // Verify role update
        IMetaGaugeSubscription.Subscriber memory subscription = metaGaugeSubscription.getSubscriptionInfo(user1);
        assertEq(uint(subscription.role), uint(IMetaGaugeSubscription.UserRole.Researcher), "User role should be updated");
    }

    function testUpdateUserRoleToAdmin() public {
        // Subscribe first
        vm.startPrank(user1);
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,  // Start as Startup
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        vm.stopPrank();

        // Update role to admin
        vm.startPrank(user1);
        metaGaugeSubscription.updateUserRole(IMetaGaugeSubscription.UserRole.admin);
        vm.stopPrank();

        // Verify role update
        IMetaGaugeSubscription.Subscriber memory subscription = metaGaugeSubscription.getSubscriptionInfo(user1);
        assertEq(uint(subscription.role), uint(IMetaGaugeSubscription.UserRole.admin), "User role should be updated to admin");
    }

    function testSubscribeToStarterPlan() public {
        vm.startPrank(user1);
        
        uint256 requiredAmount = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        mockToken.approve(address(metaGaugeSubscription), requiredAmount);
        
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );

        vm.stopPrank();

        // Verify subscription
        IMetaGaugeSubscription.Subscriber memory subscription = metaGaugeSubscription.getSubscriptionInfo(user1);
        assertEq(uint(subscription.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Starter), "User should have Starter tier");
        assertTrue(subscription.isActive, "Starter subscription should be active");
    }

    function testTotalSubscribersAndRevenue() public {
        uint256 initialRevenue = metaGaugeSubscription.totalRevenue();
        uint256 initialSubscribers = metaGaugeSubscription.totalSubscribers();

        // User1 subscribes to Pro plan
        vm.startPrank(user1);
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.PRO_MONTHLY_PRICE);
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER1_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        vm.stopPrank();

        // User2 subscribes to Enterprise plan
        vm.startPrank(user2);
        mockToken.approve(address(metaGaugeSubscription), MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE);
        metaGaugeSubscription.subscribe{value: 0}(
            IMetaGaugeSubscription.SubscriptionTier.Enterprise,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            USER2_UUID,
            IMetaGaugeSubscription.PaymentCurrency.Token
        );
        vm.stopPrank();

        // Check totals
        uint256 finalRevenue = metaGaugeSubscription.totalRevenue();
        uint256 finalSubscribers = metaGaugeSubscription.totalSubscribers();

        assertEq(finalSubscribers, initialSubscribers + 2, "Should have 2 more subscribers");
        assertTrue(finalRevenue > initialRevenue, "Revenue should have increased");
    }
}