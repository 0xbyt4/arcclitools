// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/contracts/SimpleNFT.sol";

contract SimpleNFTTest is Test {
    SimpleNFT public nft;
    address public deployer = address(1);
    address public alice = address(2);
    address public bob = address(3);

    function setUp() public {
        vm.prank(deployer);
        nft = new SimpleNFT("TestNFT", "TNFT", "data:image/png;base64,iVBOR", "Test collection", 100);
    }

    // Constructor tests
    function test_constructor_setsName() public view {
        assertEq(nft.name(), "TestNFT");
    }

    function test_constructor_setsSymbol() public view {
        assertEq(nft.symbol(), "TNFT");
    }

    function test_constructor_setsMaxSupply() public view {
        assertEq(nft.maxSupply(), 100);
    }

    function test_constructor_setsOwner() public view {
        assertEq(nft.owner(), deployer);
    }

    function test_constructor_totalSupplyIsZero() public view {
        assertEq(nft.totalSupply(), 0);
    }

    // Mint tests
    function test_mint_success() public {
        vm.prank(deployer);
        nft.mint(alice, 3);
        assertEq(nft.totalSupply(), 3);
        assertEq(nft.balanceOf(alice), 3);
        assertEq(nft.ownerOf(1), alice);
        assertEq(nft.ownerOf(2), alice);
        assertEq(nft.ownerOf(3), alice);
    }

    function test_mint_emitsTransferEvents() public {
        vm.prank(deployer);
        vm.expectEmit(true, true, true, true);
        emit SimpleNFT.Transfer(address(0), alice, 1);
        nft.mint(alice, 1);
    }

    function test_mint_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("Not owner");
        nft.mint(alice, 1);
    }

    function test_mint_revertsIfExceedsMaxSupply() public {
        vm.prank(deployer);
        vm.expectRevert("Exceeds max supply");
        nft.mint(alice, 101);
    }

    function test_mint_multipleBatches() public {
        vm.prank(deployer);
        nft.mint(alice, 50);
        vm.prank(deployer);
        nft.mint(bob, 50);
        assertEq(nft.totalSupply(), 100);
        assertEq(nft.balanceOf(alice), 50);
        assertEq(nft.balanceOf(bob), 50);
    }

    function test_mint_revertsOnExactBoundary() public {
        vm.prank(deployer);
        nft.mint(alice, 100);
        vm.prank(deployer);
        vm.expectRevert("Exceeds max supply");
        nft.mint(alice, 1);
    }

    // TokenURI tests
    function test_tokenURI_returnsDataURI() public {
        vm.prank(deployer);
        nft.mint(alice, 1);
        string memory uri = nft.tokenURI(1);
        // Should start with data:application/json;base64,
        assertTrue(bytes(uri).length > 30);
        // Check prefix
        bytes memory prefix = "data:application/json;base64,";
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(bytes(uri)[i], prefix[i]);
        }
    }

    function test_tokenURI_revertsForNonexistentToken() public {
        vm.expectRevert("Token does not exist");
        nft.tokenURI(999);
    }

    // Transfer tests
    function test_transferFrom_success() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        nft.approve(bob, 1);

        vm.prank(bob);
        nft.transferFrom(alice, bob, 1);
        assertEq(nft.ownerOf(1), bob);
        assertEq(nft.balanceOf(alice), 0);
        assertEq(nft.balanceOf(bob), 1);
    }

    function test_transferFrom_revertsIfNotApproved() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(bob);
        vm.expectRevert("Not authorized");
        nft.transferFrom(alice, bob, 1);
    }

    function test_transferFrom_revertsToZeroAddress() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        vm.expectRevert("Zero address");
        nft.transferFrom(alice, address(0), 1);
    }

    // Approval tests
    function test_approve_setsApproval() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        nft.approve(bob, 1);
        assertEq(nft.getApproved(1), bob);
    }

    function test_approve_clearedOnTransfer() public {
        vm.prank(deployer);
        nft.mint(alice, 1);
        vm.prank(alice);
        nft.approve(bob, 1);
        vm.prank(bob);
        nft.transferFrom(alice, bob, 1);
        assertEq(nft.getApproved(1), address(0));
    }

    function test_setApprovalForAll() public {
        vm.prank(alice);
        nft.setApprovalForAll(bob, true);
        assertTrue(nft.isApprovedForAll(alice, bob));
    }

    function test_approvalForAll_allowsTransfer() public {
        vm.prank(deployer);
        nft.mint(alice, 1);
        vm.prank(alice);
        nft.setApprovalForAll(bob, true);

        vm.prank(bob);
        nft.transferFrom(alice, bob, 1);
        assertEq(nft.ownerOf(1), bob);
    }

    // ERC-165 supportsInterface
    function test_supportsInterface_ERC721() public view {
        assertTrue(nft.supportsInterface(0x80ac58cd));
    }

    function test_supportsInterface_ERC721Metadata() public view {
        assertTrue(nft.supportsInterface(0x5b5e139f));
    }

    function test_supportsInterface_ERC165() public view {
        assertTrue(nft.supportsInterface(0x01ffc9a7));
    }

    function test_supportsInterface_unknownReturnsFalse() public view {
        assertFalse(nft.supportsInterface(0xdeadbeef));
    }

    // Edge cases
    function test_balanceOf_revertsForZeroAddress() public {
        vm.expectRevert("Zero address");
        nft.balanceOf(address(0));
    }

    function test_ownerOf_revertsForNonexistentToken() public {
        vm.expectRevert("Token does not exist");
        nft.ownerOf(999);
    }

    function test_getApproved_revertsForNonexistentToken() public {
        vm.expectRevert("Token does not exist");
        nft.getApproved(999);
    }

    // safeTransferFrom tests
    function test_safeTransferFrom_success() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        nft.safeTransferFrom(alice, bob, 1);
        assertEq(nft.ownerOf(1), bob);
    }

    function test_safeTransferFrom_withData() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        nft.safeTransferFrom(alice, bob, 1, "test data");
        assertEq(nft.ownerOf(1), bob);
    }

    // Approve by operator (not just token owner)
    function test_approve_byOperator() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        nft.setApprovalForAll(bob, true);

        // Bob as operator can approve on behalf of alice
        vm.prank(bob);
        nft.approve(deployer, 1);
        assertEq(nft.getApproved(1), deployer);
    }

    function test_approve_revertsIfNotAuthorized() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        // Bob is not owner or operator
        vm.prank(bob);
        vm.expectRevert("Not authorized");
        nft.approve(deployer, 1);
    }

    // setApprovalForAll revoke
    function test_setApprovalForAll_revoke() public {
        vm.prank(alice);
        nft.setApprovalForAll(bob, true);
        assertTrue(nft.isApprovedForAll(alice, bob));

        vm.prank(alice);
        nft.setApprovalForAll(bob, false);
        assertFalse(nft.isApprovedForAll(alice, bob));
    }

    function test_setApprovalForAll_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit SimpleNFT.ApprovalForAll(alice, bob, true);
        nft.setApprovalForAll(bob, true);
    }

    // isApprovedForAll returns false initially
    function test_isApprovedForAll_defaultFalse() public view {
        assertFalse(nft.isApprovedForAll(alice, bob));
    }

    // Transfer emits event
    function test_transferFrom_emitsTransferEvent() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit SimpleNFT.Transfer(alice, bob, 1);
        nft.transferFrom(alice, bob, 1);
    }

    // transferFrom reverts if wrong from
    function test_transferFrom_revertsIfNotTokenOwner() public {
        vm.prank(deployer);
        nft.mint(alice, 2);

        // alice owns token 1 and 2, try transferFrom(bob, ...) when bob doesn't own it
        vm.prank(alice);
        vm.expectRevert("Not token owner");
        nft.transferFrom(bob, alice, 1);
    }

    // Operator can transfer
    function test_transferFrom_byOperator() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        nft.setApprovalForAll(bob, true);

        vm.prank(bob);
        nft.transferFrom(alice, deployer, 1);
        assertEq(nft.ownerOf(1), deployer);
    }

    // Mint updates balance correctly for multiple mints
    function test_mint_tokenIdsAreSequential() public {
        vm.prank(deployer);
        nft.mint(alice, 3);
        assertEq(nft.ownerOf(1), alice);
        assertEq(nft.ownerOf(2), alice);
        assertEq(nft.ownerOf(3), alice);

        vm.prank(deployer);
        nft.mint(bob, 2);
        assertEq(nft.ownerOf(4), bob);
        assertEq(nft.ownerOf(5), bob);
        assertEq(nft.totalSupply(), 5);
    }

    // Approve emits event
    function test_approve_emitsEvent() public {
        vm.prank(deployer);
        nft.mint(alice, 1);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit SimpleNFT.Approval(alice, bob, 1);
        nft.approve(bob, 1);
    }
}
