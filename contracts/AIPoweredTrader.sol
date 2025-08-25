// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IPangolinRouter.sol";
import "./PriceOracle.sol";

/**
 * @title AIPoweredTrader
 * @dev Smart contract for AI-validated trading on Pangolin DEX
 * Integrates with PriceOracle to validate trades before execution
 */
contract AIPoweredTrader is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Immutable contract references
    IPangolinRouter public immutable pangolinRouter;
    PriceOracle public immutable priceOracle;
    address public immutable WAVAX;
    
    // Trading configuration
    uint256 public constant TRADE_DEADLINE_BUFFER = 20 minutes; // 20 minute deadline buffer
    
    // Custom errors
    error AIPredictionInvalid(uint256 confidence);
    
    // Events
    event TradeExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 aiConfidence,
        uint256 aiPredictedPrice
    );
    
    event EmergencyWithdraw(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );

    /**
     * @dev Constructor
     * @param _pangolinRouter Pangolin Router contract address
     * @param _priceOracle PriceOracle contract address
     */
    constructor(address _pangolinRouter, address _priceOracle) Ownable() {
        require(_pangolinRouter != address(0) && _priceOracle != address(0), "Invalid address");
        
        pangolinRouter = IPangolinRouter(_pangolinRouter);
        priceOracle = PriceOracle(_priceOracle);
        
        address w;
        try IPangolinRouter(_pangolinRouter).WAVAX() returns (address a) { w = a; }
        catch {
            try IPangolinRouter(_pangolinRouter).WETH() returns (address b) { w = b; }
            catch { revert("Router missing WAVAX/WETH"); }
        }
        WAVAX = w;
    }

    /**
     * @dev Trade AVAX for tokens with AI validation
     * @param tokenOut Address of token to receive
     * @param amountOutMin Minimum amount of tokens to receive
     * @param deadline Trade deadline
     */
    function tradeExactAVAXForTokens(
        address tokenOut,
        uint256 amountOutMin,
        uint256 deadline
    ) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Must send AVAX");
        require(tokenOut != address(0), "Invalid token address");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(deadline <= block.timestamp + TRADE_DEADLINE_BUFFER, "Deadline too far");

        // Validate AI prediction
        if (!priceOracle.isPredictionValid()) {
            (, uint256 confidence,,,) = priceOracle.getPrediction();
            revert AIPredictionInvalid(confidence);
        }

        // Get AI prediction data for event
        (uint256 aiPrice, uint256 aiConfidence,,,) = priceOracle.getPrediction();

        // Execute trade on Pangolin
        address[] memory path = new address[](2);
        path[0] = WAVAX; // WAVAX instead of address(0)
        path[1] = tokenOut;

        uint256[] memory amounts = pangolinRouter.swapExactAVAXForTokens{value: msg.value}(
            amountOutMin,
            path,
            msg.sender,
            deadline
        );

        emit TradeExecuted(
            msg.sender,
            address(0), // AVAX
            tokenOut,
            msg.value,
            amounts[1],
            aiConfidence,
            aiPrice
        );
    }

    /**
     * @dev Trade tokens for AVAX with AI validation
     * @param tokenIn Address of token to sell
     * @param amountIn Amount of tokens to sell
     * @param amountOutMin Minimum amount of AVAX to receive
     * @param deadline Trade deadline
     */
    function tradeExactTokensForAVAX(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        require(amountIn > 0, "Amount must be greater than 0");
        require(tokenIn != address(0), "Invalid token address");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(deadline <= block.timestamp + TRADE_DEADLINE_BUFFER, "Deadline too far");

        // Validate AI prediction
        if (!priceOracle.isPredictionValid()) {
            (, uint256 confidence,,,) = priceOracle.getPrediction();
            revert AIPredictionInvalid(confidence);
        }

        // Get AI prediction data for event
        (uint256 aiPrice, uint256 aiConfidence,,,) = priceOracle.getPrediction();

        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router to spend tokens (robust pattern for non-standard tokens)
        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), address(pangolinRouter));
        if (currentAllowance < amountIn) {
            IERC20(tokenIn).safeApprove(address(pangolinRouter), 0);
            IERC20(tokenIn).safeApprove(address(pangolinRouter), amountIn);
        }

        // Execute trade on Pangolin
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = WAVAX; // WAVAX instead of address(0)

        uint256[] memory amounts = pangolinRouter.swapExactTokensForAVAX(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            deadline
        );

        emit TradeExecuted(
            msg.sender,
            tokenIn,
            address(0), // AVAX
            amountIn,
            amounts[1],
            aiConfidence,
            aiPrice
        );
    }

    /**
     * @dev Trade tokens for tokens with AI validation
     * @param tokenIn Address of token to sell
     * @param tokenOut Address of token to receive
     * @param amountIn Amount of tokens to sell
     * @param amountOutMin Minimum amount of tokens to receive
     * @param deadline Trade deadline
     */
    function tradeExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        require(amountIn > 0, "Amount must be greater than 0");
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token address");
        require(tokenIn != tokenOut, "Tokens must be different");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(deadline <= block.timestamp + TRADE_DEADLINE_BUFFER, "Deadline too far");

        // Validate AI prediction
        if (!priceOracle.isPredictionValid()) {
            (, uint256 confidence,,,) = priceOracle.getPrediction();
            revert AIPredictionInvalid(confidence);
        }

        // Get AI prediction data for event
        (uint256 aiPrice, uint256 aiConfidence,,,) = priceOracle.getPrediction();

        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router to spend tokens (robust pattern for non-standard tokens)
        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), address(pangolinRouter));
        if (currentAllowance < amountIn) {
            IERC20(tokenIn).safeApprove(address(pangolinRouter), 0);
            IERC20(tokenIn).safeApprove(address(pangolinRouter), amountIn);
        }

        // Execute trade on Pangolin
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = pangolinRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            deadline
        );

        emit TradeExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amounts[1],
            aiConfidence,
            aiPrice
        );
    }

    /**
     * @dev Emergency withdrawal of tokens (owner only)
     * @param token Token address to withdraw
     * @param recipient Address to receive tokens
     */
    function emergencyWithdraw(address token, address recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        
        uint256 balance;
        if (token == address(0)) {
            // Withdraw AVAX
            balance = address(this).balance;
            (bool success,) = recipient.call{value: balance}("");
            require(success, "AVAX transfer failed");
        } else {
            // Withdraw ERC20 tokens
            balance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransfer(recipient, balance);
        }

        emit EmergencyWithdraw(token, balance, recipient);
    }

    /**x
     * @dev Pause trading (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause trading (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get current AI prediction status
     */
    function getAIPredictionStatus() external view returns (bool isValid, uint256 confidence) {
        isValid = priceOracle.isPredictionValid();
        (, confidence,,,) = priceOracle.getPrediction();
    }

    /**
     * @dev Receive AVAX
     */
    receive() external payable {
        // Allow receiving AVAX for trades
    }
}
