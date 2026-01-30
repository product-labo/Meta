// test/helpers/MetaGaugeFeatureValidator.t.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {MetaGaugeFeatureValidator} from "../src/helpers/MetaGaugeFeatureValidator.sol";
import {IMetaGaugeSubscription} from "../src/interfaces/IMetaGaugeSubscription.sol";
import {MetaGaugeErrors} from "../src/libraries/MetaGaugeErrors.sol";
import {MetaGaugeConstants} from "../src/libraries/MetaGaugeConstants.sol";

contract MetaGaugeFeatureValidatorTest is Test {
    MetaGaugeFeatureValidator public featureValidator;
    
    // Test data
    IMetaGaugeSubscription.PlanFeatures public freeFeatures;
    IMetaGaugeSubscription.PlanFeatures public proFeatures;
    IMetaGaugeSubscription.PlanLimits public proLimits;
    uint256 constant TEST_BASE_TIME = 1700000000; // A fixed timestamp for testing


    function setUp() public {
        featureValidator = new MetaGaugeFeatureValidator();
        
        // Setup Free tier features
        freeFeatures = IMetaGaugeSubscription.PlanFeatures({
            apiCallsPerMonth: MetaGaugeConstants.MAX_API_CALLS_FREE,
            maxProjects: MetaGaugeConstants.MAX_PROJECTS_FREE,
            maxAlerts: MetaGaugeConstants.MAX_ALERTS_FREE,
            exportAccess: false,
            comparisonTool: false,
            walletIntelligence: false,
            apiAccess: false,
            prioritySupport: false,
            customInsights: false
        });
        
        // Setup Pro tier features
        proFeatures = IMetaGaugeSubscription.PlanFeatures({
            apiCallsPerMonth: MetaGaugeConstants.MAX_API_CALLS_PRO,
            maxProjects: MetaGaugeConstants.MAX_PROJECTS_PRO,
            maxAlerts: MetaGaugeConstants.MAX_ALERTS_PRO,
            exportAccess: true,
            comparisonTool: true,
            walletIntelligence: true,
            apiAccess: true,
            prioritySupport: true,
            customInsights: true
        });
        
        proLimits = IMetaGaugeSubscription.PlanLimits({
            historicalData: 365 days,
            teamMembers: 10,
            dataRefreshRate: 6 hours
        });
    }

    // ============ FEATURE ACCESS TESTS ============
    
    function testValidateExportAccess_ProTier() public {
        // Should not revert for Pro tier
        featureValidator.validateFeatureAccess(proFeatures, "export");
    }

    function testValidateExportAccess_FreeTier() public {
        // Should revert for Free tier
        vm.expectRevert(MetaGaugeErrors.FeatureNotAvailable.selector);
        featureValidator.validateFeatureAccess(freeFeatures, "export");
    }

    function testValidateComparisonTool_ProTier() public {
        featureValidator.validateFeatureAccess(proFeatures, "comparison");
    }

    function testValidateComparisonTool_FreeTier() public {
        vm.expectRevert(MetaGaugeErrors.FeatureNotAvailable.selector);
        featureValidator.validateFeatureAccess(freeFeatures, "comparison");
    }

    function testValidateWalletIntel_ProTier() public {
        featureValidator.validateFeatureAccess(proFeatures, "wallet_intel");
    }

    function testValidateWalletIntel_FreeTier() public {
        vm.expectRevert(MetaGaugeErrors.FeatureNotAvailable.selector);
        featureValidator.validateFeatureAccess(freeFeatures, "wallet_intel");
    }

    function testValidateAPIAccess_ProTier() public {
        featureValidator.validateFeatureAccess(proFeatures, "api");
    }

    function testValidateAPIAccess_FreeTier() public {
        vm.expectRevert(MetaGaugeErrors.FeatureNotAvailable.selector);
        featureValidator.validateFeatureAccess(freeFeatures, "api");
    }

    function testValidateCustomInsights_ProTier() public {
        featureValidator.validateFeatureAccess(proFeatures, "custom_insights");
    }

    function testValidateCustomInsights_FreeTier() public {
        vm.expectRevert(MetaGaugeErrors.FeatureNotAvailable.selector);
        featureValidator.validateFeatureAccess(freeFeatures, "custom_insights");
    }

    function testValidatePrioritySupport_ProTier() public {
        featureValidator.validateFeatureAccess(proFeatures, "priority_support");
    }

    function testValidatePrioritySupport_FreeTier() public {
        vm.expectRevert(MetaGaugeErrors.FeatureNotAvailable.selector);
        featureValidator.validateFeatureAccess(freeFeatures, "priority_support");
    }

    function testValidateUnknownFeature() public {
        // Unknown features should not revert (they're considered basic features)
        featureValidator.validateFeatureAccess(freeFeatures, "unknown_feature");
    }

    // ============ LIMIT CHECK TESTS ============
    
    function testCheckProjectLimit_WithinLimit() public {
        featureValidator.checkProjectLimit(proFeatures, 5); // 5 < 100 (max)
    }

    function testCheckProjectLimit_AtLimit() public {
        featureValidator.checkProjectLimit(proFeatures, 100); // At limit should not revert
    }

    function testCheckProjectLimit_Exceeded() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                MetaGaugeErrors.LimitExceeded.selector,
                "projects",
                101,
                100
            )
        );
        featureValidator.checkProjectLimit(proFeatures, 101);
    }

    function testCheckAlertLimit_WithinLimit() public {
        featureValidator.checkAlertLimit(proFeatures, 25); // 25 < 50
    }

    function testCheckAlertLimit_Exceeded() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                MetaGaugeErrors.LimitExceeded.selector,
                "alerts",
                51,
                50
            )
        );
        featureValidator.checkAlertLimit(proFeatures, 51);
    }

    function testCheckAPILimit_WithinLimit() public {
        featureValidator.checkAPILimit(proFeatures, 25000); // 25k < 50k
    }

    function testCheckAPILimit_Exceeded() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                MetaGaugeErrors.LimitExceeded.selector,
                "api_calls",
                50001,
                50000
            )
        );
        featureValidator.checkAPILimit(proFeatures, 50001);
    }

    function testCheckTeamMemberLimit_WithinLimit() public {
        featureValidator.checkTeamMemberLimit(proLimits, 5); // 5 < 10
    }

    function testCheckTeamMemberLimit_Exceeded() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                MetaGaugeErrors.LimitExceeded.selector,
                "team_members",
                11,
                10
            )
        );
        featureValidator.checkTeamMemberLimit(proLimits, 11);
    }

    // ============ ROLE VALIDATION TESTS ============
    
    function testValidateRoleTransition_Valid() public {
        featureValidator.validateRoleTransition(0, 1); // Startup -> Researcher
        featureValidator.validateRoleTransition(1, 2); // Researcher -> admin
        featureValidator.validateRoleTransition(0, 2); // Startup -> admin
    }

    function testValidateRoleTransition_InvalidRole() public {
        vm.expectRevert(MetaGaugeErrors.InvalidUserRole.selector);
        featureValidator.validateRoleTransition(0, 3); // Invalid role
    }

    // ============ TIER VALIDATION TESTS ============
    
    function testValidateTierTransition_Valid() public {
        featureValidator.validateTierTransition(0, 1); // Free -> Starter
        featureValidator.validateTierTransition(1, 2); // Starter -> Pro
        featureValidator.validateTierTransition(2, 3); // Pro -> Enterprise
        featureValidator.validateTierTransition(3, 0); // Enterprise -> Free (downgrade)
    }

    function testValidateTierTransition_InvalidTier() public {
        vm.expectRevert(MetaGaugeErrors.InvalidSubscriptionTier.selector);
        featureValidator.validateTierTransition(0, 4); // Invalid tier
    }

    // ============ SUBSCRIPTION STATE VALIDATION TESTS ============
    
    function testValidateActiveSubscription_Active() public {
        // Set a fixed time
        vm.warp(TEST_BASE_TIME);
        IMetaGaugeSubscription.Subscriber memory activeSub = _createActiveSubscriber();
        featureValidator.validateActiveSubscription(activeSub);
    }

    function testValidateActiveSubscription_NotActive() public {
         vm.warp(TEST_BASE_TIME); 
        IMetaGaugeSubscription.Subscriber memory inactiveSub = _createInactiveSubscriber();
        vm.expectRevert(MetaGaugeErrors.NoActiveSubscription.selector);
        featureValidator.validateActiveSubscription(inactiveSub);
    }

    function testValidateActiveSubscription_Expired() public {
        vm.warp(TEST_BASE_TIME); 
        IMetaGaugeSubscription.Subscriber memory expiredSub = _createExpiredSubscriber();
        vm.expectRevert(MetaGaugeErrors.SubscriptionExpired.selector);
        featureValidator.validateActiveSubscription(expiredSub);
    }

    function testValidateSubscriptionNotExpired_Active() public {
         vm.warp(TEST_BASE_TIME); 
        IMetaGaugeSubscription.Subscriber memory activeSub = _createActiveSubscriber();
        featureValidator.validateSubscriptionNotExpired(activeSub);
    }

    function testValidateSubscriptionNotExpired_Expired() public {
         vm.warp(TEST_BASE_TIME); 
        IMetaGaugeSubscription.Subscriber memory expiredSub = _createExpiredSubscriber();
        vm.expectRevert(MetaGaugeErrors.SubscriptionExpired.selector);
        featureValidator.validateSubscriptionNotExpired(expiredSub);
    }

    function testValidateSubscriptionNotExpired_InGracePeriod() public {
         vm.warp(TEST_BASE_TIME); 
        IMetaGaugeSubscription.Subscriber memory gracePeriodSub = _createGracePeriodSubscriber();
        // Should not revert during grace period
        featureValidator.validateSubscriptionNotExpired(gracePeriodSub);
    }

    // ============ HELPER FUNCTIONS ============
    
    function _createActiveSubscriber() internal view returns (IMetaGaugeSubscription.Subscriber memory) {
        return IMetaGaugeSubscription.Subscriber({
            userAddress: address(0x123),
            tier: IMetaGaugeSubscription.SubscriptionTier.Pro,
            role: IMetaGaugeSubscription.UserRole.Startup,
            billingCycle: IMetaGaugeSubscription.BillingCycle.Monthly,
            startTime: block.timestamp - 10 days,
            endTime: block.timestamp + 20 days,
            periodStart: block.timestamp - 10 days,
            periodEnd: block.timestamp + 20 days,
            isActive: true,
            cancelAtPeriodEnd: false,
            gracePeriodEnd: block.timestamp + 20 days + MetaGaugeConstants.GRACE_PERIOD,
            amountPaid: MetaGaugeConstants.STARTER_MONTHLY_PRICE_MGT, // or whatever test value you want
            currency: IMetaGaugeSubscription.PaymentCurrency.Token// or PaymentCurrency.ETH
        });
    }

    function _createInactiveSubscriber() internal view returns (IMetaGaugeSubscription.Subscriber memory) {
        IMetaGaugeSubscription.Subscriber memory sub = _createActiveSubscriber();
        sub.isActive = false;
        return sub;
    }

    function _createExpiredSubscriber() internal view returns (IMetaGaugeSubscription.Subscriber memory) {
        uint256 ts = block.timestamp;
    if (ts == 0) {
        ts = 1700000000; // 👈 fallback if not warped
    }
        IMetaGaugeSubscription.Subscriber memory sub = _createActiveSubscriber();
        sub.endTime = ts - 30 days;
        sub.gracePeriodEnd = ts - 23 days; // Past grace period
        return sub;
    }

    function _createGracePeriodSubscriber() internal view returns (IMetaGaugeSubscription.Subscriber memory) {
    uint256 ts = block.timestamp;
    if (ts == 0) {
        ts = 1700000000;
    }
        IMetaGaugeSubscription.Subscriber memory sub = _createActiveSubscriber();
        sub.endTime = ts - 3 days;
        sub.gracePeriodEnd = ts + 4 days; // Still in grace period
        return sub;
    }
}