/**
 * Risk Management Utilities
 * Comprehensive risk management functions for AI trading system
 */

import { RiskParameters, PositionSizeResult, RiskAssessment, MarketConditions } from '@/shared/types';

/**
 * Calculate volatility from price history
 * @param prices - Array of price values
 * @returns Volatility as a percentage
 */
export const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  
  // Calculate price returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const return_ = (prices[i] - prices[i - 1]) / prices[i - 1];
    returns.push(return_);
  }
  
  // Calculate volatility (standard deviation of returns)
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365 * 24 * 60); // Annualized
  
  return volatility * 100; // Convert to percentage
};

/**
 * Calculate Kelly Criterion position sizing
 * @param winRate - Historical win rate (0-1)
 * @param avgWin - Average winning trade percentage
 * @param avgLoss - Average losing trade percentage
 * @returns Recommended position size as percentage of portfolio
 */
export const calculateKellyPosition = (
  winRate: number,
  avgWin: number,
  avgLoss: number
): number => {
  if (avgLoss === 0) return 0;
  
  const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
  
  // Cap at 25% of portfolio for safety
  return Math.max(0, Math.min(0.25, kellyFraction));
};

/**
 * Calculate Value at Risk (VaR)
 * @param portfolioValue - Total portfolio value
 * @param positions - Array of position values and volatilities
 * @param confidence - Confidence level (0.95 for 95% VaR)
 * @returns VaR value
 */
export const calculateVaR = (
  portfolioValue: number,
  positions: Array<{ value: number; volatility: number }>,
  confidence: number = 0.95
): number => {
  if (positions.length === 0) return 0;
  
  // Calculate portfolio volatility
  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  const weights = positions.map(pos => pos.value / totalValue);
  
  // Simplified VaR calculation (assuming normal distribution)
  const portfolioVolatility = Math.sqrt(
    weights.reduce((sum, weight, i) => {
      return sum + Math.pow(weight * positions[i].volatility, 2);
    }, 0)
  );
  
  // Z-score for confidence level (1.645 for 95% confidence)
  const zScore = confidence === 0.95 ? 1.645 : confidence === 0.99 ? 2.326 : 1.96;
  
  return portfolioValue * portfolioVolatility * zScore;
};

/**
 * Assess market volatility from price history
 * @param priceHistory - Array of price data points
 * @returns Volatility metrics
 */
export const assessMarketVolatility = (priceHistory: Array<{ price: number; timestamp: number }>): {
  volatility: number;
  volatilityRank: 'low' | 'medium' | 'high';
  trend: 'bullish' | 'bearish' | 'neutral';
} => {
  if (priceHistory.length < 2) {
    return { volatility: 0, volatilityRank: 'low', trend: 'neutral' };
  }
  
  // Calculate price returns
  const returns: number[] = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const return_ = (priceHistory[i].price - priceHistory[i - 1].price) / priceHistory[i - 1].price;
    returns.push(return_);
  }
  
  // Calculate volatility (standard deviation of returns)
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365 * 24 * 60); // Annualized
  
  // Determine volatility rank
  let volatilityRank: 'low' | 'medium' | 'high';
  if (volatility < 0.3) volatilityRank = 'low';
  else if (volatility < 0.6) volatilityRank = 'medium';
  else volatilityRank = 'high';
  
  // Determine trend
  const recentPrices = priceHistory.slice(-10);
  const firstPrice = recentPrices[0]?.price || 0;
  const lastPrice = recentPrices[recentPrices.length - 1]?.price || 0;
  const priceChange = (lastPrice - firstPrice) / firstPrice;
  
  let trend: 'bullish' | 'bearish' | 'neutral';
  if (priceChange > 0.02) trend = 'bullish';
  else if (priceChange < -0.02) trend = 'bearish';
  else trend = 'neutral';
  
  return { volatility, volatilityRank, trend };
};

/**
 * Calculate optimal stop loss level
 * @param entryPrice - Entry price of the position
 * @param volatility - Market volatility
 * @param riskTolerance - Risk tolerance (0-1)
 * @returns Optimal stop loss percentage
 */
export const calculateOptimalStopLoss = (
  entryPrice: number,
  volatility: number,
  riskTolerance: number
): number => {
  // Base stop loss on volatility
  const volatilityBasedStop = volatility * 2; // 2x volatility
  
  // Adjust for risk tolerance
  const riskAdjustedStop = volatilityBasedStop * (1 + (1 - riskTolerance));
  
  // Ensure stop loss is within reasonable bounds (2% to 15%)
  return Math.max(2, Math.min(15, riskAdjustedStop));
};

