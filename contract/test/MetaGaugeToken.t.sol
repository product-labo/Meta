// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MetaGaugeToken} from "../src/MetaGaugeToken.sol";

contract MetaGaugeTokenTest is Test {
    MetaGaugeToken public token;
    address public owner = address(this);
    address public user1 = address(0x123);
    address public user2 = address(0x456);

    uint256 public constant INITIAL_SUPPLY = 300_000_000 * 1e18;
    uint256 public constant MAX_SUPPLY = 500_000_000 * 1e18;

    function setUp() public {
        token = new MetaGaugeToken();
    }
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
    // ============ CONSTRUCTOR TESTS ============

    function testConstructor_SetsNameSymbolSupply() public {
        assertEq(token.name(), "MetaGaugeToken");
        assertEq(token.symbol(), "MGT");
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
    }

    function testMaxSupply_IsConstant() public {
        assertEq(token.maxSupply(), MAX_SUPPLY);
    }

    // ============ BASIC ERC20 TESTS ============

    function testTransfer_Works() public {
        uint256 amount = 1_000 * 1e18;
        token.transfer(user1, amount);
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - amount);
    }

    function testTransfer_InsufficientBalance_Reverts() public {
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(owner, 1e18);
    }

    function testApproveAndAllowance() public {
        uint256 amount = 5000 * 1e18;
        token.approve(user1, amount);
        assertEq(token.allowance(owner, user1), amount);
    }

    function testTransferFrom_UsesAllowance() public {
        uint256 amount = 1000 * 1e18;
        token.approve(user1, amount);

        vm.startPrank(user1);
        token.transferFrom(owner, user2, amount);
        vm.stopPrank();

        assertEq(token.balanceOf(user2), amount);
        assertEq(token.allowance(owner, user1), 0);
    }

    function testTransferFrom_WithoutApproval_Reverts() public {
        vm.prank(user1);
        vm.expectRevert();
        token.transferFrom(owner, user2, 1000 * 1e18);
    }

    // ============ MINTING TESTS ============

    function testMint_ByOwner() public {
        uint256 mintAmount = 10_000 * 1e18;
        token.mint(user1, mintAmount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + mintAmount);
        assertEq(token.balanceOf(user1), mintAmount);
    }

    function testMint_ByNonOwner_Reverts() public {
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        token.mint(user1, 1_000 * 1e18);
    }

    function testMint_UpToMaxSupply_Works() public {
        uint256 remaining = MAX_SUPPLY - token.totalSupply();
        token.mint(user1, remaining);
        assertEq(token.totalSupply(), MAX_SUPPLY);
    }

    function testMint_ExceedsMaxSupply_Reverts() public {
        uint256 over = (MAX_SUPPLY - token.totalSupply()) + 1;
        vm.expectRevert("MetaGaugeToken: exceeds max supply");
        token.mint(user1, over);
    }

    // ============ EDGE CASE TESTS ============

    function testTransferToZeroAddress_Reverts() public {
        vm.expectRevert();
        token.transfer(address(0), 1e18);
    }

    function testApproveToZeroAddress_Reverts() public {
        vm.expectRevert();
        token.approve(address(0), 1000);
    }

    function testMultipleApprovals_UpdatesAllowance() public {
        token.approve(user1, 1000);
        token.approve(user1, 500);
        assertEq(token.allowance(owner, user1), 500);
    }

    function testTotalSupplyMatchesBalancesAfterTransfersAndMint() public {
        token.transfer(user1, 1_000_000 * 1e18);
        token.mint(user2, 2_000_000 * 1e18);

        uint256 total = token.balanceOf(owner)
            + token.balanceOf(user1)
            + token.balanceOf(user2);

        assertEq(total, token.totalSupply());
    }
    
    //  NEW (Edge Case 1.1) Decimals should be 18
    function testDecimals_Is18() public {
        assertEq(token.decimals(), 18);
    }

    //  NEW (Edge Case 1.2) Minting to zero address should revert
    function testMint_ToZeroAddress_Reverts() public {
        vm.expectRevert(bytes("ERC20: mint to the zero address"));
        token.mint(address(0), 1000 * 1e18);
    }

    //  NEW (Edge Case 1.3) Owner should be deployer after construction
    function testOwner_IsDeployerAfterConstruction() public {
        assertEq(token.owner(), owner, "owner should be deployer");
    }

    //  NEW (Edge Case 1.4) Renouncing ownership should prevent further minting
    function testRenounceOwnership_PreventsMinting() public {
        // Owner can mint before renounce
        token.mint(user1, 1_000 * 1e18);
        assertEq(token.balanceOf(user1), 1_000 * 1e18);

        // Renounce ownership
        token.renounceOwnership();

        // Now minting should fail
        vm.expectRevert("Ownable: caller is not the owner");
        token.mint(user1, 500 * 1e18);
    }

    //  NEW (Edge Case 1.5) Total supply must equal sum of all balances
    function testTotalSupply_EqualsSumOfBalances() public {
        token.transfer(user1, 1000 * 1e18);
        token.mint(user2, 2000 * 1e18);

        uint256 totalBalances =
            token.balanceOf(owner) +
            token.balanceOf(user1) +
            token.balanceOf(user2);

        assertEq(token.totalSupply(), totalBalances);
    }
        // ============ TRANSFER EDGE CASE TESTS ============

    //  2.1: Transfer to self should work but not change total supply
    function testTransferToSelf_Works() public {
        uint256 before = token.balanceOf(owner);
        token.transfer(owner, 1000 * 1e18);

        assertEq(token.balanceOf(owner), before, "balance should be unchanged");
        assertEq(token.totalSupply(), INITIAL_SUPPLY, "total supply should remain same");
    }

    //  2.2: Transfer of zero tokens should not revert or emit transfer
    function testTransferZeroTokens_DoesNotRevert() public {
        uint256 beforeOwner = token.balanceOf(owner);
        bool success = token.transfer(user1, 0);
        assertTrue(success, "transfer(0) should return true");
        assertEq(token.balanceOf(owner), beforeOwner, "balance should not change");
    }

    //  2.3: Transfer exact available balance should reduce balance to zero
    function testTransferExactBalance_ReducesToZero() public {
        uint256 amount = token.balanceOf(owner);
        token.transfer(user1, amount);
        assertEq(token.balanceOf(owner), 0, "owner should have zero left");
        assertEq(token.balanceOf(user1), amount, "user1 should receive full amount");
    }

    //  2.4: Repeated small transfers draining balance should maintain supply accuracy
    function testRepeatedSmallTransfers_DrainAccount() public {
        uint256 total = 10_000 * 1e18;
        for (uint256 i = 0; i < 10; i++) {
            token.transfer(user1, 1_000 * 1e18);
        }

        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - total, "balance should match total transfers");
        assertEq(token.balanceOf(user1), total, "receiver should have total transferred");
        assertEq(token.totalSupply(), INITIAL_SUPPLY, "total supply must remain same");
    }

    //  2.5: Event emission check — Transfer emits correct logs
    function testTransfer_EmitsEvent() public {
        uint256 amount = 500 * 1e18;
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, user1, amount);
        token.transfer(user1, amount);
    }

    //  2.6: Transfer after approval using transferFrom emits Transfer + Approval
    function testTransferFrom_EmitsTransferAndApprovalEvents() public {
    uint256 amount = 100 * 10 ** token.decimals();

    // Owner approves user1
    vm.startPrank(owner);
    token.approve(user1, amount);
    vm.stopPrank();

    // user1 transfers tokens from owner to user2
    vm.startPrank(user1);

    // 🔹 Expect both Approval and Transfer events in correct order
    vm.expectEmit(true, true, true, true);
    emit Approval(owner, user1, 0); // after full transfer, allowance becomes 0

    vm.expectEmit(true, true, true, true);
    emit Transfer(owner, user2, amount);

    token.transferFrom(owner, user2, amount);

    vm.stopPrank();

    assertEq(token.balanceOf(user2), amount);
    assertEq(token.allowance(owner, user1), 0);
}


    //  2.7: Cannot transfer more than balance even after approvals
    function testTransferMoreThanBalance_Reverts() public {
        uint256 tooMuch = token.balanceOf(owner) + 1;
        vm.expectRevert();
        token.transfer(user1, tooMuch);
    }


}
