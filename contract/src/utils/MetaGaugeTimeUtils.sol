// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/MetaGaugeConstants.sol";
import "../libraries/MetaGaugeErrors.sol";

/**
 * @title MetaGaugeTimeUtils
 * @dev Time utility functions for subscription management
 */
library MetaGaugeTimeUtils {
    
    function getCurrentTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }
    
    function isFuture(uint256 timestamp) internal view returns (bool) {
        return timestamp > block.timestamp;
    }
    
    function isPast(uint256 timestamp) internal view returns (bool) {
        return timestamp <= block.timestamp;
    }
    
    function calculateEndTime(
        uint256 startTime, 
        uint256 duration
    ) internal pure returns (uint256) {
        if (duration < MetaGaugeConstants.MIN_SUBSCRIPTION_DURATION) {
            revert MetaGaugeErrors.InvalidDuration();
        }
        if (duration > MetaGaugeConstants.MAX_SUBSCRIPTION_DURATION) {
            revert MetaGaugeErrors.InvalidDuration();
        }
        return startTime + duration;
    }
    
    function isInGracePeriod(uint256 endTime) internal view returns (bool) {
        return block.timestamp > endTime && 
               block.timestamp <= endTime + MetaGaugeConstants.GRACE_PERIOD;
    }
    
    function getRemainingTime(uint256 endTime) internal view returns (uint256) {
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }
    
    function getTimeUsed(uint256 startTime, uint256 endTime) 
        internal 
        view 
        returns (uint256) 
    {
        if (block.timestamp <= startTime) return 0;
        if (block.timestamp >= endTime) return endTime - startTime;
        return block.timestamp - startTime;
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
    
    function isWithinRenewalWindow(uint256 endTime) internal view returns (bool) {
        uint256 renewalWindowStart = endTime - (7 * MetaGaugeConstants.SECONDS_PER_DAY);
        return block.timestamp >= renewalWindowStart && block.timestamp <= endTime;
    }
    
    function getBillingCycleDuration(uint8 billingCycle) 
        internal 
        pure 
        returns (uint256) 
    {
        if (billingCycle == 0) { // Monthly
            return MetaGaugeConstants.SECONDS_PER_MONTH;
        } else if (billingCycle == 1) { // Yearly
            return MetaGaugeConstants.SECONDS_PER_YEAR;
        }
        revert MetaGaugeErrors.InvalidDuration();
    }
}