/**
 * Processed Trading Data
 * This file contains cleaned, normalized, and analyzed data ready for use in:
 * - Trading decisions
 * - Portfolio management
 * - Risk assessment
 * - Performance analysis
 * - AI model training
 */

import { 
  RawTransaction, 
  RawMarketData, 
  RawSwapData, 
  RawBalanceData,
  RawAIModelInput,
  RawTradingSignal,
  RawGasData,
  RawLiquidityPoolData,
  RawOrderBookData,
  RawTradeExecution,
  RawPortfolioSnapshot,
  RawRiskData,
  RawSentimentData,
  RawTechnicalIndicators,
  RawBacktestData,
  RawStreamingData,
  RawErrorData,
  RawPerformanceMetrics
} from './rawTradingData';

// Processed market data with normalized values
export interface ProcessedMarketData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  priceChange: number;
  priceChangePercent: number;
  volumeChange: number;
  volumeChangePercent: number;
  volatility: number;
  averagePrice: number;
  vwap: number;
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  exchange: string;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUpdate: number;
}

// Processed trade data with calculated metrics
export interface ProcessedTrade {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  amount: number;
  price: number;
  value: number;
  fees: number;
  slippage: number;
  gasUsed: number;
  gasPrice: number;
  gasCost: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
  txHash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  confirmations: number;
  executionTime: number;
  aiSignal?: {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    model: string;
    features: Record<string, number>;
  };
  metadata: {
    orderType: 'MARKET' | 'LIMIT' | 'STOP';
    timeInForce: 'GTC' | 'IOC' | 'FOK';
    routing: string;
    rebalance?: boolean;
    currentPercentage?: number;
    targetPercentage?: number;
    deviation?: number;
  };
}

// Processed portfolio position with calculated metrics
export interface ProcessedPortfolioPosition {
  symbol: string;
  amount: number;
  value: number;
  percentage: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  allocationPercentage: number;
  costBasis: number;
  averagePrice: number;
  lastTrade: number;
  holdingPeriod: number;
  performance: {
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
    totalReturn: number;
  };
  risk: {
    volatility: number;
    beta: number;
    var: number;
    maxDrawdown: number;
  };
}

// Processed portfolio summary with aggregated metrics
export interface ProcessedPortfolioSummary {
  timestamp: number;
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  cashBalance: number;
  investedAmount: number;
  positions: ProcessedPortfolioPosition[];
  allocation: Record<string, number>;
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    volatility: number;
    beta: number;
    var: number;
    cvar: number;
    winRate: number;
    profitFactor: number;
    averageTrade: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    averageTradeDuration: number;
  };
  performance: {
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
    quarterlyReturn: number;
    yearlyReturn: number;
  };
  risk: {
    var95: number;
    var99: number;
    cvar95: number;
    cvar99: number;
    trackingError: number;
    informationRatio: number;
    correlation: number;
  };
}

// Processed AI trading signal with enhanced analysis
export interface ProcessedAISignal {
  id: string;
  timestamp: number;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  model: string;
  version: string;
  predictionHorizon: number;
  expectedReturn: number;
  expectedRisk: number;
  riskRewardRatio: number;
  features: {
    technical: Record<string, number>;
    fundamental: Record<string, number>;
    sentiment: Record<string, number>;
    market: Record<string, number>;
  };
  analysis: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    momentum: number;
    volatility: number;
    support: number;
    resistance: number;
    breakout: boolean;
    breakdown: boolean;
  };
  metadata: {
    modelAccuracy: number;
    trainingDataSize: number;
    lastTrainingDate: number;
    featureImportance: Record<string, number>;
    backtestPerformance: {
      accuracy: number;
      profitFactor: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
  };
}

