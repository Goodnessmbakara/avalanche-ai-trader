import { 
  BacktestConfig, 
  BacktestResult, 
  Trade, 
  AISignal,
  PortfolioMetrics 
} from '../shared/types';
import { 
  calculateSharpeRatio, 
  calculateMaxDrawdown, 
  calculateVaR,
  calculateVolatility 
} from './riskManagement';
import { getHistoricalData } from './dataCollection';

interface BacktestTrade extends Trade {
  timestamp: number;
  signal: AISignal | null;
  slippage: number;
  fees: number;
}

interface BacktestPortfolio {
  cash: number;
  positions: Record<string, {
    quantity: number;
    avgCost: number;
  }>;
  totalValue: number;
  trades: BacktestTrade[];
  equity: number[];
  timestamps: number[];
}

interface StrategyConfig {
  name: string;
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

export class BacktestEngine {
  private historicalData: any[] = [];
  private portfolio: BacktestPortfolio;
  private config: BacktestConfig;
  private strategy: StrategyConfig;

  constructor() {
    this.portfolio = {
      cash: 0,
      positions: {},
      totalValue: 0,
      trades: [],
      equity: [],
      timestamps: []
    };
  }

  async runBacktest(
    strategy: StrategyConfig,
    config: BacktestConfig
  ): Promise<BacktestResult> {
    this.strategy = strategy;
    this.config = config;
    
    // Initialize portfolio
    this.portfolio = {
      cash: config.initialCapital,
      positions: {},
      totalValue: config.initialCapital,
      trades: [],
      equity: [config.initialCapital],
      timestamps: [config.startDate.getTime()]
    };

    // Load historical data
    await this.loadHistoricalData();
    
    // Run simulation
    const results = await this.simulateTrading();
    
    // Calculate metrics
    const metrics = this.calculateBacktestMetrics(results);
    
    return {
      strategy: strategy.name,
      config,
      trades: results.trades,
      metrics,
      equity: results.equity,
      timestamps: results.timestamps,
      drawdownPeriods: this.calculateDrawdownPeriods(results.equity),
      performanceAttribution: this.calculatePerformanceAttribution(results.trades)
    };
  }

  private async loadHistoricalData(): Promise<void> {
    try {
      this.historicalData = await getHistoricalData(
        this.config.startDate,
        this.config.endDate
      );
    } catch (error) {
      throw new Error(`Failed to load historical data: ${error}`);
    }
  }

  private async simulateTrading(): Promise<{
    trades: BacktestTrade[];
    equity: number[];
    timestamps: number[];
  }> {
    const trades: BacktestTrade[] = [];
    const equity: number[] = [this.config.initialCapital];
    const timestamps: number[] = [this.config.startDate.getTime()];

    for (let i = 1; i < this.historicalData.length; i++) {
      const currentData = this.historicalData[i];
      const previousData = this.historicalData[i - 1];
      
      // Generate AI signal
      const signal = await this.generateAISignal(currentData, previousData);
      
      // Execute trades based on signal
      if (signal && signal.confidence >= this.strategy.tradingParams.minConfidence) {
        const trade = this.executeTrade(signal, currentData, i);
        if (trade) {
          trades.push(trade);
        }
      }
      
      // Update portfolio value
      this.updatePortfolioValue(currentData);
      
      // Record equity curve
      equity.push(this.portfolio.totalValue);
      timestamps.push(currentData.timestamp);
      
      // Update portfolio equity for risk limit checks
      this.portfolio.equity = equity;
      
      // Check risk limits
      if (this.checkRiskLimits()) {
        break;
      }
    }

    return { trades, equity, timestamps };
  }

