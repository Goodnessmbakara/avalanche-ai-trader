import { 
  PortfolioMetrics, 
  RiskMetrics, 
  PortfolioHistoryEntry, 
  Trade, 
  MarketData,
  PerformanceAttribution,
  OptimizationResult,
  Benchmark
} from '../shared/types';
import { 
  calculateSharpeRatio, 
  calculateMaxDrawdown, 
  calculateVaR,
  calculateVolatility 
} from './riskManagement';

/**
 * Calculate Value at Risk (VaR) from historical returns using percentile method
 * @param returns - Array of historical returns
 * @param confidence - Confidence level (0.95 for 95% VaR)
 * @returns VaR value as a percentage
 */
export function calculateVaRFromReturns(returns: number[], confidence = 0.95): number {
  if (returns.length === 0) return 0;
  
  // Sort returns in ascending order
  const sortedReturns = [...returns].sort((a, b) => a - b);
  
  // Calculate the percentile index
  const percentileIndex = Math.floor((1 - confidence) * sortedReturns.length);
  
  // Return the VaR (negative of the percentile return)
  return -sortedReturns[percentileIndex];
}

/**
 * Calculate portfolio returns over different time periods
 */
export function calculatePortfolioReturns(
  portfolioHistory: PortfolioHistoryEntry[],
  period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL' = 'ALL'
): number {
  if (portfolioHistory.length < 2) return 0;
  
  const now = Date.now();
  let startTime: number;
  
  switch (period) {
    case '1D':
      startTime = now - 24 * 60 * 60 * 1000;
      break;
    case '1W':
      startTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '1M':
      startTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case '3M':
      startTime = now - 90 * 24 * 60 * 60 * 1000;
      break;
    case '1Y':
      startTime = now - 365 * 24 * 60 * 60 * 1000;
      break;
    case 'ALL':
      return (portfolioHistory[portfolioHistory.length - 1].totalValue - portfolioHistory[0].totalValue) / portfolioHistory[0].totalValue;
  }
  
  const startEntry = portfolioHistory.find(entry => entry.timestamp >= startTime);
  const endEntry = portfolioHistory[portfolioHistory.length - 1];
  
  if (!startEntry || !endEntry) return 0;
  
  return (endEntry.totalValue - startEntry.totalValue) / startEntry.totalValue;
}

/**
 * Calculate rolling metrics over a specified window
 */
export function calculateRollingMetrics(
  data: number[],
  window: number
): {
  rollingSharpe: number[];
  rollingVolatility: number[];
  rollingReturns: number[];
} {
  const rollingSharpe: number[] = [];
  const rollingVolatility: number[] = [];
  const rollingReturns: number[] = [];
  
  for (let i = window; i < data.length; i++) {
    const windowData = data.slice(i - window, i);
    const returns = windowData.map((value, index) => {
      if (index === 0) return 0;
      return (value - windowData[index - 1]) / windowData[index - 1];
    }).slice(1);
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = calculateVolatility(returns);
    const sharpe = volatility > 0 ? (avgReturn - 0.02) / volatility : 0; // 2% risk-free rate
    
    rollingReturns.push(avgReturn);
    rollingVolatility.push(volatility);
    rollingSharpe.push(sharpe);
  }
  
  return { rollingSharpe, rollingVolatility, rollingReturns };
}

/**
 * Calculate performance attribution analysis
 */
export function calculatePerformanceAttribution(
  trades: Trade[],
  marketData: MarketData[]
): PerformanceAttribution {
  // Calculate total portfolio return
  const totalReturn = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  
  // Calculate benchmark return (simplified - using market data)
  const benchmarkReturn = marketData.length > 1 
    ? (marketData[marketData.length - 1].close - marketData[0].close) / marketData[0].close
    : 0;
  
  // Calculate asset allocation effect (simplified)
  const assetAllocation = totalReturn * 0.3; // Assume 30% of return from allocation
  
  // Calculate stock selection effect
  const stockSelection = totalReturn * 0.5; // Assume 50% of return from selection
  
  // Calculate interaction effect
  const interaction = totalReturn - assetAllocation - stockSelection;
  
  return {
    totalReturn,
    assetAllocation,
    stockSelection,
    interaction,
    benchmarkReturn
  };
}

/**
 * Calculate benchmark comparison metrics
 */
export function calculateBenchmarkComparison(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): {
  excessReturn: number;
  trackingError: number;
  informationRatio: number;
  correlation: number;
  beta: number;
} {
  if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) {
    return {
      excessReturn: 0,
      trackingError: 0,
      informationRatio: 0,
      correlation: 0,
      beta: 0
    };
  }
  
  // Calculate excess returns
  const excessReturns = portfolioReturns.map((pReturn, i) => pReturn - benchmarkReturns[i]);
  const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
  
  // Calculate tracking error
  const trackingError = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcessReturn, 2), 0) / excessReturns.length
  );
  
  // Calculate information ratio
  const informationRatio = trackingError > 0 ? avgExcessReturn / trackingError : 0;
  
  // Calculate correlation
  const correlation = calculateCorrelation(portfolioReturns, benchmarkReturns);
  
  // Calculate beta
  const beta = calculateBeta(portfolioReturns, benchmarkReturns);
  
  return {
    excessReturn: avgExcessReturn,
    trackingError,
    informationRatio,
    correlation,
    beta
  };
}

