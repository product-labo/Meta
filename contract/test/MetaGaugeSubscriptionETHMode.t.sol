// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {MetaGaugeSubscription} from "../src/MetaGaugeSubscription.sol";
import {MetaGaugeConstants} from "../src/libraries/MetaGaugeConstants.sol";
import {IMetaGaugeSubscription} from "../src/interfaces/IMetaGaugeSubscription.sol";

contract MetaGaugeSubscriptionETHModeTest is Test {
    MetaGaugeSubscription public metaGaugeSubscription;
    
    function setUp() public {
        // Deploy in ETH mode (no token)
        metaGaugeSubscription = new MetaGaugeSubscription(address(0), false);
        
        // Label addresses for clarity
        vm.label(address(this), "TestContract");
    }
    
    // Allow this test contract to receive ETH
    receive() external payable {}

    // ============ ETH MODE SUBSCRIBE TESTS ============
    
    function testSubscribeStarterMonthlyETH() public {
        address subscriber = address(0x5555);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-starter-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        IMetaGaugeSubscription.Subscriber memory sub = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertEq(uint(sub.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Starter), "Tier should be Starter");
        assertTrue(sub.isActive, "Subscription should be active");
        assertEq(sub.amountPaid, price, "Amount paid should match");
    }
    
    function testSubscribeProYearlyETH() public {
        address subscriber = address(0x6666);
        uint256 price = MetaGaugeConstants.PRO_YEARLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Yearly,
            "uuid-pro-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        IMetaGaugeSubscription.Subscriber memory sub = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertEq(uint(sub.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Pro), "Tier should be Pro");
    }
    
    function testSubscribeAccumulatesETH() public {
        uint256 contractBalanceBefore = address(metaGaugeSubscription).balance;
        
        address subscriber = address(0x7777);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-eth-accumulate",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        uint256 contractBalanceAfter = address(metaGaugeSubscription).balance;
        assertEq(contractBalanceAfter, contractBalanceBefore + price, "Contract should accumulate ETH");
    }
    
    // ============ ETH MODE WITHDRAWAL TESTS ============
    
    function testWithdrawFundsETH() public {
        // Subscribe to accumulate ETH
        address subscriber = address(0x8888);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-withdraw-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        uint256 contractBalanceBefore = address(metaGaugeSubscription).balance;
        assertGt(contractBalanceBefore, 0, "Contract should have ETH balance");
        
        uint256 ownerBalanceBefore = address(this).balance;
        
        // Withdraw all funds
        metaGaugeSubscription.withdrawFunds(contractBalanceBefore);
        
        uint256 contractBalanceAfter = address(metaGaugeSubscription).balance;
        assertEq(contractBalanceAfter, 0, "Contract balance should be 0 after withdraw");
        
        // Owner should receive the ETH (minus gas)
        uint256 ownerBalanceAfter = address(this).balance;
        assertGt(ownerBalanceAfter, ownerBalanceBefore, "Owner balance should increase");
    }
    
    function testWithdrawFundsPartialETH() public {
        // Subscribe to accumulate ETH
        address subscriber = address(0x9999);
        uint256 price = MetaGaugeConstants.PRO_MONTHLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-partial-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        uint256 contractBalanceBefore = address(metaGaugeSubscription).balance;
        uint256 withdrawAmount = contractBalanceBefore / 2;
        
        // Withdraw partial amount
        metaGaugeSubscription.withdrawFunds(withdrawAmount);
        
        uint256 contractBalanceAfter = address(metaGaugeSubscription).balance;
        assertEq(contractBalanceAfter, contractBalanceBefore - withdrawAmount, "Contract should have remaining ETH");
    }
    
    function testWithdrawFundsMultipleSubscriptions() public {
        // Multiple subscribers accumulate ETH
        address subscriber1 = address(0xAAAA);
        address subscriber2 = address(0xBBBB);
        uint256 price1 = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        uint256 price2 = MetaGaugeConstants.PRO_MONTHLY_PRICE;
        
        vm.deal(subscriber1, 1 ether);
        vm.deal(subscriber2, 1 ether);
        
        vm.prank(subscriber1);
        metaGaugeSubscription.subscribe{value: price1}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-sub1",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        vm.prank(subscriber2);
        metaGaugeSubscription.subscribe{value: price2}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-sub2",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        uint256 contractBalance = address(metaGaugeSubscription).balance;
        assertEq(contractBalance, price1 + price2, "Contract should have accumulated both payments");
        
        // Withdraw all
        metaGaugeSubscription.withdrawFunds(contractBalance);
        
        assertEq(address(metaGaugeSubscription).balance, 0, "Contract should be empty after withdraw");
    }
    
    // ============ ETH MODE TOTAL REVENUE TESTS ============
    
    function testTotalRevenueETHMode() public {
        uint256 initialRevenue = metaGaugeSubscription.totalRevenue();
        
        address subscriber = address(0xCCCC);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-revenue",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        assertEq(metaGaugeSubscription.totalRevenue(), initialRevenue + price, "Total revenue should update");
    }
    
    // ============ ERROR & REVERT TESTS (ETH MODE) ============
    
    function testSubscribeAlreadySubscribedETH() public {
        address subscriber = address(0xDDDD);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        vm.deal(subscriber, 2 ether);
        
        // First subscription
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-first-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        // Try to subscribe again (should revert)
        vm.prank(subscriber);
        vm.expectRevert();
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-second-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
    }
    
    function testCancelNonActiveSubscriptionETH() public {
        address subscriber = address(0xFFFF);
        
        // Try to cancel when not subscribed
        vm.prank(subscriber);
        vm.expectRevert();
        metaGaugeSubscription.cancelSubscription();
    }
    
    function testUpdatePlanStatusNonOwnerETH() public {
        address nonOwner = address(0x1122);
        
        // Try to update plan as non-owner
        vm.prank(nonOwner);
        vm.expectRevert();
        metaGaugeSubscription.updatePlanStatus(IMetaGaugeSubscription.SubscriptionTier.Starter, false);
    }
    
    // ============ ADVANCED SCENARIO TESTS (ETH MODE) ============
    
    function testSubscribeAfterCancellationETH() public {
        address subscriber = address(0x2233);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        // Subscribe
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-cancel-resub-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        // Cancel
        vm.prank(subscriber);
        metaGaugeSubscription.cancelSubscription();
        
        IMetaGaugeSubscription.Subscriber memory subAfterCancel = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertFalse(subAfterCancel.isActive, "Should be inactive after cancel");
        
        // Subscribe again with new payment
        vm.deal(subscriber, 1 ether);
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: MetaGaugeConstants.PRO_MONTHLY_PRICE}(
            IMetaGaugeSubscription.SubscriptionTier.Pro,
            IMetaGaugeSubscription.UserRole.Researcher,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-resub-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        IMetaGaugeSubscription.Subscriber memory subAfterResub = metaGaugeSubscription.getSubscriptionInfo(subscriber);
        assertTrue(subAfterResub.isActive, "Should be active after resubscription");
        assertEq(uint(subAfterResub.tier), uint(IMetaGaugeSubscription.SubscriptionTier.Pro), "Tier should be Pro after resubscription");
    }
    
    // ============ EVENT EMISSION TESTS (ETH MODE) ============
    
    function testSubscriptionCancelledEventEmittedETH() public {
        address subscriber = address(0x4455);
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        vm.deal(subscriber, 1 ether);
        
        // Subscribe first
        vm.prank(subscriber);
        metaGaugeSubscription.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            "uuid-cancel-event-eth",
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );
        
        // Cancel and expect event
        vm.prank(subscriber);
        vm.expectEmit(true, false, false, false);
        emit IMetaGaugeSubscription.SubscriptionCancelled(subscriber);
        metaGaugeSubscription.cancelSubscription();
    }
}
