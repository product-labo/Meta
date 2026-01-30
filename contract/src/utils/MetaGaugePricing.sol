// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/MetaGaugeConstants.sol";
import "../libraries/MetaGaugeErrors.sol";

/**
 * @title MetaGaugePricing
 * @dev Pricing calculations for Meta Gauge subscriptions
 */
library MetaGaugePricing {
    
    // ============ ENUMS ============
    enum SubscriptionTier { Free, Starter, Pro, Enterprise }
    enum BillingCycle { Monthly, Yearly }
    
    // ============ PRICING FUNCTIONS ============
    
    function getTierPrice(
        SubscriptionTier tier,
        BillingCycle cycle
    ) internal pure returns (uint256) {
        if (tier == SubscriptionTier.Free) {
            return 0;
        }
        
        uint256 basePrice;
        
        if (tier == SubscriptionTier.Starter) {
            basePrice = cycle == BillingCycle.Monthly 
                ? MetaGaugeConstants.STARTER_MONTHLY_PRICE 
                : MetaGaugeConstants.STARTER_YEARLY_PRICE;
        } 
        else if (tier == SubscriptionTier.Pro) {
            basePrice = cycle == BillingCycle.Monthly 
                ? MetaGaugeConstants.PRO_MONTHLY_PRICE 
                : MetaGaugeConstants.PRO_YEARLY_PRICE;
        }
        else if (tier == SubscriptionTier.Enterprise) {
            basePrice = cycle == BillingCycle.Monthly 
                ? MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE 
                : MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE;
        }
        else {
            revert MetaGaugeErrors.InvalidSubscriptionTier();
        }
        
        return basePrice;
    }
    
    function calculateUpgradePrice(
        SubscriptionTier currentTier,
        SubscriptionTier newTier,
        BillingCycle currentCycle,
        BillingCycle newCycle,
        uint256 timeRemaining,
        uint256 totalDuration
    ) internal pure returns (uint256) {
        if (newTier <= currentTier) {
            revert MetaGaugeErrors.UpgradeNotAllowed();
        }
        
        uint256 currentPrice = getTierPrice(currentTier, currentCycle);
        uint256 newPrice = getTierPrice(newTier, newCycle);
        
        // Calculate prorated credit for remaining time
        uint256 credit = (currentPrice * timeRemaining) / totalDuration;
        
        return newPrice > credit ? newPrice - credit : 0;
    }
    
    function calculateProratedRefund(
        uint256 amountPaid,
        uint256 timeUsed,
        uint256 totalDuration
    ) internal pure returns (uint256) {
        if (timeUsed >= totalDuration) return 0;
        
        uint256 unusedTime = totalDuration - timeUsed;
        uint256 refundAmount = (amountPaid * unusedTime) / totalDuration;
        
        return refundAmount;
    }
    
    function applyDiscount(uint256 amount, uint256 discountBps) 
        internal 
        pure 
        returns (uint256) 
    {
        uint256 discount = (amount * discountBps) / 10000;
        return amount - discount;
    }
    
    function calculatePlatformFee(uint256 amount) internal pure returns (uint256) {
        return (amount * MetaGaugeConstants.PLATFORM_FEE_BPS) / 10000;
    }
    function getTierPriceInMGT(
    SubscriptionTier tier,
    BillingCycle cycle
) internal pure returns (uint256) {
    if (tier == SubscriptionTier.Free) {
        return 0;
    }

    if (tier == SubscriptionTier.Starter) {
        return cycle == BillingCycle.Monthly
            ? MetaGaugeConstants.STARTER_MONTHLY_PRICE_MGT
            : MetaGaugeConstants.STARTER_YEARLY_PRICE_MGT;
    } 
    else if (tier == SubscriptionTier.Pro) {
        return cycle == BillingCycle.Monthly
            ? MetaGaugeConstants.PRO_MONTHLY_PRICE_MGT
            : MetaGaugeConstants.PRO_YEARLY_PRICE_MGT;
    } 
    else if (tier == SubscriptionTier.Enterprise) {
        return cycle == BillingCycle.Monthly
            ? MetaGaugeConstants.ENTERPRISE_MONTHLY_PRICE_MGT
            : MetaGaugeConstants.ENTERPRISE_YEARLY_PRICE_MGT;
    } 
    else {
        revert MetaGaugeErrors.InvalidSubscriptionTier();
    }
}


}