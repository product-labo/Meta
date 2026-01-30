// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MetaGaugeErrors
 * @dev Custom errors for Meta Gauge Subscription contract
 */
library MetaGaugeErrors {
    // ============ ACCESS CONTROL ERRORS ============
    error Unauthorized(address caller, address requiredRole);
    error ContractPaused();
    error InvalidUserRole();
    
    // ============ SUBSCRIPTION ERRORS ============
    error InvalidSubscriptionTier();
    error TierNotActive();
    error InsufficientPayment(uint256 required, uint256 provided);
    error NoActiveSubscription();
    error SubscriptionNotExpired();
    error GracePeriodActive();
    error UpgradeNotAllowed();
    error DowngradeRestricted();
    
    // ============ PAYMENT ERRORS ============
    error InvalidPaymentCurrency();
    error PaymentFailed();
    error RefundFailed();
    error InsufficientContractBalance();
    
    // ============ VALIDATION ERRORS ============
    error InvalidAddress();
    error InvalidTimestamp();
    error InvalidDuration();
    error PlanConfigurationError();
    
    // ============ STATE ERRORS ============
    error AlreadySubscribed();
    error SubscriptionExpired();
    error InvalidSubscriptionState();
    
    // ============ FEATURE ERRORS ============
    error FeatureNotAvailable();
    error LimitExceeded(string limitType, uint256 current, uint256 max);
    error InsufficientCredits(uint256 required, uint256 available);

    // Add to MetaGaugeErrors.sol
    error RenewalNotAvailable();
    error SubscriptionCancelled();
    error EarlyRenewalNotAllowed();
    error RenewalWindowNotStarted();
}