  private async generateAISignal(
    currentData: any,
    previousData: any
  ): Promise<AISignal | null> {
    // Simulate AI model prediction based on strategy
    const priceChange = (currentData.close - previousData.close) / previousData.close;
    const volatility = Math.abs(priceChange);
    const volume = currentData.volume;
    
    let confidence = 0;
    let predictedPrice = currentData.close;
    
    switch (this.strategy.aiModel) {
      case 'lstm':
        // Simulate LSTM prediction
        confidence = Math.min(0.9, 0.3 + Math.abs(priceChange) * 2);
        predictedPrice = currentData.close * (1 + priceChange * 0.8);
        break;
        
      case 'reinforcement':
        // Simulate RL agent decision
        confidence = Math.min(0.85, 0.4 + volatility * 1.5);
        predictedPrice = currentData.close * (1 + priceChange * 0.6);
        break;
        
      case 'ensemble':
        // Simulate ensemble prediction
        confidence = Math.min(0.95, 0.5 + Math.abs(priceChange) * 1.8);
        predictedPrice = currentData.close * (1 + priceChange * 0.7);
        break;
    }
    
    if (confidence < this.strategy.tradingParams.minConfidence) {
      return null;
    }
    
    return {
      symbol: currentData.symbol || 'AVAX/USDT',
      predictedPrice,
      currentPrice: currentData.close,
      confidence,
      timestamp: currentData.timestamp,
      direction: predictedPrice > currentData.close ? 'buy' : 'sell',
      features: {
        priceChange,
        volatility,
        volume,
        rsi: this.calculateRSI(currentData),
        macd: this.calculateMACD(currentData)
      }
    };
  }

  private executeTrade(
    signal: AISignal,
    marketData: any,
    index: number
  ): BacktestTrade | null {
    const currentPrice = marketData.close;
    const slippage = this.calculateSlippage(marketData);
    const executionPrice = signal.direction === 'buy' 
      ? currentPrice * (1 + slippage)
      : currentPrice * (1 - slippage);
    
    // Calculate position size based on risk parameters
    const maxPositionValue = this.portfolio.totalValue * this.strategy.riskParams.maxPositionSize;
    const positionSize = Math.min(maxPositionValue, this.portfolio.cash * 0.95);
    
    if (positionSize < 10) return null; // Minimum trade size
    
    const amount = positionSize / executionPrice;
    const fees = positionSize * 0.001; // 0.1% trading fee
    
    let pnl = 0;
    
    // Calculate PnL for sell trades
    if (signal.direction === 'sell' && this.portfolio.positions[signal.symbol]) {
      const position = this.portfolio.positions[signal.symbol];
      const sellQuantity = Math.min(position.quantity, positionSize / executionPrice);
      pnl = (executionPrice - position.avgCost) * sellQuantity - fees;
    }
    
    const trade: BacktestTrade = {
      id: `backtest_${index}`,
      symbol: signal.symbol,
      type: signal.direction as 'buy' | 'sell',
      amount,
      price: executionPrice,
      timestamp: marketData.timestamp,
      pnl,
      status: 'completed',
      signal,
      slippage,
      fees
    };
    
    // Update portfolio with position tracking
    if (signal.direction === 'buy') {
      this.portfolio.cash -= (positionSize + fees);
      
      if (!this.portfolio.positions[signal.symbol]) {
        this.portfolio.positions[signal.symbol] = { quantity: 0, avgCost: 0 };
      }
      
      const position = this.portfolio.positions[signal.symbol];
      const totalCost = position.quantity * position.avgCost + amount * executionPrice;
      const totalQuantity = position.quantity + amount;
      position.avgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      position.quantity = totalQuantity;
      
    } else {
      // Sell trade - calculate correct cash flow and position updates
      const position = this.portfolio.positions[signal.symbol];
      const sellQuantity = Math.min(position.quantity, positionSize / executionPrice);
      const sellValue = sellQuantity * executionPrice;
      
      this.portfolio.cash += sellValue - fees;
      position.quantity -= sellQuantity;
      
      // If position is closed, reset avgCost
      if (position.quantity <= 0) {
        position.avgCost = 0;
      }
    }
    
    return trade;
  }