// Processed technical indicators with signals
export interface ProcessedTechnicalIndicators {
  timestamp: number;
  symbol: string;
  indicators: {
    rsi: {
      value: number;
      signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
      divergence: 'BULLISH' | 'BEARISH' | 'NONE';
    };
    macd: {
      macd: number;
      signal: number;
      histogram: number;
      signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      crossover: 'BULLISH' | 'BEARISH' | 'NONE';
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      bandwidth: number;
      percentB: number;
      signal: 'SQUEEZE' | 'EXPANSION' | 'NEUTRAL';
      position: 'UPPER' | 'MIDDLE' | 'LOWER';
    };
    movingAverages: {
      sma20: number;
      sma50: number;
      sma200: number;
      ema12: number;
      ema26: number;
      goldenCross: boolean;
      deathCross: boolean;
      trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    };
    stochastic: {
      k: number;
      d: number;
      signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
      crossover: 'BULLISH' | 'BEARISH' | 'NONE';
    };
    williamsR: {
      value: number;
      signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
    };
    cci: {
      value: number;
      signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
    };
    adx: {
      value: number;
      trend: 'STRONG' | 'WEAK' | 'NEUTRAL';
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    };
    obv: {
      value: number;
      trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      divergence: 'BULLISH' | 'BEARISH' | 'NONE';
    };
    vwap: {
      value: number;
      position: 'ABOVE' | 'BELOW' | 'AT';
    };
    atr: {
      value: number;
      volatility: 'HIGH' | 'MEDIUM' | 'LOW';
    };
  };
  signals: {
    buy: number;
    sell: number;
    hold: number;
    consensus: 'BUY' | 'SELL' | 'HOLD';
    strength: number;
  };
  summary: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    momentum: 'STRONG' | 'WEAK' | 'NEUTRAL';
    volatility: 'HIGH' | 'MEDIUM' | 'LOW';
    support: number;
    resistance: number;
    breakout: boolean;
    breakdown: boolean;
  };
}

// Processed market sentiment with aggregated scores
export interface ProcessedMarketSentiment {
  timestamp: number;
  symbol: string;
  overallSentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  overallScore: number;
  confidence: number;
  sources: {
    social: {
      score: number;
      volume: number;
      platforms: Record<string, number>;
    };
    news: {
      score: number;
      volume: number;
      sources: Record<string, number>;
    };
    technical: {
      score: number;
      indicators: Record<string, number>;
    };
    fundamental: {
      score: number;
      metrics: Record<string, number>;
    };
  };
  trends: {
    sentiment: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
    volume: 'INCREASING' | 'DECREASING' | 'STABLE';
    momentum: 'ACCELERATING' | 'DECELERATING' | 'STABLE';
  };
  analysis: {
    fearGreedIndex: number;
    marketMood: 'FEAR' | 'GREED' | 'NEUTRAL';
    volatility: number;
    correlation: number;
  };
}