/**
 * Calculate risk-adjusted returns
 */
export function calculateRiskAdjustedReturns(
  returns: number[],
  riskFreeRate: number = 0.02
): {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  treynorRatio: number;
} {
  if (returns.length === 0) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      treynorRatio: 0
    };
  }
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const volatility = calculateVolatility(returns);
  
  // Sharpe ratio
  const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
  
  // Sortino ratio (using downside deviation)
  const downsideReturns = returns.filter(r => r < avgReturn);
  const downsideDeviation = downsideReturns.length > 0 
    ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / downsideReturns.length)
    : 0;
  const sortinoRatio = downsideDeviation > 0 ? (avgReturn - riskFreeRate) / downsideDeviation : 0;
  
  // Calmar ratio (return / max drawdown)
  const equity = returns.reduce<number[]>((acc, r) => {
    const last = acc.at(-1) ?? 1;
    acc.push(last * (1 + r));
    return acc;
  }, []);
  const maxDD = calculateMaxDrawdown(equity) / 100;
  const calmarRatio = maxDD > 0 ? (avgReturn - riskFreeRate) / maxDD : 0;
  
  // Treynor ratio (return / beta)
  const beta = 1; // Simplified - assume beta of 1
  const treynorRatio = beta > 0 ? (avgReturn - riskFreeRate) / beta : 0;
  
  return {
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    treynorRatio
  };
}

/**
 * Portfolio optimization using mean-variance optimization
 */
export function optimizeAllocation(
  expectedReturns: Record<string, number>,
  covariance: Record<string, Record<string, number>>,
  constraints: {
    minWeight?: number;
    maxWeight?: number;
    targetReturn?: number;
    maxRisk?: number;
  } = {}
): OptimizationResult {
  const assets = Object.keys(expectedReturns);
  const n = assets.length;
  
  // Simplified optimization - equal weight allocation
  // In a real implementation, this would use quadratic programming
  const equalWeight = 1 / n;
  const optimalWeights: Record<string, number> = {};
  
  assets.forEach(asset => {
    optimalWeights[asset] = equalWeight;
  });
  
  // Calculate expected return and risk
  const expectedReturn = assets.reduce((sum, asset) => 
    sum + optimalWeights[asset] * expectedReturns[asset], 0
  );
  
  const expectedRisk = Math.sqrt(
    assets.reduce((sum, asset1) => 
      sum + assets.reduce((innerSum, asset2) => 
        innerSum + optimalWeights[asset1] * optimalWeights[asset2] * (covariance[asset1]?.[asset2] || 0), 0
      ), 0
    )
  );
  
  const sharpeRatio = expectedRisk > 0 ? expectedReturn / expectedRisk : 0;
  
  // Generate efficient frontier (simplified)
  const efficientFrontier = [];
  for (let i = 0; i <= 10; i++) {
    const risk = (i / 10) * expectedRisk * 2;
    const return_ = risk * sharpeRatio;
    efficientFrontier.push({
      return: return_,
      risk,
      weights: { ...optimalWeights }
    });
  }
  
  return {
    optimalWeights,
    expectedReturn,
    expectedRisk,
    sharpeRatio,
    efficientFrontier
  };
}

/**
 * Calculate efficient frontier
 */
export function calculateEfficientFrontier(
  assets: string[],
  constraints: {
    minWeight?: number;
    maxWeight?: number;
    targetReturn?: number;
  } = {}
): Array<{
  return: number;
  risk: number;
  weights: Record<string, number>;
}> {
  // Simplified efficient frontier calculation
  // In a real implementation, this would use Monte Carlo simulation or optimization
  const frontier = [];
  
  for (let i = 0; i <= 20; i++) {
    const risk = i * 0.01; // 0% to 20% risk
    const return_ = risk * 1.5; // Assume 1.5 Sharpe ratio
    
    const weights: Record<string, number> = {};
    assets.forEach((asset, index) => {
      weights[asset] = 1 / assets.length; // Equal weight for simplicity
    });
    
    frontier.push({ return: return_, risk, weights });
  }
  
  return frontier;
}

/**
 * Calculate rebalancing optimization with transaction costs
 */
