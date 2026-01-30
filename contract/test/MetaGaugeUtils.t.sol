// test/libraries/MetaGaugeUtils.t.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {MetaGaugeUtils} from "../src/libraries/MetaGaugeUtils.sol";
import {MetaGaugeErrors} from "../src/libraries/MetaGaugeErrors.sol";
import {MetaGaugeConstants} from "../src/libraries/MetaGaugeConstants.sol";

contract MetaGaugeUtilsTest is Test {
    using MetaGaugeUtils for address;
    
    address testUser = address(0x123);
    address zeroAddress = address(0);

    // ============ VALIDATION TESTS ============
    
    function testValidateAddress_Valid() public {
        MetaGaugeUtils.validateAddress(testUser);
    }

    function testValidateAddress_ZeroAddress() public {
        vm.expectRevert(MetaGaugeErrors.InvalidAddress.selector);
        MetaGaugeUtils.validateAddress(zeroAddress);
    }

    function testValidateSubscriptionDuration_Valid() public {
        MetaGaugeUtils.validateSubscriptionDuration(30 days);
        MetaGaugeUtils.validateSubscriptionDuration(365 days);
    }

    function testValidateSubscriptionDuration_TooShort() public {
        vm.expectRevert(MetaGaugeErrors.InvalidDuration.selector);
        MetaGaugeUtils.validateSubscriptionDuration(23 hours); // Less than MIN_SUBSCRIPTION_DURATION
    }

    function testValidatePaymentAmount_Sufficient() public {
        MetaGaugeUtils.validatePaymentAmount(1 ether, 1.5 ether);
    }

    function testValidatePaymentAmount_Exact() public {
        MetaGaugeUtils.validatePaymentAmount(1 ether, 1 ether);
    }

    function testValidatePaymentAmount_Insufficient() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                MetaGaugeErrors.InsufficientPayment.selector,
                1 ether,
                0.5 ether
            )
        );
        MetaGaugeUtils.validatePaymentAmount(1 ether, 0.5 ether);
    }

    // ============ TIME FUNCTION TESTS ============
    
    function testGetCurrentTimestamp() public {
        uint256 current = MetaGaugeUtils.getCurrentTimestamp();
        assertEq(current, block.timestamp);
    }

    function testIsTimestampInFuture_True() public {
        assertTrue(MetaGaugeUtils.isTimestampInFuture(block.timestamp + 1));
    }

    function testIsTimestampInFuture_False() public {
        assertFalse(MetaGaugeUtils.isTimestampInFuture(block.timestamp - 1));
    }

    function testCalculateEndTime() public {
        uint256 startTime = block.timestamp;
        uint256 duration = 30 days;
        uint256 endTime = MetaGaugeUtils.calculateEndTime(startTime, duration);
        assertEq(endTime, startTime + duration);
    }

   function testIsInGracePeriod_True() public {
    uint256 endTime = block.timestamp + 10 days;
    
    // Move time into the grace period
    vm.warp(endTime + 3 days); // within GRACE_PERIOD (7 days)

    bool inGrace = MetaGaugeUtils.isInGracePeriod(endTime);
    assertTrue(inGrace);
}


    function testIsInGracePeriod_False_NotStarted() public {
    uint256 endTime = block.timestamp + 10 days;

    bool inGrace = MetaGaugeUtils.isInGracePeriod(endTime);
    assertFalse(inGrace);
}


    function testIsInGracePeriod_False_Expired() public {
    uint256 endTime = block.timestamp + 10 days;

    // Move time beyond the grace period
    vm.warp(endTime + MetaGaugeConstants.GRACE_PERIOD + 1 days);

    bool inGrace = MetaGaugeUtils.isInGracePeriod(endTime);
    assertFalse(inGrace);
}


    function testGetRemainingTime_Active() public {
        uint256 endTime = block.timestamp + 10 days;
        uint256 remaining = MetaGaugeUtils.getRemainingTime(endTime);
        assertEq(remaining, 10 days);
    }

    function testGetRemainingTime_Expired() public {
    uint256 endTime = block.timestamp + 5 days;

    // Fast-forward beyond the end
    vm.warp(block.timestamp + 6 days);

    uint256 remaining = MetaGaugeUtils.getRemainingTime(endTime);
    assertEq(remaining, 0);
}


    // ============ PRICING FUNCTION TESTS ============
    
    function testCalculateProratedAmount_FullRefund() public {
        uint256 amount = 1 ether;
        uint256 timeUsed = 0;
        uint256 totalDuration = 30 days;
        
        uint256 prorated = MetaGaugeUtils.calculateProratedAmount(amount, timeUsed, totalDuration);
        assertEq(prorated, amount);
    }

    function testCalculateProratedAmount_HalfUsed() public {
        uint256 amount = 1 ether;
        uint256 timeUsed = 15 days;
        uint256 totalDuration = 30 days;
        
        uint256 prorated = MetaGaugeUtils.calculateProratedAmount(amount, timeUsed, totalDuration);
        assertEq(prorated, 0.5 ether);
    }

    function testCalculateProratedAmount_AllUsed() public {
        uint256 amount = 1 ether;
        uint256 timeUsed = 30 days;
        uint256 totalDuration = 30 days;
        
        uint256 prorated = MetaGaugeUtils.calculateProratedAmount(amount, timeUsed, totalDuration);
        assertEq(prorated, 0);
    }

    function testApplyDiscount() public {
        uint256 amount = 1 ether;
        uint256 discountBps = 1000; // 10%
        
        uint256 discounted = MetaGaugeUtils.applyDiscount(amount, discountBps);
        assertEq(discounted, 0.9 ether);
    }

    function testApplyDiscount_NoDiscount() public {
        uint256 amount = 1 ether;
        uint256 discountBps = 0;
        
        uint256 discounted = MetaGaugeUtils.applyDiscount(amount, discountBps);
        assertEq(discounted, amount);
    }

    function testCalculatePlatformFee() public {
        uint256 amount = 1 ether;
        uint256 expectedFee = (amount * MetaGaugeConstants.PLATFORM_FEE_BPS) / 10000;
        
        uint256 fee = MetaGaugeUtils.calculatePlatformFee(amount);
        assertEq(fee, expectedFee);
    }

    // ============ FEATURE VALIDATION TESTS ============
    
    function testCheckFeatureAccess_Enabled() public {
        MetaGaugeUtils.checkFeatureAccess(true, "test_feature");
    }

    function testCheckFeatureAccess_Disabled() public {
        vm.expectRevert();
        MetaGaugeUtils.checkFeatureAccess(false, "test_feature");
    }

    function testCheckLimit_WithinLimit() public {
        MetaGaugeUtils.checkLimit(5, 10, "test_limit");
    }

    function testCheckLimit_AtLimit() public {
        MetaGaugeUtils.checkLimit(10, 10, "test_limit"); // At limit should not revert
    }

    function testCheckLimit_Exceeded() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                MetaGaugeErrors.LimitExceeded.selector,
                "test_limit",
                11,
                10
            )
        );
        MetaGaugeUtils.checkLimit(11, 10, "test_limit");
    }

    // ============ SAFE TRANSFER TESTS ============
    
    function testSafeTransferETH_Success() public {
        address recipient = address(0x456);
        uint256 amount = 1 ether;
        
        // Fund the contract
        vm.deal(address(this), amount);
        
        uint256 initialBalance = recipient.balance;
        MetaGaugeUtils.safeTransferETH(recipient, amount);
        
        assertEq(recipient.balance, initialBalance + amount);
    }
/*
    function testSafeTransferETH_Failure() public {
    // Deploy a receiver that reverts on receiving ETH
    FailingReceiver receiver = new FailingReceiver();
    uint256 amount = 1 ether;

    // Fund this test contract with ETH to make the transfer attempt valid
    vm.deal(address(this), amount);

    // Expect the MetaGauge PaymentFailed revert
    vm.expectRevert(MetaGaugeErrors.PaymentFailed.selector);
    MetaGaugeUtils.safeTransferETH(address(receiver), amount);
}
*/
    // Receive function to accept ETH
    receive() external payable {}
}