// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "../interfaces/IPangolinRouter.sol";

contract MockPangolinRouter is IPangolinRouter {
  address private _wrapped;
  
  constructor(address wrapped) { 
    _wrapped = wrapped; 
  }
  
  function WAVAX() external view returns (address) { 
    return _wrapped; 
  }
  
  function WETH() external view returns (address) { 
    return _wrapped; 
  }
  
  function swapExactAVAXForTokens(
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable returns (uint256[] memory amounts) {
    amounts = new uint256[](path.length);
    amounts[0] = msg.value; 
    amounts[1] = msg.value; // echo
    (bool s,) = to.call{value: msg.value}(""); 
    require(s, "send fail");
  }
  
  function swapExactTokensForAVAX(
    uint256 amountIn,
    uint256,
    address[] calldata,
    address to,
    uint256
  ) external returns (uint256[] memory amounts) {
    amounts = new uint256[](2); 
    amounts[0] = amountIn; 
    amounts[1] = amountIn;
    (bool s,) = to.call{value: amountIn}(""); 
    require(s, "send fail");
  }
  
  function swapExactTokensForTokens(
    uint256 amountIn,
    uint256,
    address[] calldata path,
    address to,
    uint256
  ) external returns (uint256[] memory amounts) {
    amounts = new uint256[](path.length); 
    amounts[0] = amountIn; 
    amounts[1] = amountIn; 
    to; // noop
  }
  
  function getAmountsOut(
    uint256 amountIn,
    address[] calldata path
  ) external pure returns (uint256[] memory amounts) {
    amounts = new uint256[](path.length); 
    amounts[0] = amountIn; 
    amounts[1] = amountIn;
  }
  
  function getAmountsIn(
    uint256 amountOut,
    address[] calldata path
  ) external pure returns (uint256[] memory amounts) {
    amounts = new uint256[](path.length); 
    amounts[0] = amountOut; 
    amounts[1] = amountOut;
  }
}
