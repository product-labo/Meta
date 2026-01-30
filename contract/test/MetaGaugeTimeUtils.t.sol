// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/utils/MetaGaugeTimeUtils.sol";
import "../src/libraries/MetaGaugeConstants.sol";
import "../src/libraries/MetaGaugeErrors.sol";

/**
 * @title MetaGaugeTimeUtilsTest
 * @dev Comprehensive test suite for MetaGaugeTimeUtils library
 * @notice Achieves 100% coverage of all time utility functions
 */
contract MetaGaugeTimeUtilsTest is Test {
    using MetaGaugeTimeUtils for *;

    // ============ TEST SETUP ============

    function setUp() public {
        // Set initial timestamp high enough to avoid underflow in tests
        // Some tests subtract up to 40 days from block.timestamp
        vm.warp(365 days);
    }

    // ============ getCurrentTimestamp TESTS ============

    function test_GetCurrentTimestamp() public {
        uint256 timestamp = MetaGaugeTimeUtils.getCurrentTimestamp();
        assertEq(timestamp, block.timestamp);
    }

    function test_GetCurrentTimestamp_AfterWarp() public {
        vm.warp(2000000);
        uint256 timestamp = MetaGaugeTimeUtils.getCurrentTimestamp();
        assertEq(timestamp, 2000000);
    }

    // ============ isFuture TESTS ============

    function test_IsFuture_True() public {
        uint256 futureTime = block.timestamp + 1 days;
        assertTrue(MetaGaugeTimeUtils.isFuture(futureTime));
    }

    function test_IsFuture_False_Past() public {
        uint256 pastTime = block.timestamp - 1 days;
        assertFalse(MetaGaugeTimeUtils.isFuture(pastTime));
    }

    function test_IsFuture_False_Current() public {
        assertFalse(MetaGaugeTimeUtils.isFuture(block.timestamp));
    }

    // ============ isPast TESTS ============

    function test_IsPast_True_Past() public {
        uint256 pastTime = block.timestamp - 1 days;
        assertTrue(MetaGaugeTimeUtils.isPast(pastTime));
    }

    function test_IsPast_True_Current() public {
        assertTrue(MetaGaugeTimeUtils.isPast(block.timestamp));
    }

    function test_IsPast_False_Future() public {
        uint256 futureTime = block.timestamp + 1 days;
        assertFalse(MetaGaugeTimeUtils.isPast(futureTime));
    }

    // ============ calculateEndTime TESTS ============

    function test_CalculateEndTime_ValidDuration() public {
        uint256 startTime = block.timestamp;
        uint256 duration = 30 days;
        
        uint256 endTime = MetaGaugeTimeUtils.calculateEndTime(startTime, duration);
        assertEq(endTime, startTime + duration);
    }

    function test_CalculateEndTime_MinDuration() public {
        uint256 startTime = block.timestamp;
        uint256 duration = MetaGaugeConstants.MIN_SUBSCRIPTION_DURATION;
        
        uint256 endTime = MetaGaugeTimeUtils.calculateEndTime(startTime, duration);
        assertEq(endTime, startTime + duration);
    }

    function test_CalculateEndTime_MaxDuration() public {
        uint256 startTime = block.timestamp;
        uint256 duration = MetaGaugeConstants.MAX_SUBSCRIPTION_DURATION;
        
        uint256 endTime = MetaGaugeTimeUtils.calculateEndTime(startTime, duration);
        assertEq(endTime, startTime + duration);
    }

    function test_CalculateEndTime_TooShort_Reverts() public {
        uint256 startTime = block.timestamp;
        uint256 duration = MetaGaugeConstants.MIN_SUBSCRIPTION_DURATION - 1;
        
        vm.expectRevert(MetaGaugeErrors.InvalidDuration.selector);
        MetaGaugeTimeUtils.calculateEndTime(startTime, duration);
    }

    function test_CalculateEndTime_TooLong_Reverts() public {
        uint256 startTime = block.timestamp;
        uint256 duration = MetaGaugeConstants.MAX_SUBSCRIPTION_DURATION + 1;
        
        vm.expectRevert(MetaGaugeErrors.InvalidDuration.selector);
        MetaGaugeTimeUtils.calculateEndTime(startTime, duration);
    }

    function test_CalculateEndTime_ZeroDuration_Reverts() public {
        uint256 startTime = block.timestamp;
        
        vm.expectRevert(MetaGaugeErrors.InvalidDuration.selector);
        MetaGaugeTimeUtils.calculateEndTime(startTime, 0);
    }

    // ============ isInGracePeriod TESTS ============

    function test_IsInGracePeriod_True() public {
        uint256 endTime = block.timestamp - 1 days; // Ended 1 day ago
        
        assertTrue(MetaGaugeTimeUtils.isInGracePeriod(endTime));
    }

    function test_IsInGracePeriod_True_AtStart() public {
        uint256 endTime = block.timestamp - 1; // Just ended
        
        assertTrue(MetaGaugeTimeUtils.isInGracePeriod(endTime));
    }

    function test_IsInGracePeriod_True_AtEnd() public {
        uint256 endTime = block.timestamp - MetaGaugeConstants.GRACE_PERIOD;
        
        assertTrue(MetaGaugeTimeUtils.isInGracePeriod(endTime));
    }

    function test_IsInGracePeriod_False_NotExpired() public {
        uint256 endTime = block.timestamp + 1 days; // Not expired yet
        
        assertFalse(MetaGaugeTimeUtils.isInGracePeriod(endTime));
    }

    function test_IsInGracePeriod_False_GraceExpired() public {
        uint256 endTime = block.timestamp - MetaGaugeConstants.GRACE_PERIOD - 1;
        
        assertFalse(MetaGaugeTimeUtils.isInGracePeriod(endTime));
    }

    // ============ getRemainingTime TESTS ============

    function test_GetRemainingTime_Future() public {
        uint256 endTime = block.timestamp + 10 days;
        
        uint256 remaining = MetaGaugeTimeUtils.getRemainingTime(endTime);
        assertEq(remaining, 10 days);
    }

    function test_GetRemainingTime_OneDayLeft() public {
        uint256 endTime = block.timestamp + 1 days;
        
        uint256 remaining = MetaGaugeTimeUtils.getRemainingTime(endTime);
        assertEq(remaining, 1 days);
    }

    function test_GetRemainingTime_OneSecondLeft() public {
        uint256 endTime = block.timestamp + 1;
        
        uint256 remaining = MetaGaugeTimeUtils.getRemainingTime(endTime);
        assertEq(remaining, 1);
    }

    function test_GetRemainingTime_Expired() public {
        uint256 endTime = block.timestamp - 1 days;
        
        uint256 remaining = MetaGaugeTimeUtils.getRemainingTime(endTime);
        assertEq(remaining, 0);
    }

    function test_GetRemainingTime_ExactlyNow() public {
        uint256 endTime = block.timestamp;
        
        uint256 remaining = MetaGaugeTimeUtils.getRemainingTime(endTime);
        assertEq(remaining, 0);
    }

    // ============ getTimeUsed TESTS ============

    function test_GetTimeUsed_MidPeriod() public {
        // Set times relative to current block.timestamp
        // Current time is in the middle of the period
        uint256 startTime = block.timestamp - 15 days;
        uint256 endTime = block.timestamp + 15 days;
        
        uint256 used = MetaGaugeTimeUtils.getTimeUsed(startTime, endTime);
        assertEq(used, 15 days);
    }

    function test_GetTimeUsed_BeforeStart() public {
        uint256 startTime = block.timestamp + 10 days;
        uint256 endTime = block.timestamp + 40 days;
        
        uint256 used = MetaGaugeTimeUtils.getTimeUsed(startTime, endTime);
        assertEq(used, 0);
    }

    function test_GetTimeUsed_AfterEnd() public {
        // Set times so current time is after the end
        uint256 startTime = block.timestamp - 40 days;
        uint256 endTime = block.timestamp - 10 days;
        
        uint256 used = MetaGaugeTimeUtils.getTimeUsed(startTime, endTime);
        assertEq(used, 30 days); // Full duration
    }

    function test_GetTimeUsed_AtStart() public {
        uint256 startTime = block.timestamp;
        uint256 endTime = block.timestamp + 30 days;
        
        uint256 used = MetaGaugeTimeUtils.getTimeUsed(startTime, endTime);
        assertEq(used, 0);
    }

    function test_GetTimeUsed_AtEnd() public {
        // Set times so current time is exactly at the end
        uint256 startTime = block.timestamp - 30 days;
        uint256 endTime = block.timestamp;
        
        uint256 used = MetaGaugeTimeUtils.getTimeUsed(startTime, endTime);
        assertEq(used, 30 days);
    }

    // ============ calculateProratedRefund TESTS ============

    function test_CalculateProratedRefund_HalfUsed() public {
        uint256 refund = MetaGaugeTimeUtils.calculateProratedRefund(
            1 ether,
            15 days,
            30 days
        );
        
        assertEq(refund, 0.5 ether);
    }

    function test_CalculateProratedRefund_NoTimeUsed() public {
        uint256 refund = MetaGaugeTimeUtils.calculateProratedRefund(
            1 ether,
            0,
            30 days
        );
        
        assertEq(refund, 1 ether);
    }

    function test_CalculateProratedRefund_FullyUsed() public {
        uint256 refund = MetaGaugeTimeUtils.calculateProratedRefund(
            1 ether,
            30 days,
            30 days
        );
        
        assertEq(refund, 0);
    }

    function test_CalculateProratedRefund_OverUsed() public {
        uint256 refund = MetaGaugeTimeUtils.calculateProratedRefund(
            1 ether,
            40 days,
            30 days
        );
        
        assertEq(refund, 0);
    }

    // ============ isWithinRenewalWindow TESTS ============

    function test_IsWithinRenewalWindow_True_AtStart() public {
        uint256 endTime = block.timestamp + 7 days;
        
        assertTrue(MetaGaugeTimeUtils.isWithinRenewalWindow(endTime));
    }

    function test_IsWithinRenewalWindow_True_MidWindow() public {
        uint256 endTime = block.timestamp + 3 days;
        
        assertTrue(MetaGaugeTimeUtils.isWithinRenewalWindow(endTime));
    }

    function test_IsWithinRenewalWindow_True_AtEnd() public {
        uint256 endTime = block.timestamp;
        
        assertTrue(MetaGaugeTimeUtils.isWithinRenewalWindow(endTime));
    }

    function test_IsWithinRenewalWindow_False_TooEarly() public {
        uint256 endTime = block.timestamp + 8 days;
        
        assertFalse(MetaGaugeTimeUtils.isWithinRenewalWindow(endTime));
    }

    function test_IsWithinRenewalWindow_False_Expired() public {
        uint256 endTime = block.timestamp - 1 days;
        
        assertFalse(MetaGaugeTimeUtils.isWithinRenewalWindow(endTime));
    }

    // ============ getBillingCycleDuration TESTS ============

    function test_GetBillingCycleDuration_Monthly() public {
        uint256 duration = MetaGaugeTimeUtils.getBillingCycleDuration(0);
        assertEq(duration, MetaGaugeConstants.SECONDS_PER_MONTH);
    }

    function test_GetBillingCycleDuration_Yearly() public {
        uint256 duration = MetaGaugeTimeUtils.getBillingCycleDuration(1);
        assertEq(duration, MetaGaugeConstants.SECONDS_PER_YEAR);
    }

    function test_GetBillingCycleDuration_Invalid_Reverts() public {
        vm.expectRevert(MetaGaugeErrors.InvalidDuration.selector);
        MetaGaugeTimeUtils.getBillingCycleDuration(2);
    }

    function test_GetBillingCycleDuration_Invalid255_Reverts() public {
        vm.expectRevert(MetaGaugeErrors.InvalidDuration.selector);
        MetaGaugeTimeUtils.getBillingCycleDuration(255);
    }

    // ============ PROPERTY-BASED TESTS ============

    /**
     * @notice Feature: test-coverage-100, Property 7: Future timestamp detection
     * @dev For any timestamp greater than block.timestamp, isFuture should return true
     * Validates: Requirements 2.2
     */
    function testFuzz_Property7_FutureTimestampDetection(uint256 offset) public {
        // Bound offset to reasonable range (1 second to 100 years)
        offset = bound(offset, 1, 100 * 365 days);
        
        uint256 futureTimestamp = block.timestamp + offset;
        
        assertTrue(MetaGaugeTimeUtils.isFuture(futureTimestamp));
    }

    /**
     * @notice Feature: test-coverage-100, Property 8: Past timestamp detection
     * @dev For any timestamp less than or equal to block.timestamp, isPast should return true
     * Validates: Requirements 2.3
     */
    function testFuzz_Property8_PastTimestampDetection(uint256 timestamp) public {
        // Bound timestamp to be at or before current time
        timestamp = bound(timestamp, 0, block.timestamp);
        
        assertTrue(MetaGaugeTimeUtils.isPast(timestamp));
    }

    /**
     * @notice Feature: test-coverage-100, Property 9: End time calculation
     * @dev For any valid start time and duration (within MIN and MAX bounds),
     *      calculateEndTime should return startTime + duration
     * Validates: Requirements 2.6
     */
    function testFuzz_Property9_EndTimeCalculation(uint256 startTime, uint256 duration) public {
        // Bound inputs to valid ranges
        startTime = bound(startTime, 0, type(uint256).max - MetaGaugeConstants.MAX_SUBSCRIPTION_DURATION);
        duration = bound(
            duration,
            MetaGaugeConstants.MIN_SUBSCRIPTION_DURATION,
            MetaGaugeConstants.MAX_SUBSCRIPTION_DURATION
        );
        
        uint256 endTime = MetaGaugeTimeUtils.calculateEndTime(startTime, duration);
        
        assertEq(endTime, startTime + duration);
    }

    /**
     * @notice Feature: test-coverage-100, Property 10: Grace period detection
     * @dev For any end time, when block.timestamp is between endTime and endTime + GRACE_PERIOD,
     *      isInGracePeriod should return true
     * Validates: Requirements 2.7
     */
    function testFuzz_Property10_GracePeriodDetection(uint256 offset) public {
        // Bound offset to be within grace period (1 second to GRACE_PERIOD)
        offset = bound(offset, 1, MetaGaugeConstants.GRACE_PERIOD);
        
        uint256 endTime = block.timestamp - offset;
        
        assertTrue(MetaGaugeTimeUtils.isInGracePeriod(endTime));
    }

    /**
     * @notice Feature: test-coverage-100, Property 11: Remaining time calculation
     * @dev For any end time in the future, getRemainingTime should return endTime - block.timestamp
     * Validates: Requirements 2.8
     */
    function testFuzz_Property11_RemainingTimeCalculation(uint256 offset) public {
        // Bound offset to reasonable future range
        offset = bound(offset, 1, 365 days);
        
        uint256 endTime = block.timestamp + offset;
        uint256 remaining = MetaGaugeTimeUtils.getRemainingTime(endTime);
        
        assertEq(remaining, offset);
    }

    /**
     * @notice Feature: test-coverage-100, Property 12: Time used calculation
     * @dev For any start and end time where block.timestamp is between them,
     *      getTimeUsed should return block.timestamp - startTime
     * Validates: Requirements 2.9
     */
    function testFuzz_Property12_TimeUsedCalculation(uint256 elapsed, uint256 remaining) public {
        // Bound inputs to reasonable ranges
        elapsed = bound(elapsed, 1, 365 days);
        remaining = bound(remaining, 1, 365 days);
        
        // Set times relative to current block.timestamp
        // Current time is 'elapsed' time after start
        uint256 startTime = block.timestamp - elapsed;
        uint256 endTime = block.timestamp + remaining;
        
        uint256 used = MetaGaugeTimeUtils.getTimeUsed(startTime, endTime);
        
        assertEq(used, elapsed);
    }

    /**
     * @notice Feature: test-coverage-100, Property 13: Renewal window detection
     * @dev For any end time, when block.timestamp is within 7 days before endTime,
     *      isWithinRenewalWindow should return true
     * Validates: Requirements 2.10
     */
    function testFuzz_Property13_RenewalWindowDetection(uint256 offset) public {
        // Bound offset to be within renewal window (0 to 7 days)
        offset = bound(offset, 0, 7 days);
        
        uint256 endTime = block.timestamp + offset;
        
        assertTrue(MetaGaugeTimeUtils.isWithinRenewalWindow(endTime));
    }
}
