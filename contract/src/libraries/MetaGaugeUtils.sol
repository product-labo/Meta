// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MetaGaugeErrors.sol";
import "./MetaGaugeConstants.sol";

/**
 * @title MetaGaugeUtils
 * @dev Utility functions for Meta Gauge Subscription contract
 */
library MetaGaugeUtils {
    using MetaGaugeUtils for address;
    
    // ============ VALIDATION FUNCTIONS ============
    
    function validateAddress(address addr) internal pure {
        if (addr == address(0)) {
            revert MetaGaugeErrors.InvalidAddress();
        }
    }
    
    function validateSubscriptionDuration(uint256 duration) internal pure {
        if (duration < MetaGaugeConstants.MIN_SUBSCRIPTION_DURATION) {
            revert MetaGaugeErrors.InvalidDuration();
        }
    }
    
    function validatePaymentAmount(uint256 required, uint256 provided) internal pure {
        if (provided < required) {
            revert MetaGaugeErrors.InsufficientPayment(required, provided);
        }
    }

    // ============ TIME FUNCTIONS ============
    
    function getCurrentTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }
    
    function isTimestampInFuture(uint256 timestamp) internal view returns (bool) {
        return timestamp > block.timestamp;
    }
    
    function calculateEndTime(uint256 startTime, uint256 duration) 
        internal 
        pure 
        returns (uint256) 
    {
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
    
    // ============ PRICING FUNCTIONS ============
    
    function calculateProratedAmount(
        uint256 fullAmount,
        uint256 timeUsed,
        uint256 totalDuration
    ) internal pure returns (uint256) {
        if (timeUsed >= totalDuration) return 0;
        
        uint256 unusedTime = totalDuration - timeUsed;
        uint256 unusedPercentage = (unusedTime * 1e18) / totalDuration;
        
        return (fullAmount * unusedPercentage) / 1e18;
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
    
    // ============ FEATURE VALIDATION ============
    
    function checkFeatureAccess(
        bool featureEnabled,
        string memory featureName
    ) internal pure {
        if (!featureEnabled) {
            revert MetaGaugeErrors.FeatureNotAvailable();
        }
    }
    
    function checkLimit(
        uint256 current,
        uint256 max,
        string memory limitType
    ) internal pure {
        if (current > max) {
            revert MetaGaugeErrors.LimitExceeded(limitType, current, max);
        }
    }
    
    // ============ SAFE TRANSFER FUNCTIONS ============
    
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}("");
        if (!success) {
            revert MetaGaugeErrors.PaymentFailed();
        }
    }
}