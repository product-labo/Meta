// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IMetaGaugeEvents
 * @dev Events interface for Meta Gauge platform
 */
interface IMetaGaugeEvents {
    // ============ SUBSCRIPTION EVENTS ============
    event SubscriptionCreated(
        address indexed user,
        uint8 tier,
        uint8 role,
        uint8 billingCycle,
        uint256 startTime,
        uint256 endTime,
        string userUUID
    );
    
    event SubscriptionUpdated(
        address indexed user,
        uint8 oldTier,
        uint8 newTier,
        uint8 billingCycle
    );
    
    event SubscriptionCancelled(address indexed user);
    event SubscriptionRenewed(address indexed user, uint256 newEndTime);
    event UserRoleUpdated(address indexed user, uint8 newRole);
    event PlanTierUpdated(uint8 tier, bool active);
    
    // ============ PAYMENT EVENTS ============
    event PaymentProcessed(
        address indexed user,
        uint256 amount,
        uint8 currency,
        uint256 timestamp
    );
    
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event RefundIssued(address indexed user, uint256 amount);
    
    // ============ ACCESS CONTROL EVENTS ============
    event RoleGranted(address indexed account, string role);
    event RoleRevoked(address indexed account, string role);
    event ContractPaused();
    event ContractUnpaused();
}