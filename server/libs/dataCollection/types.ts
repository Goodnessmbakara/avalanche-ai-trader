/**
 * Data Collection Types
 * Extracted from dataCollection.ts for better modularity
 */

/**
 * Interface for raw swap data from The Graph
 */
export interface SwapData {
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
 * Interface for processed market data with technical indicators
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
  // Technical indicators
  sma7?: number;
  sma14?: number;
  sma30?: number;
  ema10?: number;
  ema30?: number;
  volatility?: number;
  momentum?: number;
  volumeSMA?: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requests: number;
  window: number;
}

/**
 * Rate limit tracker
 */
export interface RateLimitTracker {
  requests: number;
  resetTime: number;
}

/**
 * API configuration
 */
export interface APIConfig {
  coingecko: RateLimitConfig;
  snowtrace: RateLimitConfig;
  pangolin: RateLimitConfig;
}