  private updatePortfolioValue(marketData: any): void {
    let totalValue = this.portfolio.cash;
    
    Object.entries(this.portfolio.positions).forEach(([symbol, position]) => {
      if (position.quantity !== 0) {
        totalValue += position.quantity * marketData.close;
      }
    });
    
    this.portfolio.totalValue = totalValue;
  }

  private calculateSlippage(marketData: any): number {
    switch (this.strategy.tradingParams.slippageModel) {
      case 'fixed':
        return 0.0005; // 0.05% fixed slippage
        
      case 'volume':
        const volumeImpact = Math.max(0.0001, 1 / (marketData.volume || 1));
        return Math.min(0.01, volumeImpact);
        
      case 'volatility':
        const volatility = Math.abs((marketData.high - marketData.low) / marketData.close);
        return Math.min(0.02, volatility * 0.1);
        
      default:
        return 0.0005;
    }
  }

  private checkRiskLimits(): boolean {
    // Check maximum drawdown
    const maxValue = Math.max(...this.portfolio.equity);
    const currentDrawdown = (maxValue - this.portfolio.totalValue) / maxValue;
    
    if (currentDrawdown > this.strategy.riskParams.maxDrawdown) {
      return true; // Stop trading
    }
    
    return false;
  }

  private calculateBacktestMetrics(results: {
    trades: BacktestTrade[];
    equity: number[];
    timestamps: number[];
  }): PortfolioMetrics {
    const { trades, equity } = results;
    
    // Calculate returns
    const returns = equity.map((value, index) => {
      if (index === 0) return 0;
      return (value - equity[index - 1]) / equity[index - 1];
    }).slice(1);
    
    // Calculate metrics
    const totalReturn = equity.length > 1 
      ? (equity[equity.length - 1] - equity[0]) / equity[0]
      : 0;
    
    const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const timeSpan = results.timestamps.length > 1 
      ? (results.timestamps[results.timestamps.length - 1] - results.timestamps[0]) / YEAR_MS
      : 1;
    
    const annualizedReturn = timeSpan > 0 ? Math.pow(1 + totalReturn, 1 / timeSpan) - 1 : 0;
    
    const sharpeRatio = calculateSharpeRatio(returns, 0.02);
    const maxDrawdown = calculateMaxDrawdown(equity) / 100;
    const volatility = calculateVolatility(returns);
    
    // Calculate trade metrics
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl < 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    
    const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
    
    const averageTrade = trades.length > 0 
      ? trades.reduce((sum, trade) => sum + trade.pnl, 0) / trades.length
      : 0;
    
    return {
      totalValue: equity[equity.length - 1] || 0,
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      volatility,
      beta: 0, // TODO: Calculate beta
      winRate,
      profitFactor,
      averageTrade
    };
  }

  private calculateDrawdownPeriods(equity: number[]): Array<{
    start: number;
    end: number;
    depth: number;
    duration: number;
  }> {
    const drawdownPeriods = [];
    let peak = equity[0];
    let peakIndex = 0;
    let inDrawdown = false;
    let drawdownStart = 0;
    
    for (let i = 1; i < equity.length; i++) {
      if (equity[i] > peak) {
        if (inDrawdown) {
          // End of drawdown period
          drawdownPeriods.push({
            start: this.portfolio.timestamps[drawdownStart],
            end: this.portfolio.timestamps[i - 1],
            depth: (peak - Math.min(...equity.slice(drawdownStart, i))) / peak,
            duration: i - drawdownStart
          });
          inDrawdown = false;
        }
        peak = equity[i];
        peakIndex = i;
      } else if (equity[i] < peak && !inDrawdown) {
        // Start of drawdown period
        inDrawdown = true;
        drawdownStart = i;
      }
    }
    
    // Handle ongoing drawdown
    if (inDrawdown) {
      drawdownPeriods.push({
        start: this.portfolio.timestamps[drawdownStart],
        end: this.portfolio.timestamps[equity.length - 1],
        depth: (peak - Math.min(...equity.slice(drawdownStart))) / peak,
        duration: equity.length - drawdownStart
      });
    }
    
    return drawdownPeriods;
  }