// Processed risk assessment with actionable insights
export interface ProcessedRiskAssessment {
  timestamp: number;
  portfolioValue: number;
  riskMetrics: {
    var95: number;
    var99: number;
    cvar95: number;
    cvar99: number;
    volatility: number;
    beta: number;
    correlation: number;
    trackingError: number;
    informationRatio: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  riskScore: number;
  alerts: Array<{
    type: 'VAR_BREACH' | 'DRAWDOWN_BREACH' | 'VOLATILITY_SPIKE' | 'CORRELATION_BREACH';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    value: number;
    threshold: number;
    recommendation: string;
  }>;
  stressTests: Array<{
    scenario: string;
    impact: number;
    probability: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  recommendations: Array<{
    type: 'HEDGE' | 'REBALANCE' | 'REDUCE_EXPOSURE' | 'INCREASE_DIVERSIFICATION';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    description: string;
    expectedImpact: number;
  }>;
}

// Processed performance analysis with detailed breakdown
export interface ProcessedPerformanceAnalysis {
  timestamp: number;
  period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
  returns: {
    total: number;
    annualized: number;
    daily: number;
    weekly: number;
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  risk: {
    volatility: number;
    var: number;
    maxDrawdown: number;
    downsideDeviation: number;
    beta: number;
    correlation: number;
  };
  ratios: {
    sharpe: number;
    sortino: number;
    calmar: number;
    information: number;
    treynor: number;
    jensen: number;
  };
  tradeAnalysis: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    averageTradeDuration: number;
    averageTradeSize: number;
  };
  attribution: {
    assetAllocation: number;
    stockSelection: number;
    interaction: number;
    total: number;
  };
  benchmark: {
    name: string;
    return: number;
    excessReturn: number;
    trackingError: number;
    informationRatio: number;
    correlation: number;
  };
}

// Processed backtesting results with detailed analysis
export interface ProcessedBacktestResult {
  id: string;
  timestamp: number;
  strategy: string;
  config: {
    startDate: number;
    endDate: number;
    initialCapital: number;
    symbols: string[];
    parameters: Record<string, any>;
  };
  results: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    volatility: number;
    var: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    averageTradeDuration: number;
    averageTradeSize: number;
  };
  trades: ProcessedTrade[];
  equity: Array<{
    timestamp: number;
    value: number;
    drawdown: number;
  }>;
  drawdownPeriods: Array<{
    start: number;
    end: number;
    depth: number;
    duration: number;
    recovery: number;
  }>;
  performanceAttribution: {
    signalAccuracy: number;
    slippageImpact: number;
    feeImpact: number;
    timingImpact: number;
    total: number;
  };
  analysis: {
    bestMonth: { month: string; return: number };
    worstMonth: { month: string; return: number };
    bestTrade: ProcessedTrade;
    worstTrade: ProcessedTrade;
    longestWinStreak: number;
    longestLoseStreak: number;
    averageWinStreak: number;
    averageLoseStreak: number;
  };
}

// Processed rebalancing recommendation
export interface ProcessedRebalancingRecommendation {
  timestamp: number;
  currentAllocation: Record<string, number>;
  targetAllocation: Record<string, number>;
  deviations: Record<string, number>;
  trades: Array<{
    symbol: string;
    action: 'BUY' | 'SELL';
    amount: number;
    value: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  summary: {
    totalTrades: number;
    totalValue: number;
    estimatedFees: number;
    estimatedSlippage: number;
    netImpact: number;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  };
  analysis: {
    riskReduction: number;
    returnImprovement: number;
    diversificationGain: number;
    costBenefit: number;
  };
  metadata: {
    strategy: string;
    lastRebalance: number;
    rebalanceFrequency: number;
    threshold: number;
  };
}

// Processed market conditions with actionable insights
export interface ProcessedMarketConditions {
  timestamp: number;
  symbol: string;
  conditions: {
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    liquidity: 'LOW' | 'MEDIUM' | 'HIGH';
    momentum: 'STRONG' | 'WEAK' | 'NEUTRAL';
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  };
  levels: {
    support: number[];
    resistance: number[];
    pivot: number;
    fibonacci: Record<string, number>;
  };
  patterns: Array<{
    type: string;
    confidence: number;
    target: number;
    stopLoss: number;
  }>;
  signals: {
    technical: Array<{
      indicator: string;
      signal: 'BUY' | 'SELL' | 'HOLD';
      strength: number;
    }>;
    fundamental: Array<{
      metric: string;
      signal: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      value: number;
    }>;
    sentiment: Array<{
      source: string;
      signal: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      score: number;
    }>;
  };
  recommendations: Array<{
    action: 'BUY' | 'SELL' | 'HOLD' | 'HEDGE';
    confidence: number;
    reasoning: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

// Processed streaming data with real-time analysis
export interface ProcessedStreamingData {
  type: 'PRICE' | 'TRADE' | 'ORDERBOOK' | 'TICKER' | 'KLINE';
  symbol: string;
  timestamp: number;
  data: any;
  analysis: {
    priceChange: number;
    volumeChange: number;
    volatility: number;
    momentum: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  alerts: Array<{
    type: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  source: string;
  sequence: number;
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Export all processed data types
export type ProcessedDataTypes = 
  | ProcessedMarketData
  | ProcessedTrade
  | ProcessedPortfolioPosition
  | ProcessedPortfolioSummary
  | ProcessedAISignal
  | ProcessedTechnicalIndicators
  | ProcessedMarketSentiment
  | ProcessedRiskAssessment
  | ProcessedPerformanceAnalysis
  | ProcessedBacktestResult
  | ProcessedRebalancingRecommendation
  | ProcessedMarketConditions
  | ProcessedStreamingData;

// Data processing utilities
export const processRawData = {
  marketData: (raw: RawMarketData): ProcessedMarketData => ({
    symbol: raw.symbol,
    timestamp: raw.timestamp,
    price: parseFloat(raw.price),
    volume: parseFloat(raw.volume),
    high: parseFloat(raw.high),
    low: parseFloat(raw.low),
    open: parseFloat(raw.open),
    close: parseFloat(raw.close),
    priceChange: 0, // Calculate based on previous data
    priceChangePercent: 0, // Calculate based on previous data
    volumeChange: 0, // Calculate based on previous data
    volumeChangePercent: 0, // Calculate based on previous data
    volatility: 0, // Calculate based on historical data
    averagePrice: (parseFloat(raw.high) + parseFloat(raw.low)) / 2,
    vwap: 0, // Calculate based on volume-weighted data
    exchange: raw.exchange,
    dataQuality: 'HIGH',
    lastUpdate: raw.timestamp
  }),

  trade: (raw: RawTradeExecution): ProcessedTrade => ({
    id: raw.id,
    timestamp: raw.timestamp,
    symbol: raw.symbol,
    type: raw.side,
    amount: parseFloat(raw.amount),
    price: parseFloat(raw.price),
    value: parseFloat(raw.value),
    fees: parseFloat(raw.fees),
    slippage: parseFloat(raw.slippage),
    gasUsed: parseFloat(raw.gasUsed),
    gasPrice: parseFloat(raw.gasPrice),
    gasCost: parseFloat(raw.gasUsed) * parseFloat(raw.gasPrice),
    totalCost: parseFloat(raw.value) + parseFloat(raw.fees) + (parseFloat(raw.gasUsed) * parseFloat(raw.gasPrice)),
    profit: 0, // Calculate based on entry/exit
    profitPercent: 0, // Calculate based on entry/exit
    txHash: raw.txHash,
    status: raw.status,
    confirmations: raw.confirmations,
    executionTime: raw.metadata.executionTime,
    metadata: {
      orderType: raw.metadata.orderType,
      timeInForce: raw.metadata.timeInForce,
      routing: raw.metadata.routing
    }
  }),

  aiSignal: (raw: RawTradingSignal): ProcessedAISignal => ({
    id: raw.id,
    timestamp: raw.timestamp,
    symbol: raw.symbol,
    signal: raw.signal,
    confidence: raw.confidence,
    strength: raw.confidence > 0.8 ? 'STRONG' : raw.confidence > 0.6 ? 'MODERATE' : 'WEAK',
    model: raw.model,
    version: raw.version,
    predictionHorizon: raw.metadata.predictionHorizon,
    expectedReturn: 0, // Calculate based on historical performance
    expectedRisk: 0, // Calculate based on historical volatility
    riskRewardRatio: 0, // Calculate ratio
    features: {
      technical: {},
      fundamental: {},
      sentiment: {},
      market: {}
    },
    analysis: {
      trend: 'NEUTRAL',
      momentum: 0,
      volatility: 0,
      support: 0,
      resistance: 0,
      breakout: false,
      breakdown: false
    },
    metadata: {
      modelAccuracy: raw.metadata.modelAccuracy,
      trainingDataSize: raw.metadata.trainingDataSize,
      lastTrainingDate: raw.metadata.lastTrainingDate,
      featureImportance: raw.metadata.featureImportance,
      backtestPerformance: {
        accuracy: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      }
    }
  })
};

// Data validation utilities
export const validateProcessedData = (data: any, type: string): boolean => {
  if (!data || typeof data !== 'object') return false;
  if (!data.timestamp || typeof data.timestamp !== 'number') return false;
  
  // Type-specific validation
  switch (type) {
    case 'ProcessedMarketData':
      return !!(data.symbol && data.price && data.volume);
    case 'ProcessedTrade':
      return !!(data.id && data.symbol && data.type && data.amount && data.price);
    case 'ProcessedAISignal':
      return !!(data.id && data.symbol && data.signal && data.confidence);
    default:
      return true;
  }
};

// Data aggregation utilities
export const aggregateProcessedData = {
  portfolioValue: (positions: ProcessedPortfolioPosition[]): number => {
    return positions.reduce((total, position) => total + position.value, 0);
  },

  portfolioReturn: (positions: ProcessedPortfolioPosition[]): number => {
    const totalValue = aggregateProcessedData.portfolioValue(positions);
    const totalCost = positions.reduce((total, position) => total + position.costBasis, 0);
    return totalCost > 0 ? (totalValue - totalCost) / totalCost : 0;
  },

  averageConfidence: (signals: ProcessedAISignal[]): number => {
    return signals.length > 0 
      ? signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length 
      : 0;
  }
};
