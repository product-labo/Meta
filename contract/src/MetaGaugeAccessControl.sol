// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "openzeppelin/access/Ownable.sol";
import "./libraries/MetaGaugeErrors.sol";

/**
 * @title MetaGaugeAccessControl
 * @dev Access control module extending Ownable, with operator roles and pause control.
 */
contract MetaGaugeAccessControl is Ownable {
    bool public paused;

    mapping(address => bool) public operators;

    modifier whenNotPaused() {
        if (paused) revert MetaGaugeErrors.ContractPaused();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) {
            revert MetaGaugeErrors.Unauthorized(msg.sender, address(this));
        }
        _;
    }

    constructor(address initialOwner){
        _transferOwnership(initialOwner);
        // The owner is set by the Ownable constructor
        operators[initialOwner] = true; // Owner is also an operator
    }

    function addOperator(address operator) external onlyOwner {
        operators[operator] = true;
    }

    function removeOperator(address operator) external onlyOwner {
        operators[operator] = false;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }
}
