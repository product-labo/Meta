// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/utils/MetaGaugePricing.sol";
import "../src/libraries/MetaGaugeConstants.sol";
import "../src/libraries/MetaGaugeErrors.sol";

/**
 * @title MetaGaugePricingTest
 * @dev Comprehensive test suite for MetaGaugePricing library
 * @notice Achieves 100% coverage of all pricing functions
 */
contract MetaGaugePricingTest is Test {
    using MetaGaugePricing for *;

    // ============ TEST SETUP ============

    function setUp() public {
        // No state setup needed for pure library functions
    }

    // ============ getTierPrice TESTS ============

    function test_GetTierPrice_FreeMonthly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Free,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, 0, "Free tier should have zero price");
    }

    function test_GetTierPrice_FreeYearly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Free,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, 0, "Free tier should have zero price");
    }

    function test_GetTierPrice_StarterMonthly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, MetaGaugeConstants.STARTER_MONTHLY_PRICE);
    }

    function test_GetTierPrice_StarterYearly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, MetaGaugeConstants.STARTER_YEARLY_PRICE);
    }

    function test_GetTierPrice_ProMonthly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, MetaGaugeConstants.PRO_MONTHLY_PRICE);
    }

    function test_GetTierPrice_ProYearly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, MetaGaugeConstants.PRO_YEARLY_PRICE);
    }

    function test_GetTierPrice_EnterpriseMonthly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Enterprise,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE);
    }

    function test_GetTierPrice_EnterpriseYearly() public {
        uint256 price = MetaGaugePricing.getTierPrice(
            MetaGaugePricing.SubscriptionTier.Enterprise,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE);
    }

    function test_GetTierPrice_InvalidTier_Reverts() public {
        // In Solidity 0.8.19+, invalid enum values cause a panic (0x21)
        // We expect a revert but don't specify the exact error
        vm.expectRevert();
        
        // Use assembly to create invalid enum value
        MetaGaugePricing.SubscriptionTier invalidTier;
        assembly {
            invalidTier := 4
        }
        
        MetaGaugePricing.getTierPrice(
            invalidTier,
            MetaGaugePricing.BillingCycle.Monthly
        );
    }

    // ============ getTierPriceInMGT TESTS ============

    function test_GetTierPriceInMGT_FreeMonthly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Free,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, 0, "Free tier should have zero MGT price");
    }

    function test_GetTierPriceInMGT_FreeYearly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Free,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, 0, "Free tier should have zero MGT price");
    }

    function test_GetTierPriceInMGT_StarterMonthly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, MetaGaugeConstants.STARTER_MONTHLY_PRICE_MGT);
    }

    function test_GetTierPriceInMGT_StarterYearly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, MetaGaugeConstants.STARTER_YEARLY_PRICE_MGT);
    }

    function test_GetTierPriceInMGT_ProMonthly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, MetaGaugeConstants.PRO_MONTHLY_PRICE_MGT);
    }

    function test_GetTierPriceInMGT_ProYearly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, MetaGaugeConstants.PRO_YEARLY_PRICE_MGT);
    }

    function test_GetTierPriceInMGT_EnterpriseMonthly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Enterprise,
            MetaGaugePricing.BillingCycle.Monthly
        );
        assertEq(price, MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE_MGT);
    }

    function test_GetTierPriceInMGT_EnterpriseYearly() public {
        uint256 price = MetaGaugePricing.getTierPriceInMGT(
            MetaGaugePricing.SubscriptionTier.Enterprise,
            MetaGaugePricing.BillingCycle.Yearly
        );
        assertEq(price, MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE_MGT);
    }

    function test_GetTierPriceInMGT_InvalidTier_Reverts() public {
        // In Solidity 0.8.19+, invalid enum values cause a panic (0x21)
        // We expect a revert but don't specify the exact error
        vm.expectRevert();
        
        MetaGaugePricing.SubscriptionTier invalidTier;
        assembly {
            invalidTier := 4
        }
        
        MetaGaugePricing.getTierPriceInMGT(
            invalidTier,
            MetaGaugePricing.BillingCycle.Monthly
        );
    }

    // ============ calculateUpgradePrice TESTS ============

    function test_CalculateUpgradePrice_StarterToPro() public {
        uint256 upgradePrice = MetaGaugePricing.calculateUpgradePrice(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.BillingCycle.Monthly,
            MetaGaugePricing.BillingCycle.Monthly,
            15 days, // Half time remaining
            30 days  // Total duration
        );
        
        // Expected: Pro price - (Starter price * 0.5)
        uint256 starterPrice = MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        uint256 proPrice = MetaGaugeConstants.PRO_MONTHLY_PRICE;
        uint256 credit = (starterPrice * 15 days) / 30 days;
        uint256 expected = proPrice - credit;
        
        assertEq(upgradePrice, expected);
    }

    function test_CalculateUpgradePrice_StarterToEnterprise() public {
        uint256 upgradePrice = MetaGaugePricing.calculateUpgradePrice(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.SubscriptionTier.Enterprise,
            MetaGaugePricing.BillingCycle.Yearly,
            MetaGaugePricing.BillingCycle.Yearly,
            180 days, // Half year remaining
            365 days  // Total duration
        );
        
        uint256 starterPrice = MetaGaugeConstants.STARTER_YEARLY_PRICE;
        uint256 enterprisePrice = MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE;
        uint256 credit = (starterPrice * 180 days) / 365 days;
        uint256 expected = enterprisePrice - credit;
        
        assertEq(upgradePrice, expected);
    }

    function test_CalculateUpgradePrice_ProToEnterprise() public {
        uint256 upgradePrice = MetaGaugePricing.calculateUpgradePrice(
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.SubscriptionTier.Enterprise,
            MetaGaugePricing.BillingCycle.Monthly,
            MetaGaugePricing.BillingCycle.Monthly,
            10 days,
            30 days
        );
        
        uint256 proPrice = MetaGaugeConstants.PRO_MONTHLY_PRICE;
        uint256 enterprisePrice = MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE;
        uint256 credit = (proPrice * 10 days) / 30 days;
        uint256 expected = enterprisePrice - credit;
        
        assertEq(upgradePrice, expected);
    }

    function test_CalculateUpgradePrice_NoTimeRemaining() public {
        uint256 upgradePrice = MetaGaugePricing.calculateUpgradePrice(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.BillingCycle.Monthly,
            MetaGaugePricing.BillingCycle.Monthly,
            0,       // No time remaining
            30 days
        );
        
        // Should equal full new tier price
        assertEq(upgradePrice, MetaGaugeConstants.PRO_MONTHLY_PRICE);
    }

    function test_CalculateUpgradePrice_FullTimeRemaining() public {
        uint256 upgradePrice = MetaGaugePricing.calculateUpgradePrice(
            MetaGaugePricing.SubscriptionTier.Starter,
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.BillingCycle.Monthly,
            MetaGaugePricing.BillingCycle.Monthly,
            30 days, // Full time remaining
            30 days
        );
        
        // Expected: Pro price - full Starter price
        uint256 expected = MetaGaugeConstants.PRO_MONTHLY_PRICE - MetaGaugeConstants.STARTER_MONTHLY_PRICE;
        assertEq(upgradePrice, expected);
    }

    function test_CalculateUpgradePrice_Downgrade_Reverts() public {
        vm.expectRevert(MetaGaugeErrors.UpgradeNotAllowed.selector);
        MetaGaugePricing.calculateUpgradePrice(
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.SubscriptionTier.Starter, // Downgrade
            MetaGaugePricing.BillingCycle.Monthly,
            MetaGaugePricing.BillingCycle.Monthly,
            15 days,
            30 days
        );
    }

    function test_CalculateUpgradePrice_SameTier_Reverts() public {
        vm.expectRevert(MetaGaugeErrors.UpgradeNotAllowed.selector);
        MetaGaugePricing.calculateUpgradePrice(
            MetaGaugePricing.SubscriptionTier.Pro,
            MetaGaugePricing.SubscriptionTier.Pro, // Same tier
            MetaGaugePricing.BillingCycle.Monthly,
            MetaGaugePricing.BillingCycle.Monthly,
            15 days,
            30 days
        );
    }

    // ============ calculateProratedRefund TESTS ============

    function test_CalculateProratedRefund_HalfUsed() public {
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            1 ether,  // Amount paid
            15 days,  // Time used
            30 days   // Total duration
        );
        
        // Expected: 0.5 ether (half refund)
        assertEq(refund, 0.5 ether);
    }

    function test_CalculateProratedRefund_QuarterUsed() public {
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            1 ether,
            7 days + 12 hours, // 7.5 days
            30 days
        );
        
        // Expected: 0.75 ether (75% refund)
        uint256 unusedTime = 30 days - (7 days + 12 hours);
        uint256 expected = (1 ether * unusedTime) / 30 days;
        assertEq(refund, expected);
    }

    function test_CalculateProratedRefund_AlmostFullyUsed() public {
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            1 ether,
            29 days,
            30 days
        );
        
        // Expected: small refund (1/30 of amount)
        uint256 unusedTime = 1 days;
        uint256 expected = (1 ether * unusedTime) / 30 days;
        assertEq(refund, expected);
    }

    function test_CalculateProratedRefund_FullyUsed() public {
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            1 ether,
            30 days,
            30 days
        );
        
        assertEq(refund, 0, "No refund when fully used");
    }

    function test_CalculateProratedRefund_OverUsed() public {
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            1 ether,
            35 days, // More than total
            30 days
        );
        
        assertEq(refund, 0, "No refund when over-used");
    }

    function test_CalculateProratedRefund_NoTimeUsed() public {
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            1 ether,
            0,       // No time used
            30 days
        );
        
        assertEq(refund, 1 ether, "Full refund when no time used");
    }

    function test_CalculateProratedRefund_ZeroAmount() public {
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            0,       // Zero amount
            15 days,
            30 days
        );
        
        assertEq(refund, 0, "Zero refund for zero amount");
    }

    // ============ applyDiscount TESTS ============

    function test_ApplyDiscount_10Percent() public {
        uint256 discounted = MetaGaugePricing.applyDiscount(
            1 ether,
            1000 // 10% in basis points
        );
        
        assertEq(discounted, 0.9 ether);
    }

    function test_ApplyDiscount_25Percent() public {
        uint256 discounted = MetaGaugePricing.applyDiscount(
            1 ether,
            2500 // 25% in basis points
        );
        
        assertEq(discounted, 0.75 ether);
    }

    function test_ApplyDiscount_50Percent() public {
        uint256 discounted = MetaGaugePricing.applyDiscount(
            1 ether,
            5000 // 50% in basis points
        );
        
        assertEq(discounted, 0.5 ether);
    }

    function test_ApplyDiscount_100Percent() public {
        uint256 discounted = MetaGaugePricing.applyDiscount(
            1 ether,
            10000 // 100% in basis points
        );
        
        assertEq(discounted, 0);
    }

    function test_ApplyDiscount_NoDiscount() public {
        uint256 discounted = MetaGaugePricing.applyDiscount(
            1 ether,
            0 // 0% discount
        );
        
        assertEq(discounted, 1 ether);
    }

    function test_ApplyDiscount_SmallAmount() public {
        uint256 discounted = MetaGaugePricing.applyDiscount(
            100,
            1000 // 10%
        );
        
        assertEq(discounted, 90);
    }

    // ============ calculatePlatformFee TESTS ============

    function test_CalculatePlatformFee_1Ether() public {
        uint256 fee = MetaGaugePricing.calculatePlatformFee(1 ether);
        
        // PLATFORM_FEE_BPS = 250 (2.5%)
        uint256 expected = (1 ether * 250) / 10000;
        assertEq(fee, expected);
    }

    function test_CalculatePlatformFee_10Ether() public {
        uint256 fee = MetaGaugePricing.calculatePlatformFee(10 ether);
        
        uint256 expected = (10 ether * 250) / 10000;
        assertEq(fee, expected);
    }

    function test_CalculatePlatformFee_SmallAmount() public {
        uint256 fee = MetaGaugePricing.calculatePlatformFee(1000);
        
        uint256 expected = (1000 * 250) / 10000;
        assertEq(fee, expected);
    }

    function test_CalculatePlatformFee_ZeroAmount() public {
        uint256 fee = MetaGaugePricing.calculatePlatformFee(0);
        assertEq(fee, 0);
    }

    function test_CalculatePlatformFee_LargeAmount() public {
        uint256 fee = MetaGaugePricing.calculatePlatformFee(1000 ether);
        
        uint256 expected = (1000 ether * 250) / 10000;
        assertEq(fee, expected);
    }


    // ============ PROPERTY-BASED TESTS ============

    /**
     * @notice Feature: test-coverage-100, Property 1: Tier pricing returns correct values
     * @dev For any valid subscription tier and billing cycle combination, 
     *      getTierPrice should return the price constant defined for that tier/cycle pair
     * Validates: Requirements 1.1
     */
    function testFuzz_Property1_TierPricingReturnsCorrectValues(uint8 tierInput, uint8 cycleInput) public {
        // Bound inputs to valid enum ranges
        tierInput = uint8(bound(tierInput, 0, 3)); // Free=0, Starter=1, Pro=2, Enterprise=3
        cycleInput = uint8(bound(cycleInput, 0, 1)); // Monthly=0, Yearly=1
        
        MetaGaugePricing.SubscriptionTier tier = MetaGaugePricing.SubscriptionTier(tierInput);
        MetaGaugePricing.BillingCycle cycle = MetaGaugePricing.BillingCycle(cycleInput);
        
        uint256 price = MetaGaugePricing.getTierPrice(tier, cycle);
        
        // Verify price matches expected constant
        if (tier == MetaGaugePricing.SubscriptionTier.Free) {
            assertEq(price, 0);
        } else if (tier == MetaGaugePricing.SubscriptionTier.Starter) {
            if (cycle == MetaGaugePricing.BillingCycle.Monthly) {
                assertEq(price, MetaGaugeConstants.STARTER_MONTHLY_PRICE);
            } else {
                assertEq(price, MetaGaugeConstants.STARTER_YEARLY_PRICE);
            }
        } else if (tier == MetaGaugePricing.SubscriptionTier.Pro) {
            if (cycle == MetaGaugePricing.BillingCycle.Monthly) {
                assertEq(price, MetaGaugeConstants.PRO_MONTHLY_PRICE);
            } else {
                assertEq(price, MetaGaugeConstants.PRO_YEARLY_PRICE);
            }
        } else if (tier == MetaGaugePricing.SubscriptionTier.Enterprise) {
            if (cycle == MetaGaugePricing.BillingCycle.Monthly) {
                assertEq(price, MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE);
            } else {
                assertEq(price, MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE);
            }
        }
    }

    /**
     * @notice Feature: test-coverage-100, Property 2: MGT pricing returns correct values
     * @dev For any valid subscription tier and billing cycle combination,
     *      getTierPriceInMGT should return the MGT price constant defined for that tier/cycle pair
     * Validates: Requirements 1.3
     */
    function testFuzz_Property2_MGTPricingReturnsCorrectValues(uint8 tierInput, uint8 cycleInput) public {
        // Bound inputs to valid enum ranges
        tierInput = uint8(bound(tierInput, 0, 3));
        cycleInput = uint8(bound(cycleInput, 0, 1));
        
        MetaGaugePricing.SubscriptionTier tier = MetaGaugePricing.SubscriptionTier(tierInput);
        MetaGaugePricing.BillingCycle cycle = MetaGaugePricing.BillingCycle(cycleInput);
        
        uint256 price = MetaGaugePricing.getTierPriceInMGT(tier, cycle);
        
        // Verify price matches expected MGT constant
        if (tier == MetaGaugePricing.SubscriptionTier.Free) {
            assertEq(price, 0);
        } else if (tier == MetaGaugePricing.SubscriptionTier.Starter) {
            if (cycle == MetaGaugePricing.BillingCycle.Monthly) {
                assertEq(price, MetaGaugeConstants.STARTER_MONTHLY_PRICE_MGT);
            } else {
                assertEq(price, MetaGaugeConstants.STARTER_YEARLY_PRICE_MGT);
            }
        } else if (tier == MetaGaugePricing.SubscriptionTier.Pro) {
            if (cycle == MetaGaugePricing.BillingCycle.Monthly) {
                assertEq(price, MetaGaugeConstants.PRO_MONTHLY_PRICE_MGT);
            } else {
                assertEq(price, MetaGaugeConstants.PRO_YEARLY_PRICE_MGT);
            }
        } else if (tier == MetaGaugePricing.SubscriptionTier.Enterprise) {
            if (cycle == MetaGaugePricing.BillingCycle.Monthly) {
                assertEq(price, MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE_MGT);
            } else {
                assertEq(price, MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE_MGT);
            }
        }
    }

    /**
     * @notice Feature: test-coverage-100, Property 3: Upgrade price calculation is correct
     * @dev For any valid upgrade scenario (higher tier, valid time remaining),
     *      calculateUpgradePrice should return newTierPrice minus prorated credit from current tier
     * Validates: Requirements 1.4
     */
    function testFuzz_Property3_UpgradePriceCalculationIsCorrect(
        uint8 currentTierInput,
        uint8 newTierInput,
        uint256 timeRemaining,
        uint256 totalDuration
    ) public {
        // Bound inputs
        currentTierInput = uint8(bound(currentTierInput, 0, 2)); // Free to Pro (can upgrade)
        newTierInput = uint8(bound(newTierInput, currentTierInput + 1, 3)); // Must be higher tier
        totalDuration = bound(totalDuration, 1 days, 365 days);
        timeRemaining = bound(timeRemaining, 0, totalDuration);
        
        MetaGaugePricing.SubscriptionTier currentTier = MetaGaugePricing.SubscriptionTier(currentTierInput);
        MetaGaugePricing.SubscriptionTier newTier = MetaGaugePricing.SubscriptionTier(newTierInput);
        MetaGaugePricing.BillingCycle cycle = MetaGaugePricing.BillingCycle.Monthly;
        
        uint256 upgradePrice = MetaGaugePricing.calculateUpgradePrice(
            currentTier,
            newTier,
            cycle,
            cycle,
            timeRemaining,
            totalDuration
        );
        
        // Verify calculation: newPrice - (currentPrice * timeRemaining / totalDuration)
        uint256 currentPrice = MetaGaugePricing.getTierPrice(currentTier, cycle);
        uint256 newPrice = MetaGaugePricing.getTierPrice(newTier, cycle);
        uint256 credit = (currentPrice * timeRemaining) / totalDuration;
        uint256 expected = newPrice > credit ? newPrice - credit : 0;
        
        assertEq(upgradePrice, expected);
    }

    /**
     * @notice Feature: test-coverage-100, Property 4: Prorated refund calculation is proportional
     * @dev For any amount paid, time used, and total duration where timeUsed < totalDuration,
     *      calculateProratedRefund should return (amountPaid * unusedTime) / totalDuration
     * Validates: Requirements 1.6
     */
    function testFuzz_Property4_ProratedRefundCalculationIsProportional(
        uint256 amountPaid,
        uint256 timeUsed,
        uint256 totalDuration
    ) public {
        // Bound inputs to reasonable ranges
        amountPaid = bound(amountPaid, 0, 1000 ether);
        totalDuration = bound(totalDuration, 1 days, 365 days);
        timeUsed = bound(timeUsed, 0, totalDuration * 2); // Allow over-usage
        
        uint256 refund = MetaGaugePricing.calculateProratedRefund(
            amountPaid,
            timeUsed,
            totalDuration
        );
        
        // Verify calculation
        if (timeUsed >= totalDuration) {
            assertEq(refund, 0, "No refund when fully or over-used");
        } else {
            uint256 unusedTime = totalDuration - timeUsed;
            uint256 expected = (amountPaid * unusedTime) / totalDuration;
            assertEq(refund, expected);
        }
    }

    /**
     * @notice Feature: test-coverage-100, Property 5: Discount application reduces amount correctly
     * @dev For any amount and discount basis points,
     *      applyDiscount should return amount minus (amount * discountBps / 10000)
     * Validates: Requirements 1.7
     */
    function testFuzz_Property5_DiscountApplicationReducesAmountCorrectly(
        uint256 amount,
        uint256 discountBps
    ) public {
        // Bound inputs
        amount = bound(amount, 0, 1000 ether);
        discountBps = bound(discountBps, 0, 10000); // 0% to 100%
        
        uint256 discounted = MetaGaugePricing.applyDiscount(amount, discountBps);
        
        // Verify calculation: amount - (amount * discountBps / 10000)
        uint256 discount = (amount * discountBps) / 10000;
        uint256 expected = amount - discount;
        
        assertEq(discounted, expected);
        
        // Additional property: discounted amount should never exceed original
        assertLe(discounted, amount);
    }

    /**
     * @notice Feature: test-coverage-100, Property 6: Platform fee calculation is consistent
     * @dev For any amount, calculatePlatformFee should return (amount * PLATFORM_FEE_BPS) / 10000
     * Validates: Requirements 1.8
     */
    function testFuzz_Property6_PlatformFeeCalculationIsConsistent(uint256 amount) public {
        // Bound input
        amount = bound(amount, 0, 10000 ether);
        
        uint256 fee = MetaGaugePricing.calculatePlatformFee(amount);
        
        // Verify calculation using PLATFORM_FEE_BPS constant
        uint256 expected = (amount * MetaGaugeConstants.PLATFORM_FEE_BPS) / 10000;
        
        assertEq(fee, expected);
        
        // Additional property: fee should never exceed original amount
        assertLe(fee, amount);
    }
}
