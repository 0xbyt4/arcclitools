// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/contracts/SimpleToken.sol";

contract SimpleTokenTest is Test {
    SimpleToken public token;
    address public deployer = address(1);
    address public alice = address(2);
    address public bob = address(3);

    function setUp() public {
        vm.prank(deployer);
        token = new SimpleToken("TestToken", "TT", 1000);
    }

    // Constructor tests
    function test_constructor_setsName() public view {
        assertEq(token.name(), "TestToken");
    }

    function test_constructor_setsSymbol() public view {
        assertEq(token.symbol(), "TT");
    }

    function test_constructor_setsDecimals() public view {
        assertEq(token.decimals(), 18);
    }

    function test_constructor_mintsTotalSupply() public view {
        assertEq(token.totalSupply(), 1000 * 10 ** 18);
    }

    function test_constructor_assignsBalanceToDeployer() public view {
        assertEq(token.balanceOf(deployer), 1000 * 10 ** 18);
    }

    // Transfer tests
    function test_transfer_success() public {
        vm.prank(deployer);
        bool success = token.transfer(alice, 100 * 10 ** 18);
        assertTrue(success);
        assertEq(token.balanceOf(alice), 100 * 10 ** 18);
        assertEq(token.balanceOf(deployer), 900 * 10 ** 18);
    }

    function test_transfer_emitsEvent() public {
        vm.prank(deployer);
        vm.expectEmit(true, true, false, true);
        emit SimpleToken.Transfer(deployer, alice, 100 * 10 ** 18);
        token.transfer(alice, 100 * 10 ** 18);
    }

    function test_transfer_revertsOnInsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient balance");
        token.transfer(bob, 1);
    }

    function test_transfer_toZeroAddress_succeeds() public {
        // SimpleToken does not have a zero-address check in transfer
        vm.prank(deployer);
        bool success = token.transfer(address(0), 100);
        assertTrue(success);
    }

    // Approve and TransferFrom tests
    function test_approve_setsAllowance() public {
        vm.prank(deployer);
        token.approve(alice, 500 * 10 ** 18);
        assertEq(token.allowance(deployer, alice), 500 * 10 ** 18);
    }

    function test_approve_emitsEvent() public {
        vm.prank(deployer);
        vm.expectEmit(true, true, false, true);
        emit SimpleToken.Approval(deployer, alice, 500 * 10 ** 18);
        token.approve(alice, 500 * 10 ** 18);
    }

    function test_transferFrom_success() public {
        vm.prank(deployer);
        token.approve(alice, 200 * 10 ** 18);

        vm.prank(alice);
        bool success = token.transferFrom(deployer, bob, 100 * 10 ** 18);
        assertTrue(success);
        assertEq(token.balanceOf(bob), 100 * 10 ** 18);
        assertEq(token.allowance(deployer, alice), 100 * 10 ** 18);
    }

    function test_transferFrom_revertsOnInsufficientAllowance() public {
        vm.prank(deployer);
        token.approve(alice, 50 * 10 ** 18);

        vm.prank(alice);
        vm.expectRevert("Insufficient allowance");
        token.transferFrom(deployer, bob, 100 * 10 ** 18);
    }

    // Edge cases
    function test_transfer_zeroAmount() public {
        vm.prank(deployer);
        bool success = token.transfer(alice, 0);
        assertTrue(success);
        assertEq(token.balanceOf(alice), 0);
    }

    function test_transfer_toSelf() public {
        uint256 balanceBefore = token.balanceOf(deployer);
        vm.prank(deployer);
        token.transfer(deployer, 100 * 10 ** 18);
        assertEq(token.balanceOf(deployer), balanceBefore);
    }

    function test_approve_overwritesPreviousAllowance() public {
        vm.prank(deployer);
        token.approve(alice, 500 * 10 ** 18);
        vm.prank(deployer);
        token.approve(alice, 100 * 10 ** 18);
        assertEq(token.allowance(deployer, alice), 100 * 10 ** 18);
    }

    // Large supply
    function test_constructor_largeSupply() public {
        vm.prank(deployer);
        SimpleToken bigToken = new SimpleToken("Big", "BIG", 1000000000);
        assertEq(bigToken.totalSupply(), 1000000000 * 10 ** 18);
        assertEq(bigToken.balanceOf(deployer), 1000000000 * 10 ** 18);
    }
}
