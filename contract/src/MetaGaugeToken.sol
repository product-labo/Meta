
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "openzeppelin/token/ERC20/ERC20.sol";
import "openzeppelin/access/Ownable.sol";

/**
 * @title MockLiskToken
 * @dev ERC20 token with capped total supply and owner-only minting.
 */
contract MetaGaugeToken is ERC20, Ownable {
    uint256 public immutable maxSupply = 500_000_000 * 10 ** 18; // 500 million cap

    constructor() ERC20("MetaGaugeToken", "MGT") {
        uint256 initialSupply = 300_000_000 * 10 ** 18; // 300 million initial mint
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint new tokens (only owner) up to the max supply.
     * @param to The address to receive minted tokens.
     * @param amount The number of tokens to mint (in wei).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "MetaGaugeToken: exceeds max supply");
        _mint(to, amount);
    }
}
