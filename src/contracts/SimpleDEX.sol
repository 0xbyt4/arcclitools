// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SimpleDEX - Basic AMM for Arc Network
/// @notice Deployed via `arc deploy dex`
/// @dev Constant product AMM (x*y=k) with 0.3% swap fee.
///      All pools are Native USDC / ERC-20 pairs.

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}

contract SimpleDEX {
    struct Pool {
        address token;
        uint256 reserveUSDC;
        uint256 reserveToken;
        uint256 totalLP;
    }

    address public owner;
    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    mapping(address => Pool) public pools;
    mapping(address => mapping(address => uint256)) public lpBalances;
    address[] public poolTokens;

    event PoolCreated(address indexed token);
    event LiquidityAdded(address indexed token, address indexed provider, uint256 usdcAmount, uint256 tokenAmount, uint256 lpMinted);
    event LiquidityRemoved(address indexed token, address indexed provider, uint256 usdcAmount, uint256 tokenAmount, uint256 lpBurned);
    event Swap(address indexed token, address indexed user, bool usdcToToken, uint256 amountIn, uint256 amountOut);

    modifier poolExists(address token) {
        require(pools[token].token != address(0), "Pool does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    function createPool(address token) external {
        require(token != address(0), "Invalid token");
        require(pools[token].token == address(0), "Pool already exists");

        pools[token] = Pool({
            token: token,
            reserveUSDC: 0,
            reserveToken: 0,
            totalLP: 0
        });
        poolTokens.push(token);

        emit PoolCreated(token);
    }

    function addLiquidity(address token, uint256 tokenAmount) external payable poolExists(token) {
        require(msg.value > 0 && tokenAmount > 0, "Amounts must be > 0");

        Pool storage pool = pools[token];

        require(IERC20(token).transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        uint256 lpMinted;
        if (pool.totalLP == 0) {
            lpMinted = _sqrt(msg.value * tokenAmount);
            require(lpMinted > 0, "Insufficient initial liquidity");
        } else {
            uint256 lpFromUSDC = (msg.value * pool.totalLP) / pool.reserveUSDC;
            uint256 lpFromToken = (tokenAmount * pool.totalLP) / pool.reserveToken;
            lpMinted = lpFromUSDC < lpFromToken ? lpFromUSDC : lpFromToken;
            require(lpMinted > 0, "Insufficient liquidity minted");
        }

        pool.reserveUSDC += msg.value;
        pool.reserveToken += tokenAmount;
        pool.totalLP += lpMinted;
        lpBalances[token][msg.sender] += lpMinted;

        emit LiquidityAdded(token, msg.sender, msg.value, tokenAmount, lpMinted);
    }

    function removeLiquidity(address token, uint256 lpAmount) external poolExists(token) {
        require(lpAmount > 0, "Amount must be > 0");
        require(lpBalances[token][msg.sender] >= lpAmount, "Insufficient LP balance");

        Pool storage pool = pools[token];

        uint256 usdcAmount = (lpAmount * pool.reserveUSDC) / pool.totalLP;
        uint256 tokenAmount = (lpAmount * pool.reserveToken) / pool.totalLP;

        require(usdcAmount > 0 && tokenAmount > 0, "Insufficient amounts");

        pool.reserveUSDC -= usdcAmount;
        pool.reserveToken -= tokenAmount;
        pool.totalLP -= lpAmount;
        lpBalances[token][msg.sender] -= lpAmount;

        (bool sent, ) = payable(msg.sender).call{value: usdcAmount}("");
        require(sent, "USDC transfer failed");
        require(IERC20(token).transfer(msg.sender, tokenAmount), "Token transfer failed");

        emit LiquidityRemoved(token, msg.sender, usdcAmount, tokenAmount, lpAmount);
    }

    function swapUSDCForToken(address token) external payable poolExists(token) {
        require(msg.value > 0, "Must send USDC");

        Pool storage pool = pools[token];

        uint256 amountOut = _getAmountOut(msg.value, pool.reserveUSDC, pool.reserveToken);
        require(amountOut > 0 && amountOut < pool.reserveToken, "Insufficient liquidity");

        pool.reserveUSDC += msg.value;
        pool.reserveToken -= amountOut;

        require(IERC20(token).transfer(msg.sender, amountOut), "Token transfer failed");

        emit Swap(token, msg.sender, true, msg.value, amountOut);
    }

    function swapTokenForUSDC(address token, uint256 tokenAmount) external poolExists(token) {
        require(tokenAmount > 0, "Must send tokens");

        Pool storage pool = pools[token];

        uint256 amountOut = _getAmountOut(tokenAmount, pool.reserveToken, pool.reserveUSDC);
        require(amountOut > 0 && amountOut < pool.reserveUSDC, "Insufficient liquidity");

        require(IERC20(token).transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        pool.reserveToken += tokenAmount;
        pool.reserveUSDC -= amountOut;

        (bool sent, ) = payable(msg.sender).call{value: amountOut}("");
        require(sent, "USDC transfer failed");

        emit Swap(token, msg.sender, false, tokenAmount, amountOut);
    }

    // View functions

    function getReserves(address token) external view returns (uint256 reserveUSDC, uint256 reserveToken) {
        Pool storage pool = pools[token];
        return (pool.reserveUSDC, pool.reserveToken);
    }

    function getQuote(address token, uint256 amountIn, bool usdcToToken) external view poolExists(token) returns (uint256) {
        Pool storage pool = pools[token];
        if (usdcToToken) {
            return _getAmountOut(amountIn, pool.reserveUSDC, pool.reserveToken);
        } else {
            return _getAmountOut(amountIn, pool.reserveToken, pool.reserveUSDC);
        }
    }

    function getPoolCount() external view returns (uint256) {
        return poolTokens.length;
    }

    function getPoolToken(uint256 index) external view returns (address) {
        return poolTokens[index];
    }

    function getLPBalance(address token, address provider) external view returns (uint256) {
        return lpBalances[token][provider];
    }

    // Internal functions

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        require(reserveIn > 0 && reserveOut > 0, "No reserves");
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * FEE_DENOMINATOR + amountInWithFee;
        return numerator / denominator;
    }

    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
