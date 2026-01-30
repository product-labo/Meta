// test/MetaGaugeAccessControl.t.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {MetaGaugeAccessControl} from "../src/MetaGaugeAccessControl.sol";
import {MetaGaugeErrors} from "../src/libraries/MetaGaugeErrors.sol";


contract MetaGaugeAccessControlTest is Test {
    MetaGaugeAccessControl public accessControl;
    address public owner = address(0x123);
    address public operator = address(0x456);
    address public user = address(0x789);

    function setUp() public {
        vm.startPrank(owner);
        accessControl = new MetaGaugeAccessControl(owner);
        vm.stopPrank();
    }

    // ============ CONSTRUCTOR TESTS ============
    
    function testConstructor_SetsOwner() public {
        assertEq(accessControl.owner(), owner);
    }

    function testConstructor_OwnerIsOperator() public {
        assertTrue(accessControl.operators(owner));
    }

    // ============ OPERATOR MANAGEMENT TESTS ============
    
    function testAddOperator_ByOwner() public {
        vm.startPrank(owner);
        accessControl.addOperator(operator);
        vm.stopPrank();
        
        assertTrue(accessControl.operators(operator));
    }

    function testAddOperator_ByNonOwner() public {
        vm.startPrank(user);
        vm.expectRevert(); // Ownable: caller is not the owner
        accessControl.addOperator(operator);
        vm.stopPrank();
    }

    function testRemoveOperator_ByOwner() public {
        // First add operator
        vm.startPrank(owner);
        accessControl.addOperator(operator);
        assertTrue(accessControl.operators(operator));
        
        // Then remove
        accessControl.removeOperator(operator);
        vm.stopPrank();
        
        assertFalse(accessControl.operators(operator));
    }

    function testRemoveOperator_ByNonOwner() public {
        vm.startPrank(user);
        vm.expectRevert(); // Ownable: caller is not the owner
        accessControl.removeOperator(operator);
        vm.stopPrank();
    }

    // ============ PAUSE FUNCTIONALITY TESTS ============
    
    function testPause_ByOwner() public {
        assertFalse(accessControl.paused());
        
        vm.startPrank(owner);
        accessControl.pause();
        vm.stopPrank();
        
        assertTrue(accessControl.paused());
    }

    function testPause_ByNonOwner() public {
        vm.startPrank(user);
        vm.expectRevert(); // Ownable: caller is not the owner
        accessControl.pause();
        vm.stopPrank();
    }

    function testUnpause_ByOwner() public {
        // First pause
        vm.startPrank(owner);
        accessControl.pause();
        assertTrue(accessControl.paused());
        
        // Then unpause
        accessControl.unpause();
        vm.stopPrank();
        
        assertFalse(accessControl.paused());
    }

    function testUnpause_ByNonOwner() public {
        vm.startPrank(user);
        vm.expectRevert(); // Ownable: caller is not the owner
        accessControl.unpause();
        vm.stopPrank();
    }

    // ============ MODIFIER TESTS ============
    
    function testWhenNotPaused_WhenNotPaused() public {
        // Should not revert when not paused
        vm.startPrank(owner);
        accessControl.unpause(); // Ensure not paused
        vm.stopPrank();
        
        // This would test a function with whenNotPaused modifier
        // For now, we test the state directly
        assertFalse(accessControl.paused());
    }

    function testWhenNotPaused_WhenPaused() public {
        vm.startPrank(owner);
        accessControl.pause();
        vm.stopPrank();
        
        assertTrue(accessControl.paused());
    }

    function testOnlyOperator_ByOwner() public {
        // Owner is also an operator, so should pass
        vm.startPrank(owner);
        // This would test a function with onlyOperator modifier
        // For now, we test the operator mapping directly
        assertTrue(accessControl.operators(owner));
        vm.stopPrank();
    }

    function testOnlyOperator_ByOperator() public {
        vm.startPrank(owner);
        accessControl.addOperator(operator);
        vm.stopPrank();
        
        vm.startPrank(operator);
        assertTrue(accessControl.operators(operator));
        vm.stopPrank();
    }

    function testOnlyOperator_ByNonOperator() public {
        vm.startPrank(user);
        assertFalse(accessControl.operators(user));
        vm.stopPrank();
    }
}