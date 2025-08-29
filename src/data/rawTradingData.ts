/**
 * Raw Trading Data
 * This file contains unprocessed, raw data from various sources including:
 * - Blockchain transactions
 * - Market data feeds
 * - Trading events
 * - AI model inputs
 * - Portfolio snapshots
 */

// Raw blockchain transaction data
export interface RawTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  input: string;
  status: 'success' | 'failed' | 'pending';
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
    logIndex: number;
  }>;
  receipt: {
    cumulativeGasUsed: string;
    effectiveGasPrice: string;
    contractAddress: string | null;
  };
}

// Raw market data from exchanges
export interface RawMarketData {
  symbol: string;
  exchange: string;
  timestamp: number;
  price: string;
  volume: string;
  high: string;
  low: string;
  open: string;
  close: string;
  bid: string;
  ask: string;
  bidSize: string;
  askSize: string;
  lastUpdateId: number;
  eventTime: number;
}

// Raw swap data from DEX
export interface RawSwapData {
  id: string;
  timestamp: string;
  amount0In: string;
  amount1Out: string;
  amount0Out: string;
  amount1In: string;
  amountUSD: string;
  pair: {
    id: string;
    token0: {
      id: string;
      symbol: string;
      decimals: string;
      totalSupply: string;
    };
    token1: {
      id: string;
      symbol: string;
      decimals: string;
      totalSupply: string;
    };
    reserve0: string;
    reserve1: string;
    totalSupply: string;
    reserveUSD: string;
  };
  sender: string;
  to: string;
  logIndex: number;
  transaction: {
    id: string;
    blockNumber: string;
    timestamp: string;
    gasUsed: string;
    gasPrice: string;
  };
}

// Raw portfolio balance data
export interface RawBalanceData {
  address: string;
  token: string;
  balance: string;
  decimals: number;
  symbol: string;
  timestamp: number;
  blockNumber: number;
  priceUSD?: string;
  valueUSD?: string;
}

// Raw AI model input data
export interface RawAIModelInput {
  timestamp: number;
  features: {
    price: number;
    volume: number;
    high: number;
    low: number;
    open: number;
    close: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    bollingerUpper: number;
    bollingerMiddle: number;
    bollingerLower: number;
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
    atr: number;
    stochasticK: number;
    stochasticD: number;
    williamsR: number;
    cci: number;
    adx: number;
    obv: number;
    vwap: number;
    priceChange: number;
    volumeChange: number;
    volatility: number;
    momentum: number;
    trend: number;
  };
  marketConditions: {
    fearGreedIndex: number;
    marketCap: number;
    circulatingSupply: number;
    totalSupply: number;
    volume24h: number;
    priceChange24h: number;
    priceChange7d: number;
    priceChange30d: number;
  };
  sentiment: {
    socialScore: number;
    newsScore: number;
    redditScore: number;
    twitterScore: number;
    googleTrends: number;
  };
}

// Raw trading signal data
export interface RawTradingSignal {
  id: string;
  timestamp: number;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  model: string;
  version: string;
  features: Record<string, number>;
  metadata: {
    predictionHorizon: number;
    modelAccuracy: number;
    trainingDataSize: number;
    lastTrainingDate: number;
    featureImportance: Record<string, number>;
  };
}

// Raw gas estimation data
export interface RawGasData {
  timestamp: number;
  gasPrice: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  baseFee: string;
  priorityFee: string;
  estimatedCost: string;
  network: string;
  blockNumber: number;
}

// Raw liquidity pool data
export interface RawLiquidityPoolData {
  pairAddress: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  reserveUSD: string;
  volumeUSD: string;
  fee: string;
  timestamp: number;
  blockNumber: number;
}

// Raw order book data
export interface RawOrderBookData {
  symbol: string;
  timestamp: number;
  bids: Array<[string, string]>; // [price, size]
  asks: Array<[string, string]>; // [price, size]
  lastUpdateId: number;
  exchange: string;
}

// Raw trade execution data
export interface RawTradeExecution {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount: string;
  price: string;
  value: string;
  fees: string;
  slippage: string;
  gasUsed: string;
  gasPrice: string;
  txHash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  blockNumber: number;
  confirmations: number;
  error?: string;
  metadata: {
    orderType: 'MARKET' | 'LIMIT' | 'STOP';
    timeInForce: 'GTC' | 'IOC' | 'FOK';
    executionTime: number;
    routing: string;
  };
}

