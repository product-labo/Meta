// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MetaGaugeConstants
 * @dev Constants for Meta Gauge Subscription contract
 */
library MetaGaugeConstants {
    // ============ TIME CONSTANTS ============
    uint256 public constant SECONDS_PER_MINUTE = 60;
    uint256 public constant SECONDS_PER_HOUR = 3600;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant SECONDS_PER_WEEK = 604800;
    uint256 public constant SECONDS_PER_MONTH = 2592000; // 30 days
    uint256 public constant SECONDS_PER_YEAR = 31536000; // 365 days
    
    // ============ SUBSCRIPTION CONSTANTS ============
    uint256 public constant GRACE_PERIOD = 7 days;
    uint256 public constant TRIAL_PERIOD = 14 days;
    uint256 public constant MAX_BILLING_CYCLES = 36;
    uint256 public constant MIN_SUBSCRIPTION_DURATION = 1 days;
    uint256 public constant MAX_SUBSCRIPTION_DURATION = 1095 days; // 3 years
    
    // ============ FEE & PRICING CONSTANTS ============
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    uint256 public constant EARLY_RENEWAL_DISCOUNT_BPS = 500; // 5%
    uint256 public constant VOLUME_DISCOUNT_BPS = 1000; // 10%
    uint256 public constant REFERRAL_BONUS_BPS = 1000; // 10%
    
    uint256 public constant PRICE_DECIMALS = 18;
    uint256 public constant BPS_DECIMALS = 4;
    
    // ============ TIER LIMIT CONSTANTS ============
    uint256 public constant MAX_PROJECTS_FREE = 5;
    uint256 public constant MAX_ALERTS_FREE = 3;
    uint256 public constant MAX_API_CALLS_FREE = 1000;
    uint256 public constant MAX_TEAM_MEMBERS_FREE = 1;
    
    uint256 public constant MAX_PROJECTS_STARTER = 20;
    uint256 public constant MAX_ALERTS_STARTER = 15;
    uint256 public constant MAX_API_CALLS_STARTER = 10000;
    uint256 public constant MAX_TEAM_MEMBERS_STARTER = 3;
    
    uint256 public constant MAX_PROJECTS_PRO = 100;
    uint256 public constant MAX_ALERTS_PRO = 50;
    uint256 public constant MAX_API_CALLS_PRO = 50000;
    uint256 public constant MAX_TEAM_MEMBERS_PRO = 10;
    
    uint256 public constant MAX_PROJECTS_ENTERPRISE = 1000;
    uint256 public constant MAX_ALERTS_ENTERPRISE = 200;
    uint256 public constant MAX_API_CALLS_ENTERPRISE = 250000;
    uint256 public constant MAX_TEAM_MEMBERS_ENTERPRISE = 50;
 // ============ PRICE CONSTANTS (in wei) ============
// ETH-based pricing
uint256 public constant STARTER_MONTHLY_PRICE = 0.01 ether;
uint256 public constant STARTER_YEARLY_PRICE = 0.1 ether;
uint256 public constant PRO_MONTHLY_PRICE = 0.034 ether;
uint256 public constant PRO_YEARLY_PRICE = 0.3 ether;
uint256 public constant ENTERPRISE_MONTHLY_PRICE = 0.103 ether;
uint256 public constant ENTERPRISE_YEARLY_PRICE = 1.0 ether;

// MGT token-based pricing
uint256 public constant STARTER_MONTHLY_PRICE_MGT = 1e16;       // 0.01 MGT
uint256 public constant STARTER_YEARLY_PRICE_MGT = 1e17;        // 0.1 MGT
uint256 public constant PRO_MONTHLY_PRICE_MGT = 34e15;          // 0.034 MGT
uint256 public constant PRO_YEARLY_PRICE_MGT = 3e17;            // 0.3 MGT
uint256 public constant ENTERPRISE_MONTHLY_PRICE_MGT = 103e15;  // 0.103 MGT
uint256 public constant ENTERPRISE_YEARLY_PRICE_MGT = 1e18;     // 1.0 MGT

    
    // ============ ADDRESS CONSTANTS ============
    address public constant TREASURY_WALLET = 0x64a5128Fd2a9B63c1052D1960C66c335A430D809;
    address public constant DEVELOPER_WALLET = 0x64a5128Fd2a9B63c1052D1960C66c335A430D809;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // ============ ROLE CONSTANTS ============
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
}