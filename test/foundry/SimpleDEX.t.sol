// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/contracts/SimpleDEX.sol";
import "../../src/contracts/SimpleToken.sol";

contract SimpleDEXTest is Test {
    SimpleDEX public dex;
    SimpleToken public token;
    address public deployer = address(1);
    address public alice = address(2);
    address public bob = address(3);

    function setUp() public {
        vm.startPrank(deployer);
        dex = new SimpleDEX();
        token = new SimpleToken("TestToken", "TT", 1000000);
        vm.stopPrank();

        // Give alice and bob some tokens
        vm.prank(deployer);
        token.transfer(alice, 100000 * 10 ** 18);
        vm.prank(deployer);
        token.transfer(bob, 100000 * 10 ** 18);

        // Give everyone native USDC
        vm.deal(deployer, 10000 ether);
        vm.deal(alice, 10000 ether);
        vm.deal(bob, 10000 ether);
    }

    // Pool creation
    function test_createPool_success() public {
        vm.prank(deployer);
        dex.createPool(address(token));
        assertEq(dex.getPoolCount(), 1);
        assertEq(dex.getPoolToken(0), address(token));
    }

    function test_createPool_emitsEvent() public {
        vm.prank(deployer);
        vm.expectEmit(true, false, false, false);
        emit SimpleDEX.PoolCreated(address(token));
        dex.createPool(address(token));
    }

    function test_createPool_revertsIfDuplicate() public {
        vm.prank(deployer);
        dex.createPool(address(token));
        vm.prank(deployer);
        vm.expectRevert("Pool already exists");
        dex.createPool(address(token));
    }

    function test_createPool_revertsForZeroAddress() public {
        vm.prank(deployer);
        vm.expectRevert("Invalid token");
        dex.createPool(address(0));
    }

    // Add liquidity
    function test_addLiquidity_firstProvider() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        (uint256 reserveUSDC, uint256 reserveToken) = dex.getReserves(address(token));
        assertEq(reserveUSDC, 1000 ether);
        assertEq(reserveToken, 10000 * 10 ** 18);

        uint256 lp = dex.getLPBalance(address(token), deployer);
        assertGt(lp, 0);
    }

    function test_addLiquidity_emitsEvent() public {
        vm.prank(deployer);
        dex.createPool(address(token));

        vm.startPrank(deployer);
        token.approve(address(dex), 10000 * 10 ** 18);

        vm.expectEmit(true, true, false, false);
        emit SimpleDEX.LiquidityAdded(address(token), deployer, 0, 0, 0);
        dex.addLiquidity{value: 1000 ether}(address(token), 10000 * 10 ** 18);
        vm.stopPrank();
    }

    function test_addLiquidity_revertsIfPoolDoesNotExist() public {
        vm.prank(deployer);
        vm.expectRevert("Pool does not exist");
        dex.addLiquidity{value: 100 ether}(address(token), 1000);
    }

    function test_addLiquidity_revertsIfZeroUSDC() public {
        vm.prank(deployer);
        dex.createPool(address(token));

        vm.prank(deployer);
        vm.expectRevert("Amounts must be > 0");
        dex.addLiquidity{value: 0}(address(token), 1000);
    }

    function test_addLiquidity_revertsIfZeroTokens() public {
        vm.prank(deployer);
        dex.createPool(address(token));

        vm.prank(deployer);
        vm.expectRevert("Amounts must be > 0");
        dex.addLiquidity{value: 100 ether}(address(token), 0);
    }

    // Swap USDC -> Token
    function test_swapUSDCForToken_success() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        uint256 aliceTokenBefore = token.balanceOf(alice);

        vm.prank(alice);
        dex.swapUSDCForToken{value: 100 ether}(address(token));

        uint256 aliceTokenAfter = token.balanceOf(alice);
        assertGt(aliceTokenAfter, aliceTokenBefore);

        // Check reserves changed
        (uint256 reserveUSDC, uint256 reserveToken) = dex.getReserves(address(token));
        assertEq(reserveUSDC, 1100 ether);
        assertLt(reserveToken, 10000 * 10 ** 18);
    }

    function test_swapUSDCForToken_emitsEvent() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        vm.prank(alice);
        vm.expectEmit(true, true, false, false);
        emit SimpleDEX.Swap(address(token), alice, true, 0, 0);
        dex.swapUSDCForToken{value: 100 ether}(address(token));
    }

    function test_swapUSDCForToken_revertsIfPoolDoesNotExist() public {
        vm.prank(alice);
        vm.expectRevert("Pool does not exist");
        dex.swapUSDCForToken{value: 100 ether}(address(token));
    }

    function test_swapUSDCForToken_revertsIfZeroValue() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        vm.prank(alice);
        vm.expectRevert("Must send USDC");
        dex.swapUSDCForToken{value: 0}(address(token));
    }

    // Swap Token -> USDC
    function test_swapTokenForUSDC_success() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        uint256 aliceUSDCBefore = alice.balance;

        vm.startPrank(alice);
        token.approve(address(dex), 1000 * 10 ** 18);
        dex.swapTokenForUSDC(address(token), 1000 * 10 ** 18);
        vm.stopPrank();

        uint256 aliceUSDCAfter = alice.balance;
        assertGt(aliceUSDCAfter, aliceUSDCBefore);
    }

    function test_swapTokenForUSDC_revertsIfZeroAmount() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        vm.prank(alice);
        vm.expectRevert("Must send tokens");
        dex.swapTokenForUSDC(address(token), 0);
    }

    // Remove liquidity
    function test_removeLiquidity_success() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        uint256 lp = dex.getLPBalance(address(token), deployer);
        uint256 deployerUSDCBefore = deployer.balance;
        uint256 deployerTokenBefore = token.balanceOf(deployer);

        vm.prank(deployer);
        dex.removeLiquidity(address(token), lp);

        assertGt(deployer.balance, deployerUSDCBefore);
        assertGt(token.balanceOf(deployer), deployerTokenBefore);
        assertEq(dex.getLPBalance(address(token), deployer), 0);
    }

    function test_removeLiquidity_revertsIfInsufficientLP() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        vm.prank(alice);
        vm.expectRevert("Insufficient LP balance");
        dex.removeLiquidity(address(token), 1);
    }

    function test_removeLiquidity_revertsIfZeroAmount() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        vm.prank(deployer);
        vm.expectRevert("Amount must be > 0");
        dex.removeLiquidity(address(token), 0);
    }

    // Quote
    function test_getQuote_usdcToToken() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        uint256 quote = dex.getQuote(address(token), 100 ether, true);
        assertGt(quote, 0);
        // With 0.3% fee, 100 USDC into 1000:10000 pool should give < 1000 tokens
        assertLt(quote, 1000 * 10 ** 18);
    }

    function test_getQuote_tokenToUSDC() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        uint256 quote = dex.getQuote(address(token), 1000 * 10 ** 18, false);
        assertGt(quote, 0);
        assertLt(quote, 100 ether);
    }

    function test_getQuote_revertsForNonexistentPool() public {
        vm.expectRevert("Pool does not exist");
        dex.getQuote(address(token), 100 ether, true);
    }

    // Constant product invariant
    function test_swap_maintainsOrIncreasesK() public {
        _createPoolAndAddLiquidity(deployer, 1000 ether, 10000 * 10 ** 18);

        (uint256 r0Before, uint256 r1Before) = dex.getReserves(address(token));
        uint256 kBefore = r0Before * r1Before;

        vm.prank(alice);
        dex.swapUSDCForToken{value: 50 ether}(address(token));

        (uint256 r0After, uint256 r1After) = dex.getReserves(address(token));
        uint256 kAfter = r0After * r1After;

        // K should increase due to fees
        assertGe(kAfter, kBefore);
    }

    // Fee calculation
    function test_fee_constants() public view {
        assertEq(dex.FEE_NUMERATOR(), 997);
        assertEq(dex.FEE_DENOMINATOR(), 1000);
    }

    // Multiple pools
    function test_multiplePoolsIndependent() public {
        vm.prank(deployer);
        SimpleToken token2 = new SimpleToken("Token2", "T2", 1000000);
        vm.prank(deployer);
        token2.transfer(alice, 50000 * 10 ** 18);

        vm.prank(deployer);
        dex.createPool(address(token));
        vm.prank(deployer);
        dex.createPool(address(token2));

        assertEq(dex.getPoolCount(), 2);

        vm.startPrank(deployer);
        token.approve(address(dex), 5000 * 10 ** 18);
        dex.addLiquidity{value: 500 ether}(address(token), 5000 * 10 ** 18);
        token2.approve(address(dex), 2000 * 10 ** 18);
        dex.addLiquidity{value: 200 ether}(address(token2), 2000 * 10 ** 18);
        vm.stopPrank();

        (uint256 r1a,) = dex.getReserves(address(token));
        (uint256 r2a,) = dex.getReserves(address(token2));
        assertEq(r1a, 500 ether);
        assertEq(r2a, 200 ether);
    }

    // Helper
    function _createPoolAndAddLiquidity(address provider, uint256 usdcAmount, uint256 tokenAmount) internal {
        vm.prank(provider);
        dex.createPool(address(token));

        vm.startPrank(provider);
        token.approve(address(dex), tokenAmount);
        dex.addLiquidity{value: usdcAmount}(address(token), tokenAmount);
        vm.stopPrank();
    }
}
