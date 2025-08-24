/**
 * Shared types between client and server
 * This file contains types that are used across client/server boundaries
 */

/**
 * Interface for processed market data
 */
export interface MarketDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  transactionCount: number;
  liquidity: number;
}

/**
 * Streaming event types
 */
export enum StreamingEventType {
  PRICE_UPDATE = 'PRICE_UPDATE',
  SWAP_EVENT = 'SWAP_EVENT',
  CONNECTION_STATUS = 'CONNECTION_STATUS',
  ERROR = 'ERROR',
  RECONNECT = 'RECONNECT'
}

/**
 * Base streaming event interface
 */
export interface StreamingEvent {
  type: StreamingEventType;
  timestamp: number;
  source: string;
}

/**
 * Price stream data from Binance WebSocket
 */
export interface PriceStreamData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price
  q: string; // Quantity
  T: number; // Trade time
  t: number; // Trade ID
  b: number; // Buyer order ID
  a: number; // Seller order ID
  M: boolean; // Is buyer market maker
  m: boolean; // Ignore
}

/**
 * Subgraph stream data for Pangolin swap events
 */
export interface SubgraphStreamData {
  id: string;
  timestamp: string;
  amount0In: string;
  amount1Out: string;
  amount0Out: string;
  amount1In: string;
  amountUSD: string;
  pair: {
    token0: {
      symbol: string;
      decimals: string;
    };
    token1: {
      symbol: string;
      decimals: string;
    };
  };
}

/**
 * Price update event
 */
export interface PriceUpdateEvent extends StreamingEvent {
  type: StreamingEventType.PRICE_UPDATE;
  data: MarketDataPoint;
}

/**
 * Swap event from subgraph
 */
export interface SwapEvent extends StreamingEvent {
  type: StreamingEventType.SWAP_EVENT;
  data: SubgraphStreamData;
}

/**
 * Connection status event
 */
export interface ConnectionStatusEvent extends StreamingEvent {
  type: StreamingEventType.CONNECTION_STATUS;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  source: string;
  error?: string;
}

/**
 * Error event
 */
export interface ErrorEvent extends StreamingEvent {
  type: StreamingEventType.ERROR;
  error: string;
  details?: any;
}

/**
 * Reconnect event
 */
export interface ReconnectEvent extends StreamingEvent {
  type: StreamingEventType.RECONNECT;
  attempt: number;
  maxAttempts: number;
}

/**
 * Streaming status interface
 */
export interface StreamingStatus {
  isConnected: boolean;
  priceStreamActive: boolean;
  subgraphStreamActive: boolean;
  lastPriceUpdate: number | null;
  lastSwapUpdate: number | null;
  connectionErrors: string[];
  reconnectAttempts: number;
}

/**
 * Streaming configuration options
 */
export interface StreamingConfig {
  enablePriceStream: boolean;
  enableSubgraphStream: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  dataBufferSize: number;
  updateThrottleMs: number;
}

/**
 * WebSocket connection state
 */
export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected: number | null;
  reconnectAttempts: number;
  error: string | null;
}

/**
 * Data validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Stream health metrics
 */
export interface StreamHealth {
  uptime: number;
  messagesReceived: number;
  messagesProcessed: number;
  errors: number;
  lastHeartbeat: number;
  averageLatency: number;
}

// ===== TRADING TYPES =====

/**
 * Trade parameters for execution
 */
export interface TradeParameters {
  fromToken: string;
  toToken: string;
  amount: number;
  slippage: number;
  deadline: number;
  useSmartContract: boolean;
  aiValidation: boolean;
}

/**
 * Trade execution result
 */
export interface TradeResult {
  txHash: string;
  status: TradeStatus;
  gasUsed: number;
  actualSlippage: number;
  executionTime: number;
  fromToken: string;
  toToken: string;
  amount: number;
  timestamp: string;
}

/**
 * Trade status enumeration
 */
export enum TradeStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Risk parameters for position sizing
 */
export interface RiskParameters {
  riskLevel: number; // 0-100
  stopLoss: number; // Percentage
  takeProfit: number; // Percentage
  maxPositionSize: number; // Percentage of portfolio
  portfolioAllocation: number; // Percentage of portfolio
  maxDrawdown: number; // Maximum allowed drawdown
  correlationThreshold: number; // Maximum correlation between positions
}

