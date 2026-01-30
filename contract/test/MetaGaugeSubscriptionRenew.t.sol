// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MetaGaugeSubscription.sol";
import "../src/interfaces/IMetaGaugeSubscription.sol";
import "../src/libraries/MetaGaugeConstants.sol";

contract MetaGaugeSubscriptionRenewTest is Test {
    MetaGaugeSubscription public sub;

    function setUp() public {
        // Deploy in ETH mode (no token)
        sub = new MetaGaugeSubscription(address(0), false);
    }

    function testRenewWithinWindow() public {
        string memory uuid = "user-1";
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;

        // Subscribe (pay starter monthly)
        sub.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            uuid,
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );

        IMetaGaugeSubscription.Subscriber memory sBefore = sub.getSubscriptionInfo(address(this));
        uint256 oldEnd = sBefore.endTime;

        // Warp into renewal window (7 days before end) -> pick 6 days before
        vm.warp(oldEnd - 6 days);

        // Renew by paying the same monthly price
        sub.renewSubscription{value: price}();

    IMetaGaugeSubscription.Subscriber memory sAfter = sub.getSubscriptionInfo(address(this));

        // endTime should be extended
        assertTrue(sAfter.endTime > oldEnd, "endTime did not extend on renew");
        // amountPaid should increase by price
        assertEq(sAfter.amountPaid, sBefore.amountPaid + price);
    }

    function testRenewTooEarlyReverts() public {
        string memory uuid = "user-2";
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;

        // Subscribe
        sub.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            uuid,
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );

        IMetaGaugeSubscription.Subscriber memory s = sub.getSubscriptionInfo(address(this));
        uint256 oldEnd = s.endTime;

        // Warp too early (more than 7 days before period end)
        vm.warp(oldEnd - 30 days);

        // Expect revert (renewal window not started)
        vm.expectRevert();
        sub.renewSubscription{value: price}();
    }

    function testRenewInGracePeriod() public {
        string memory uuid = "user-3";
        uint256 price = MetaGaugeConstants.STARTER_MONTHLY_PRICE;

        // Subscribe
        sub.subscribe{value: price}(
            IMetaGaugeSubscription.SubscriptionTier.Starter,
            IMetaGaugeSubscription.UserRole.Startup,
            IMetaGaugeSubscription.BillingCycle.Monthly,
            uuid,
            IMetaGaugeSubscription.PaymentCurrency.ETH
        );

        IMetaGaugeSubscription.Subscriber memory sBefore = sub.getSubscriptionInfo(address(this));
        uint256 oldEnd = sBefore.endTime;

        // Warp past end into grace period (1 day after end)
        vm.warp(oldEnd + 1 days);

        // Renew in grace period
        sub.renewSubscription{value: price}();

    IMetaGaugeSubscription.Subscriber memory sAfter = sub.getSubscriptionInfo(address(this));
    assertTrue(sAfter.endTime > oldEnd, "endTime did not extend when renewing in grace period");
    assertEq(sAfter.amountPaid, sBefore.amountPaid + price);
    }
}