  private calculatePerformanceAttribution(trades: BacktestTrade[]): {
    signalAccuracy: number;
    slippageImpact: number;
    feeImpact: number;
    timingImpact: number;
  } {
    const totalTrades = trades.length;
    const correctSignals = trades.filter(trade => {
      const priceChange = (trade.price - trade.signal!.currentPrice) / trade.signal!.currentPrice;
      return (trade.type === 'buy' && priceChange > 0) || (trade.type === 'sell' && priceChange < 0);
    }).length;
    
    const signalAccuracy = totalTrades > 0 ? correctSignals / totalTrades : 0;
    const slippageImpact = trades.reduce((sum, trade) => sum + trade.slippage * trade.amount * trade.price, 0);
    const feeImpact = trades.reduce((sum, trade) => sum + trade.fees, 0);
    const timingImpact = 0; // TODO: Calculate timing impact
    
    return {
      signalAccuracy,
      slippageImpact,
      feeImpact,
      timingImpact
    };
  }

  // Helper methods for technical indicators
  private calculateRSI(data: any): number {
    // Simplified RSI calculation
    return 50 + Math.random() * 20 - 10; // Placeholder
  }

  private calculateMACD(data: any): number {
    // Simplified MACD calculation
    return Math.random() * 2 - 1; // Placeholder
  }

  // Strategy comparison method
  async compareStrategies(strategies: StrategyConfig[]): Promise<{
    results: BacktestResult[];
    comparison: {
      bestStrategy: string;
      ranking: Array<{ name: string; sharpeRatio: number; totalReturn: number }>;
    };
  }> {
    const results: BacktestResult[] = [];
    
    for (const strategy of strategies) {
      const result = await this.runBacktest(strategy, this.config);
      results.push(result);
    }
    
    // Rank strategies by Sharpe ratio
    const ranking = results
      .map(result => ({
        name: result.strategy,
        sharpeRatio: result.metrics.sharpeRatio,
        totalReturn: result.metrics.totalReturn
      }))
      .sort((a, b) => b.sharpeRatio - a.sharpeRatio);
    
    return {
      results,
      comparison: {
        bestStrategy: ranking[0]?.name || '',
        ranking
      }
    };
  }

  // Monte Carlo simulation
  async runMonteCarloSimulation(
    strategy: StrategyConfig,
    config: BacktestConfig,
    iterations: number = 1000
  ): Promise<{
    meanReturn: number;
    stdDevReturn: number;
    worstCase: number;
    bestCase: number;
    confidenceIntervals: Array<{ percentile: number; return: number }>;
  }> {
    const returns: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Add random noise to historical data for simulation
      const noisyConfig = {
        ...config,
        startDate: new Date(config.startDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      };
      
      const result = await this.runBacktest(strategy, noisyConfig);
      returns.push(result.metrics.totalReturn);
    }
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDevReturn = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length
    );
    
    const sortedReturns = returns.sort((a, b) => a - b);
    const worstCase = sortedReturns[0];
    const bestCase = sortedReturns[sortedReturns.length - 1];
    
    const confidenceIntervals = [
      { percentile: 5, return: sortedReturns[Math.floor(0.05 * returns.length)] },
      { percentile: 25, return: sortedReturns[Math.floor(0.25 * returns.length)] },
      { percentile: 50, return: sortedReturns[Math.floor(0.50 * returns.length)] },
      { percentile: 75, return: sortedReturns[Math.floor(0.75 * returns.length)] },
      { percentile: 95, return: sortedReturns[Math.floor(0.95 * returns.length)] }
    ];
    
    return {
      meanReturn,
      stdDevReturn,
      worstCase,
      bestCase,
      confidenceIntervals
    };
  }
}