/**
 * Position size calculation result
 */
export interface PositionSizeResult {
  recommendedSize: number;
  maxSize: number;
  riskAdjustedSize: number;
  reasoning: string;
  confidence: number;
}

/**
 * AI trading signal with recommendations
 */
export interface AITradeSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  predictedPrice: number;
  timestamp: number;
  reasoning: string;
  positionSize?: PositionSizeResult;
  riskAssessment?: RiskAssessment;
}

/**
 * Risk assessment for a trade or portfolio
 */
export interface RiskAssessment {
  totalRisk: number;
  portfolioVaR: number;
  maxLoss: number;
  sharpeRatio: number;
  volatility: number;
  correlation: number;
  recommendations: string[];
}

/**
 * Automated trading configuration
 */
export interface AutoTradingConfig {
  enabled: boolean;
  strategy: string;
  riskLimits: {
    maxRiskPerTrade: number;
    maxPortfolioExposure: number;
    maxDrawdown: number;
  };
  executionRules: {
    maxTradesPerHour: number;
    minTimeBetweenTrades: number;
    aiConfidenceThreshold: number;
    useSmartContract: boolean;
  };
}

/**
 * Performance metrics for trading
 */
export interface PerformanceMetrics {
  winRate: number;
  profitLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  tradeCount: number;
  totalVolume: number;
  averageTradeSize: number;
  successRate: number;
  averageExecutionTime: number;
}

/**
 * Market conditions analysis
 */
export interface MarketConditions {
  volatility: number;
  liquidity: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  volume: number;
  priceChange: number;
}

/**
 * Trading strategy configuration
 */
export interface TradingStrategy {
  name: string;
  description: string;
  riskLevel: number;
  maxTradesPerHour: number;
  minTimeBetweenTrades: number;
  aiConfidenceThreshold: number;
  maxPortfolioExposure: number;
  stopLoss: number;
  takeProfit: number;
}

/**
 * Trade history entry
 */
export interface TradeHistoryEntry {
  id: string;
  timestamp: Date;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  status: TradeStatus;
  profit?: number;
  aiConfidence: number;
  txHash?: string;
  gasUsed?: number;
}

/**
 * Portfolio position
 */
export interface PortfolioPosition {
  symbol: string;
  amount: number;
  value: number;
  percentage: number;
  entryPrice?: number;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
  allocationPercentage?: number;
  timestamp?: Date;
}

/**
 * Gas estimation result
 */
export interface GasEstimate {
  gasLimit: number;
  gasPrice: number;
  totalCost: number;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number; // seconds
}

/**
 * Slippage calculation result
 */
export interface SlippageCalculation {
  baseSlippage: number;
  adjustedSlippage: number;
  volatilityAdjustment: number;
  confidenceAdjustment: number;
  marketImpact: number;
  recommendedSlippage: number;
}

/**
 * Trade validation result
 */
export interface TradeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  gasEstimate?: GasEstimate;
  slippageCalculation?: SlippageCalculation;
  riskAssessment?: RiskAssessment;
}

/**
 * Emergency stop configuration
 */
export interface EmergencyStopConfig {
  enabled: boolean;
  conditions: {
    maxLossPerHour: number;
    maxDrawdown: number;
    consecutiveLosses: number;
    aiConfidenceDrop: number;
  };
  actions: {
    pauseTrading: boolean;
    closePositions: boolean;
    notifyUser: boolean;
  };
}

/**
 * Notification settings for trading
 */
export interface TradingNotifications {
  tradeExecuted: boolean;
  tradeFailed: boolean;
  profitTarget: boolean;
  stopLoss: boolean;
  emergencyStop: boolean;
  aiSignalUpdate: boolean;
  riskWarning: boolean;
}

/**
 * Trading session configuration
 */
export interface TradingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  strategy: TradingStrategy;
  performance: PerformanceMetrics;
  trades: TradeHistoryEntry[];
  status: 'active' | 'paused' | 'stopped' | 'completed';
}

// Portfolio Analytics Types
export interface PortfolioMetrics {
  totalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
}

export interface RiskMetrics {
  var: number; // Value at Risk
  cvar: number; // Conditional Value at Risk
  beta: number;
  correlation: number;
  trackingError: number;
  informationRatio: number;
}

