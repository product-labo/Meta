// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IMetaGaugeSubscription.sol";
import "../libraries/MetaGaugeErrors.sol";
import "../libraries/MetaGaugeConstants.sol";

/**
 * @title MetaGaugeFeatureValidator
 * @dev Feature validation and access control helper
 */
contract MetaGaugeFeatureValidator {
    
    // ============ FEATURE VALIDATION ============
    
    function validateFeatureAccess(
        IMetaGaugeSubscription.PlanFeatures memory features,
        string memory feature
    ) public pure {
        bytes32 featureHash = keccak256(abi.encodePacked(feature));
        
        if (featureHash == keccak256(abi.encodePacked("export"))) {
            if (!features.exportAccess) revert MetaGaugeErrors.FeatureNotAvailable();
        }
        else if (featureHash == keccak256(abi.encodePacked("comparison"))) {
            if (!features.comparisonTool) revert MetaGaugeErrors.FeatureNotAvailable();
        }
        else if (featureHash == keccak256(abi.encodePacked("wallet_intel"))) {
            if (!features.walletIntelligence) revert MetaGaugeErrors.FeatureNotAvailable();
        }
        else if (featureHash == keccak256(abi.encodePacked("api"))) {
            if (!features.apiAccess) revert MetaGaugeErrors.FeatureNotAvailable();
        }
        else if (featureHash == keccak256(abi.encodePacked("custom_insights"))) {
            if (!features.customInsights) revert MetaGaugeErrors.FeatureNotAvailable();
        }
        else if (featureHash == keccak256(abi.encodePacked("priority_support"))) {
            if (!features.prioritySupport) revert MetaGaugeErrors.FeatureNotAvailable();
        }
        // Basic features are always available for active subscribers
    }
    
    function checkProjectLimit(
        IMetaGaugeSubscription.PlanFeatures memory features,
        uint256 currentProjects
    ) public pure {
        if (currentProjects > features.maxProjects) {
            revert MetaGaugeErrors.LimitExceeded("projects", currentProjects, features.maxProjects);
        }
    }
    
    function checkAlertLimit(
        IMetaGaugeSubscription.PlanFeatures memory features,
        uint256 currentAlerts
    ) public pure {
        if (currentAlerts > features.maxAlerts) {
            revert MetaGaugeErrors.LimitExceeded("alerts", currentAlerts, features.maxAlerts);
        }
    }
    
    function checkAPILimit(
        IMetaGaugeSubscription.PlanFeatures memory features,
        uint256 apiCallsUsed
    ) public pure {
        if (apiCallsUsed > features.apiCallsPerMonth) {
            revert MetaGaugeErrors.LimitExceeded("api_calls", apiCallsUsed, features.apiCallsPerMonth);
        }
    }
    
    function checkTeamMemberLimit(
        IMetaGaugeSubscription.PlanLimits memory limits,
        uint256 currentMembers
    ) public pure {
        if (currentMembers > limits.teamMembers) {
            revert MetaGaugeErrors.LimitExceeded("team_members", currentMembers, limits.teamMembers);
        }
    }
    
    // ============ ROLE-BASED VALIDATION ============
    
    function validateRoleTransition(uint8 currentRole, uint8 newRole) public pure {
        // Any role can transition to any other role
        // Add restrictions here if needed
        if (newRole > 2) { // 0=Startup, 1=Investor, 2=Researcher
            revert MetaGaugeErrors.InvalidUserRole();
        }
    }
    
    function validateTierTransition(uint8 currentTier, uint8 newTier) public pure {
        // Allow both upgrades and downgrades
        if (newTier > 3) { // 0=Free, 1=Starter, 2=Pro, 3=Enterprise
            revert MetaGaugeErrors.InvalidSubscriptionTier();
        }
    }
    
    // ============ SUBSCRIPTION STATE VALIDATION ============
    
    function validateActiveSubscription(
        IMetaGaugeSubscription.Subscriber memory subscriber
    ) public view {
        if (!subscriber.isActive) {
            revert MetaGaugeErrors.NoActiveSubscription();
        }
        
        if (block.timestamp > subscriber.gracePeriodEnd) {
            revert MetaGaugeErrors.SubscriptionExpired();
        }
        if (subscriber.endTime < subscriber.startTime) {
        revert MetaGaugeErrors.SubscriptionExpired();
    }
    }
    
    function validateSubscriptionNotExpired(
        IMetaGaugeSubscription.Subscriber memory subscriber
    ) public view {
        if (subscriber.gracePeriodEnd < subscriber.endTime) {
        // Grace period improperly configured
        revert MetaGaugeErrors.SubscriptionExpired();
    }
     if (block.timestamp > subscriber.gracePeriodEnd) {
        revert MetaGaugeErrors.SubscriptionExpired();
    }
    }
}