/**
 * Validate risk limits before trade execution
 * @param tradeAmount - Amount to trade
 * @param portfolioValue - Total portfolio value
 * @param maxRiskPerTrade - Maximum risk per trade (percentage)
 * @param totalExposure - Current total exposure
 * @returns Validation result
 */
export const validateRiskLimits = (
  tradeAmount: number,
  portfolioValue: number,
  maxRiskPerTrade: number,
  totalExposure: number
): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check trade size vs portfolio
  const tradePercentage = (tradeAmount / portfolioValue) * 100;
  if (tradePercentage > maxRiskPerTrade) {
    errors.push(`Trade size (${tradePercentage.toFixed(2)}%) exceeds maximum risk per trade (${maxRiskPerTrade}%)`);
  }
  
  // Check total exposure
  const newTotalExposure = totalExposure + tradeAmount;
  const exposurePercentage = (newTotalExposure / portfolioValue) * 100;
  if (exposurePercentage > 50) {
    errors.push(`Total exposure (${exposurePercentage.toFixed(2)}%) exceeds 50% limit`);
  } else if (exposurePercentage > 30) {
    warnings.push(`High total exposure: ${exposurePercentage.toFixed(2)}%`);
  }
  
  // Check minimum trade size
  if (tradeAmount < portfolioValue * 0.01) {
    warnings.push('Trade size is very small (< 1% of portfolio)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Calculate position size based on AI confidence
 * @param aiConfidence - AI prediction confidence (0-1)
 * @param basePosition - Base position size
 * @param maxPosition - Maximum position size
 * @param minPosition - Minimum position size
 * @returns Position size result
 */
export const calculatePositionSizeWithAI = (
  aiConfidence: number,
  basePosition: number,
  maxPosition: number,
  minPosition: number
): PositionSizeResult => {
  // Adjust position size based on AI confidence
  const confidenceMultiplier = Math.min(aiConfidence * 1.5, 1.5);
  const riskAdjustedSize = basePosition * confidenceMultiplier;
  
  // Apply bounds
  const recommendedSize = Math.max(minPosition, Math.min(maxPosition, riskAdjustedSize));
  
  return {
    recommendedSize,
    maxSize: maxPosition,
    riskAdjustedSize,
    reasoning: `AI Confidence: ${(aiConfidence * 100).toFixed(1)}%, Base: $${basePosition.toFixed(2)}`,
    confidence: aiConfidence
  };
};

/**
 * Get recommended slippage based on market conditions
 * @param marketConditions - Current market conditions
 * @param tradeSize - Size of the trade
 * @param liquidity - Market liquidity
 * @returns Recommended slippage percentage
 */
export const getRecommendedSlippage = (
  marketConditions: MarketConditions,
  tradeSize: number,
  liquidity: number
): number => {
  let baseSlippage = 0.5; // Base 0.5%
  
  // Adjust for volatility
  if (marketConditions.volatility > 0.5) {
    baseSlippage += 0.5;
  } else if (marketConditions.volatility > 0.3) {
    baseSlippage += 0.2;
  }
  
  // Adjust for trade size vs liquidity
  const sizeToLiquidityRatio = tradeSize / liquidity;
  if (sizeToLiquidityRatio > 0.1) {
    baseSlippage += 1.0;
  } else if (sizeToLiquidityRatio > 0.05) {
    baseSlippage += 0.5;
  }
  
  // Adjust for market trend
  if (marketConditions.trend === 'bullish') {
    baseSlippage += 0.1; // Slightly higher for buys in bullish market
  }
  
  // Ensure slippage is within reasonable bounds
  return Math.max(0.1, Math.min(5, baseSlippage));
};

/**
 * Calculate expected return for a trade
 * @param aiPrediction - AI price prediction
 * @param currentPrice - Current market price
 * @param confidence - AI confidence level
 * @returns Expected return analysis
 */
export const calculateExpectedReturn = (
  aiPrediction: number,
  currentPrice: number,
  confidence: number
): {
  expectedReturn: number;
  probability: number;
  riskRewardRatio: number;
} => {
  const priceChange = (aiPrediction - currentPrice) / currentPrice;
  const expectedReturn = priceChange * confidence;
  const probability = confidence;
  
  // Calculate risk-reward ratio (simplified)
  const riskRewardRatio = Math.abs(expectedReturn) / (1 - confidence);
  
  return {
    expectedReturn,
    probability,
    riskRewardRatio
  };
};

/**
 * Analyze portfolio correlation
 * @param positions - Array of position data
 * @returns Correlation analysis
 */
export const analyzePortfolioCorrelation = (
  positions: Array<{ symbol: string; value: number; returns: number[] }>
): {
  correlation: number;
  diversification: number;
  recommendations: string[];
} => {
  if (positions.length < 2) {
    return {
      correlation: 0,
      diversification: 1,
      recommendations: ['Add more positions for better diversification']
    };
  }
  
  // Calculate average correlation (simplified)
  let totalCorrelation = 0;
  let correlationCount = 0;
  
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      // Simplified correlation calculation
      const correlation = Math.random() * 0.8 + 0.2; // Placeholder
      totalCorrelation += correlation;
      correlationCount++;
    }
  }
  
  const avgCorrelation = totalCorrelation / correlationCount;
  const diversification = 1 - avgCorrelation;
  
  const recommendations: string[] = [];
  if (avgCorrelation > 0.7) {
    recommendations.push('High correlation detected - consider diversifying');
  }
  if (positions.length < 5) {
    recommendations.push('Consider adding more positions for better diversification');
  }
  
  return {
    correlation: avgCorrelation,
    diversification,
    recommendations
  };
};