// Raw portfolio snapshot data
export interface RawPortfolioSnapshot {
  timestamp: number;
  address: string;
  totalValueUSD: string;
  positions: Array<{
    token: string;
    symbol: string;
    balance: string;
    priceUSD: string;
    valueUSD: string;
    decimals: number;
    allocation: string;
  }>;
  metrics: {
    totalReturn: string;
    dailyReturn: string;
    weeklyReturn: string;
    monthlyReturn: string;
    volatility: string;
    sharpeRatio: string;
    maxDrawdown: string;
  };
}

// Raw risk assessment data
export interface RawRiskData {
  timestamp: number;
  portfolioValue: string;
  var95: string;
  var99: string;
  cvar95: string;
  cvar99: string;
  volatility: string;
  beta: string;
  correlation: string;
  trackingError: string;
  informationRatio: string;
  sharpeRatio: string;
  sortinoRatio: string;
  calmarRatio: string;
  maxDrawdown: string;
  stressTestResults: {
    scenario: string;
    impact: string;
    probability: string;
  }[];
}

// Raw market sentiment data
export interface RawSentimentData {
  timestamp: number;
  source: string;
  symbol: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  confidence: number;
  text?: string;
  metadata: {
    author?: string;
    platform?: string;
    followers?: number;
    engagement?: number;
    language?: string;
  };
}

// Raw technical indicator data
export interface RawTechnicalIndicators {
  timestamp: number;
  symbol: string;
  indicators: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      bandwidth: number;
      percentB: number;
    };
    movingAverages: {
      sma20: number;
      sma50: number;
      sma200: number;
      ema12: number;
      ema26: number;
    };
    stochastic: {
      k: number;
      d: number;
    };
    williamsR: number;
    cci: number;
    adx: number;
    obv: number;
    vwap: number;
    atr: number;
  };
}

// Raw backtesting data
export interface RawBacktestData {
  id: string;
  timestamp: number;
  strategy: string;
  config: {
    startDate: number;
    endDate: number;
    initialCapital: string;
    symbols: string[];
    parameters: Record<string, any>;
  };
  results: {
    totalReturn: string;
    annualizedReturn: string;
    sharpeRatio: string;
    maxDrawdown: string;
    winRate: string;
    profitFactor: string;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: string;
    averageLoss: string;
    largestWin: string;
    largestLoss: string;
    averageTradeDuration: number;
  };
  trades: Array<{
    timestamp: number;
    symbol: string;
    side: 'BUY' | 'SELL';
    amount: string;
    price: string;
    pnl: string;
    fees: string;
  }>;
  equity: Array<{
    timestamp: number;
    value: string;
  }>;
}

// Raw streaming data
export interface RawStreamingData {
  type: 'PRICE' | 'TRADE' | 'ORDERBOOK' | 'TICKER' | 'KLINE';
  symbol: string;
  timestamp: number;
  data: any;
  source: string;
  sequence: number;
}

// Raw error and log data
export interface RawErrorData {
  timestamp: number;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  stack?: string;
  context: {
    component: string;
    function: string;
    parameters?: any;
    userId?: string;
    sessionId?: string;
  };
  metadata: {
    errorCode?: string;
    errorType?: string;
    retryCount?: number;
    resolved?: boolean;
  };
}

// Raw performance metrics data
export interface RawPerformanceMetrics {
  timestamp: number;
  component: string;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    databaseQueries: number;
    cacheHitRate: number;
  };
  metadata: {
    version: string;
    environment: string;
    instance: string;
  };
}

// Export all raw data types
export type RawDataTypes = 
  | RawTransaction
  | RawMarketData
  | RawSwapData
  | RawBalanceData
  | RawAIModelInput
  | RawTradingSignal
  | RawGasData
  | RawLiquidityPoolData
  | RawOrderBookData
  | RawTradeExecution
  | RawPortfolioSnapshot
  | RawRiskData
  | RawSentimentData
  | RawTechnicalIndicators
  | RawBacktestData
  | RawStreamingData
  | RawErrorData
  | RawPerformanceMetrics;

// Raw data collection utilities
export const createRawDataTimestamp = (): number => Date.now();

export const validateRawData = (data: any, type: string): boolean => {
  // Basic validation for raw data
  if (!data || typeof data !== 'object') return false;
  if (!data.timestamp || typeof data.timestamp !== 'number') return false;
  
  // Type-specific validation can be added here
  return true;
};

export const sanitizeRawData = (data: any): any => {
  // Remove sensitive information and sanitize raw data
  const sanitized = { ...data };
  
  // Remove private keys, passwords, etc.
  delete sanitized.privateKey;
  delete sanitized.password;
  delete sanitized.secret;
  
  return sanitized;
};