export function rebalanceOptimization(
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>,
  transactionCosts: Record<string, number> = {}
): {
  optimalTrades: Array<{
    symbol: string;
    type: 'buy' | 'sell';
    amount: number;
    cost: number;
  }>;
  totalCost: number;
  netBenefit: number;
} {
  const symbols = Object.keys(targetWeights);
  const optimalTrades = [];
  let totalCost = 0;
  
  symbols.forEach(symbol => {
    const currentWeight = currentWeights[symbol] || 0;
    const targetWeight = targetWeights[symbol];
    const weightDiff = targetWeight - currentWeight;
    
    if (Math.abs(weightDiff) > 0.01) { // 1% threshold
      const tradeType = weightDiff > 0 ? 'buy' : 'sell';
      const amount = Math.abs(weightDiff);
      const cost = (transactionCosts[symbol] || 0.001) * amount; // 0.1% default cost
      
      optimalTrades.push({
        symbol,
        type: tradeType,
        amount,
        cost
      });
      
      totalCost += cost;
    }
  });
  
  // Simplified net benefit calculation
  const netBenefit = totalCost * 0.1; // Assume 10% of cost as benefit
  
  return {
    optimalTrades,
    totalCost,
    netBenefit
  };
}

/**
 * Calculate correlation between two arrays
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate beta between portfolio and benchmark returns
 */
function calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
  if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) return 0;
  
  const correlation = calculateCorrelation(portfolioReturns, benchmarkReturns);
  const portfolioVolatility = calculateVolatility(portfolioReturns);
  const benchmarkVolatility = calculateVolatility(benchmarkReturns);
  
  return benchmarkVolatility > 0 ? (correlation * portfolioVolatility) / benchmarkVolatility : 0;
}

/**
 * Calculate portfolio turnover
 */
export function calculatePortfolioTurnover(
  trades: Trade[],
  period: '1D' | '1W' | '1M' | '3M' | '1Y' = '1M'
): number {
  if (trades.length === 0) return 0;
  
  const now = Date.now();
  let startTime: number;
  
  switch (period) {
    case '1D':
      startTime = now - 24 * 60 * 60 * 1000;
      break;
    case '1W':
      startTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '1M':
      startTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case '3M':
      startTime = now - 90 * 24 * 60 * 60 * 1000;
      break;
    case '1Y':
      startTime = now - 365 * 24 * 60 * 60 * 1000;
      break;
  }
  
  const periodTrades = trades.filter(trade => trade.timestamp >= startTime);
  const totalVolume = periodTrades.reduce((sum, trade) => sum + trade.amount * trade.price, 0);
  
  // Assume average portfolio value for turnover calculation
  const avgPortfolioValue = 10000; // This should come from actual portfolio data
  const turnover = totalVolume / avgPortfolioValue;
  
  return turnover;
}

/**
 * Calculate concentration metrics
 */
export function calculateConcentrationMetrics(
  weights: Record<string, number>
): {
  herfindahlIndex: number;
  topHoldings: Array<{ symbol: string; weight: number }>;
  concentrationRisk: 'low' | 'medium' | 'high';
} {
  const symbols = Object.keys(weights);
  const herfindahlIndex = symbols.reduce((sum, symbol) => 
    sum + Math.pow(weights[symbol], 2), 0
  );
  
  const topHoldings = symbols
    .map(symbol => ({ symbol, weight: weights[symbol] }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  
  let concentrationRisk: 'low' | 'medium' | 'high';
  if (herfindahlIndex < 0.1) concentrationRisk = 'low';
  else if (herfindahlIndex < 0.25) concentrationRisk = 'medium';
  else concentrationRisk = 'high';
  
  return {
    herfindahlIndex,
    topHoldings,
    concentrationRisk
  };
}

/**
 * Calculate time-weighted return
 */
export function calculateTimeWeightedReturn(
  portfolioHistory: PortfolioHistoryEntry[]
): number {
  if (portfolioHistory.length < 2) return 0;
  
  let twr = 1;
  
  for (let i = 1; i < portfolioHistory.length; i++) {
    const previousValue = portfolioHistory[i - 1].totalValue;
    const currentValue = portfolioHistory[i].totalValue;
    const periodReturn = (currentValue - previousValue) / previousValue;
    twr *= (1 + periodReturn);
  }
  
  return twr - 1;
}

/**
 * Calculate money-weighted return (Internal Rate of Return)
 */
export function calculateMoneyWeightedReturn(
  cashFlows: Array<{ amount: number; timestamp: number }>,
  finalValue: number
): number {
  // Simplified IRR calculation using Newton-Raphson method
  // In a real implementation, this would be more sophisticated
  
  if (cashFlows.length === 0) return 0;
  
  let rate = 0.1; // Initial guess
  const tolerance = 0.0001;
  const maxIterations = 100;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0;
    let derivative = 0;
    
    cashFlows.forEach(cf => {
      const time = (cf.timestamp - cashFlows[0].timestamp) / (365 * 24 * 60 * 60 * 1000);
      const factor = Math.pow(1 + rate, time);
      npv += cf.amount / factor;
      derivative -= cf.amount * time / (factor * (1 + rate));
    });
    
    // Add final value
    const finalTime = (cashFlows[cashFlows.length - 1].timestamp - cashFlows[0].timestamp) / (365 * 24 * 60 * 60 * 1000);
    const finalFactor = Math.pow(1 + rate, finalTime);
    npv += finalValue / finalFactor;
    derivative -= finalValue * finalTime / (finalFactor * (1 + rate));
    
    const newRate = rate - npv / derivative;
    
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    
    rate = newRate;
  }
  
  return rate;
}