/**
 * Calculate Sharpe ratio for portfolio performance
 * @param returns - Array of portfolio returns
 * @param riskFreeRate - Risk-free rate (default 0.02 for 2%)
 * @returns Sharpe ratio
 */
export const calculateSharpeRatio = (
  returns: number[],
  riskFreeRate: number = 0.02
): number => {
  if (returns.length === 0) return 0;
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  return (meanReturn - riskFreeRate) / stdDev;
};

/**
 * Calculate maximum drawdown
 * @param portfolioValues - Array of portfolio values over time
 * @returns Maximum drawdown percentage
 */
export const calculateMaxDrawdown = (portfolioValues: number[]): number => {
  if (portfolioValues.length === 0) return 0;
  
  let maxDrawdown = 0;
  let peak = portfolioValues[0];
  
  for (const value of portfolioValues) {
    if (value > peak) {
      peak = value;
    }
    
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown * 100; // Convert to percentage
};

/**
 * Comprehensive risk assessment
 * @param portfolio - Portfolio data
 * @param positions - Current positions
 * @param marketConditions - Market conditions
 * @returns Complete risk assessment
 */
export const performRiskAssessment = (
  portfolio: {
    value: number;
    positions: Array<{ symbol: string; value: number; volatility: number }>;
    returns: number[];
  },
  marketConditions: MarketConditions
): RiskAssessment => {
  const portfolioVaR = calculateVaR(portfolio.value, portfolio.positions);
  const maxLoss = portfolio.value * 0.1; // Assume 10% max loss
  const sharpeRatio = calculateSharpeRatio(portfolio.returns);
  const maxDrawdown = calculateMaxDrawdown(portfolio.returns.map((_, i) => 
    portfolio.value * (1 + portfolio.returns.slice(0, i + 1).reduce((sum, r) => sum + r, 0))
  ));
  
  const correlation = analyzePortfolioCorrelation(
    portfolio.positions.map(pos => ({
      symbol: pos.symbol,
      value: pos.value,
      returns: [] // Would need historical returns for each position
    }))
  );
  
  const totalRisk = (portfolioVaR / portfolio.value) * 100;
  
  const recommendations: string[] = [];
  if (totalRisk > 5) {
    recommendations.push('Portfolio risk is high - consider reducing position sizes');
  }
  if (sharpeRatio < 1) {
    recommendations.push('Low risk-adjusted returns - review trading strategy');
  }
  if (maxDrawdown > 20) {
    recommendations.push('High maximum drawdown - implement stricter risk controls');
  }
  if (marketConditions.volatility > 0.5) {
    recommendations.push('High market volatility - consider reducing exposure');
  }
  
  return {
    totalRisk,
    portfolioVaR,
    maxLoss,
    sharpeRatio,
    volatility: marketConditions.volatility,
    correlation: correlation.correlation,
    recommendations: [...recommendations, ...correlation.recommendations]
  };
};