export interface AIPerformanceMetrics {
  predictionAccuracy: number;
  signalEffectiveness: number;
  confidenceCorrelation: number;
  averageConfidence: number;
  signalCount: number;
}

// Enhanced Portfolio Position (extends base PortfolioPosition)
export interface EnhancedPortfolioPosition extends PortfolioPosition {
  unrealizedPnL: number;
  realizedPnL: number;
  allocationPercentage: number;
}

// Backtesting Types
export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  symbols: string[];
  parameters?: Record<string, any>;
}

export interface BacktestResult {
  strategy: string;
  config: BacktestConfig;
  trades: Trade[];
  metrics: PortfolioMetrics;
  equity: number[];
  timestamps: number[];
  drawdownPeriods: Array<{
    start: number;
    end: number;
    depth: number;
    duration: number;
  }>;
  performanceAttribution: {
    signalAccuracy: number;
    slippageImpact: number;
    feeImpact: number;
    timingImpact: number;
  };
}

// Rebalancing Types
export interface AllocationTarget {
  symbol: string;
  targetPercentage: number;
  minPercentage: number;
  maxPercentage: number;
}

export interface RebalanceRecommendation {
  currentAllocation: Array<{
    symbol: string;
    percentage: number;
    value: number;
  }>;
  targetAllocation: AllocationTarget[];
  trades: Trade[];
  reasoning: string;
  impact: {
    expectedReturn: number;
    riskReduction: number;
    costImpact: number;
    timeToRecovery: number;
  };
  needsRebalancing: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Performance Attribution Types
export interface PerformanceAttribution {
  totalReturn: number;
  assetAllocation: number;
  stockSelection: number;
  interaction: number;
  benchmarkReturn: number;
}

// Enhanced Trade Interface
export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  pnl: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata?: {
    rebalance?: boolean;
    currentPercentage?: number;
    targetPercentage?: number;
    deviation?: number;
    signal?: AISignal;
    slippage?: number;
    fees?: number;
  };
}

// Enhanced AI Signal Interface
export interface AISignal {
  symbol: string;
  predictedPrice: number;
  currentPrice: number;
  confidence: number;
  timestamp: number;
  direction: 'buy' | 'sell' | 'hold';
  features: {
    priceChange: number;
    volatility: number;
    volume: number;
    rsi: number;
    macd: number;
  };
  actualPrice?: number | null;
}

// Portfolio History Types
export interface PortfolioHistoryEntry {
  timestamp: number;
  totalValue: number;
  allocation: Record<string, number>;
  returns: number;
}

// Benchmark Types
export interface Benchmark {
  name: string;
  return: number;
  volatility: number;
  sharpeRatio: number;
  correlation: number;
}

// Strategy Types
export interface StrategyConfig {
  name: string;
  description: string;
  aiModel: 'lstm' | 'reinforcement' | 'ensemble';
  riskParams: {
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    maxDrawdown: number;
  };
  tradingParams: {
    minConfidence: number;
    rebalanceFrequency: number;
    slippageModel: 'fixed' | 'volume' | 'volatility';
  };
}

// Risk Management Types
export interface RiskLimits {
  maxPositionSize: number;
  maxDrawdown: number;
  maxVaR: number;
  maxLeverage: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

export interface RiskAlert {
  type: 'drawdown' | 'var' | 'leverage' | 'concentration' | 'volatility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
}

// Portfolio Optimization Types
export interface OptimizationResult {
  optimalWeights: Record<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  efficientFrontier: Array<{
    return: number;
    risk: number;
    weights: Record<string, number>;
  }>;
}

// Market Data Types
export interface MarketData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  priceChange: number;
  priceChangePercent: number;
}

// Analytics Report Types
export interface AnalyticsReport {
  period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
  portfolioMetrics: PortfolioMetrics;
  riskMetrics: RiskMetrics;
  aiPerformanceMetrics: AIPerformanceMetrics;
  benchmarkComparison: {
    benchmark: string;
    excessReturn: number;
    trackingError: number;
    informationRatio: number;
  };
  tradeAnalysis: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    profitFactor: number;
    averageTradeDuration: number;
  };
  timestamp: number;
}



