// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IMetaGaugeSubscription.sol";
import "../libraries/MetaGaugeConstants.sol";
import "./MetaGaugeFeatureValidator.sol";

/**
 * @title MetaGaugeSubscriptionHelper
 * @dev Helper contract for subscription management and feature access
 */
contract MetaGaugeSubscriptionHelper is MetaGaugeFeatureValidator {
    
    IMetaGaugeSubscription public subscription;
    
    constructor(address subscriptionAddress) {
        subscription = IMetaGaugeSubscription(subscriptionAddress);
    }
    
    // ============ FEATURE ACCESS CHECKS ============
    
    function canAccessFeature(
        address user, 
        string memory feature
    ) public view returns (bool) {
        if (!subscription.isSubscriberActive(user)) return false;
        
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user);
        IMetaGaugeSubscription.SubscriptionPlan memory plan = subscription.getPlanInfo(sub.tier);
        
        try this.validateFeatureAccess(plan.features, feature) {
            return true;
        } catch {
            return false;
        }
    }
    
    function getRemainingQuotas(address user) 
        public 
        view 
        returns (
            uint256 projectsRemaining,
            uint256 alertsRemaining,
            uint256 apiCallsRemaining,
            uint256 teamMembersRemaining
        ) 
    {
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user);
        IMetaGaugeSubscription.SubscriptionPlan memory plan = subscription.getPlanInfo(sub.tier);
        
        // These would come from your backend - here we return max limits
        projectsRemaining = plan.features.maxProjects;
        alertsRemaining = plan.features.maxAlerts;
        apiCallsRemaining = plan.features.apiCallsPerMonth;
        teamMembersRemaining = plan.limits.teamMembers;
    }
    
    // ============ SUBSCRIPTION INFO ============
    
    function getSubscriptionStatus(address user) 
        public 
        view 
        returns (
            bool isActive,
            bool isInGracePeriod,
            uint256 daysRemaining,
            uint8 currentTier,
            uint8 billingCycle
        ) 
    {
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user);
        
        isActive = subscription.isSubscriberActive(user);
        isInGracePeriod = block.timestamp > sub.endTime && block.timestamp <= sub.gracePeriodEnd;
        daysRemaining = _calculateDaysRemaining(sub.endTime);
        currentTier = uint8(sub.tier);
        billingCycle = uint8(sub.billingCycle);
    }
    
    function _calculateDaysRemaining(uint256 endTime) internal view returns (uint256) {
        if (block.timestamp >= endTime) return 0;
        return (endTime - block.timestamp) / MetaGaugeConstants.SECONDS_PER_DAY;
    }
    
    // ============ UPGRADE/DOWNGRADE INFO ============
    
    function getUpgradeOptions(address user) 
        public 
        view 
        returns (
            uint8[] memory availableTiers,
            uint256[] memory monthlyPrices,
            uint256[] memory yearlyPrices
        ) 
    {
        IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(user);
        uint8 currentTier = uint8(sub.tier);
        
        // Count available upgrade tiers
        uint256 availableCount;
        for (uint8 i = currentTier + 1; i <= 3; i++) {
            IMetaGaugeSubscription.SubscriptionPlan memory plan = subscription.getPlanInfo(IMetaGaugeSubscription.SubscriptionTier(i));
            if (plan.active) availableCount++;
        }
        
        availableTiers = new uint8[](availableCount);
        monthlyPrices = new uint256[](availableCount);
        yearlyPrices = new uint256[](availableCount);
        
        uint256 index;
        for (uint8 i = currentTier + 1; i <= 3; i++) {
            IMetaGaugeSubscription.SubscriptionPlan memory plan = subscription.getPlanInfo(IMetaGaugeSubscription.SubscriptionTier(i));
            if (plan.active) {
                availableTiers[index] = i;
                monthlyPrices[index] = plan.monthlyPrice;
                yearlyPrices[index] = plan.yearlyPrice;
                index++;
            }
        }
    }
    
    // ============ BULK OPERATIONS ============
    
    function batchCheckFeatureAccess(
        address[] memory users,
        string memory feature
    ) public view returns (bool[] memory) {
        bool[] memory results = new bool[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            results[i] = canAccessFeature(users[i], feature);
        }
        
        return results;
    }
    
    function batchGetSubscriptionStatus(
        address[] memory users
    ) public view returns (bool[] memory activeStatuses, uint256[] memory daysRemaining) {
        activeStatuses = new bool[](users.length);
        daysRemaining = new uint256[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            IMetaGaugeSubscription.Subscriber memory sub = subscription.getSubscriptionInfo(users[i]);
            activeStatuses[i] = subscription.isSubscriberActive(users[i]);
            daysRemaining[i] = _calculateDaysRemaining(sub.endTime);
        }
    }

    
}