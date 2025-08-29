/**
 * Mock Processed Data
 * This file contains cleaned, normalized, and analyzed data ready for use in:
 * - AI model training and inference
 * - Trading decisions
 * - Portfolio management
 * - Risk assessment
 * - Performance analysis
 */

import { mockRawData, mockTimeSeriesData } from './mockRawData';

//  processed market data with calculated metrics
export const mockProcessedMarketData = {
  AVAX: {
    symbol: "AVAX",
    timestamp: 1705312200,
    price: 24.88,
    volume: 245000000,
    high: 25.67,
    low: 23.45,
    open: 24.50,
    close: 24.88,
    priceChange: 0.38,
    priceChangePercent: 1.55,
    volumeChange: 15000000,
    volumeChangePercent: 6.52,
    volatility: 0.089,
    averagePrice: 24.56,
    vwap: 24.76,
    marketCap: 9200000000,
    circulatingSupply: 369000000,
    totalSupply: 720000000,
    exchange: "CoinGecko",
    dataQuality: "HIGH",
    lastUpdate: 1705312200
  }
};

//  processed trading signals with AI analysis
export const mockProcessedTradingSignals = [
  {
    id: "signal_001",
    timestamp: 1705312200,
    symbol: "AVAX",
    signal: "BUY",
    confidence: 0.78,
    strength: "MODERATE",
    model: "LSTM_v2.1",
    version: "2.1.0",
    predictionHorizon: 24,
    expectedReturn: 0.045,
    expectedRisk: 0.089,
    riskRewardRatio: 0.51,
    features: {
      technical: {
        rsi: 65.4,
        macd: 0.234,
        bollinger_position: 0.78,
        sma_trend: 0.67,
        volume_surge: 0.45
      },
      fundamental: {
        market_cap_rank: 15,
        developer_activity: 0.72,
        social_sentiment: 0.67,
        news_sentiment: 0.52
      },
      sentiment: {
        twitter_sentiment: 0.67,
        reddit_sentiment: 0.72,
        telegram_sentiment: 0.58,
        discord_sentiment: 0.81
      },
      market: {
        fear_greed_index: 65,
        volatility_index: 0.089,
        correlation_btc: 0.78,
        correlation_eth: 0.65
      }
    },
    analysis: {
      trend: "BULLISH",
      momentum: 0.67,
      volatility: 0.089,
      support: 24.50,
      resistance: 25.50,
      breakout: false,
      breakdown: false
    },
    metadata: {
      modelAccuracy: 0.72,
      trainingDataSize: 1000000,
      lastTrainingDate: 1705248000,
      featureImportance: {
        rsi: 0.15,
        macd: 0.12,
        volume: 0.10,
        sentiment: 0.08,
        price_momentum: 0.07
      },
      backtestPerformance: {
        accuracy: 0.72,
        profitFactor: 1.45,
        sharpeRatio: 1.23,
        maxDrawdown: 0.15
      }
    }
  }
];

// Mock processed portfolio data
export const mockProcessedPortfolioData = {
  summary: {
    timestamp: 1705312200,
    totalValue: 50000.00,
    totalCost: 45000.00,
    totalProfit: 5000.00,
    totalProfitPercent: 11.11,
    unrealizedPnL: 3500.00,
    realizedPnL: 1500.00,
    cashBalance: 10000.00,
    investedAmount: 40000.00,
    positions: [
      {
        symbol: "AVAX",
        amount: 1200.00,
        value: 29856.00,
        percentage: 59.71,
        entryPrice: 20.50,
        currentPrice: 24.88,
        profitLoss: 5256.00,
        profitLossPercent: 21.37,
        unrealizedPnL: 5256.00,
        realizedPnL: 0.00,
        allocationPercentage: 59.71,
        costBasis: 24600.00,
        averagePrice: 20.50,
        lastTrade: 1705312200,
        holdingPeriod: 30,
        performance: {
          dailyReturn: 0.0155,
          weeklyReturn: 0.089,
          monthlyReturn: 0.2137,
          totalReturn: 0.2137
        },
        risk: {
          volatility: 0.089,
          beta: 1.23,
          var: 0.045,
          maxDrawdown: 0.12
        }
      }
    ],
    allocation: {
      AVAX: 59.71,
      USDT: 20.00,
      CASH: 20.29
    },
    metrics: {
      totalReturn: 0.1111,
      annualizedReturn: 0.156,
      sharpeRatio: 1.45,
      sortinoRatio: 1.67,
      calmarRatio: 2.34,
      maxDrawdown: 0.089,
      volatility: 0.067,
      beta: 0.89,
      var: 0.034,
      cvar: 0.045,
      winRate: 0.67,
      profitFactor: 1.45,
      averageTrade: 234.56,
      averageWin: 456.78,
      averageLoss: -123.45,
      largestWin: 1234.56,
      largestLoss: -567.89,
      averageTradeDuration: 2.5
    }
  }
};

// Export all mock processed data
export const mockProcessedData = {
  marketData: mockProcessedMarketData,
  tradingSignals: mockProcessedTradingSignals,
  portfolioData: mockProcessedPortfolioData,
  timeSeriesData: mockTimeSeriesData
};
