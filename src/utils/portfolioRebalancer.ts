import { 
  RebalanceRecommendation, 
  AllocationTarget, 
  Trade, 
  AISignal,
  PortfolioPosition 
} from '../shared/types';
import { 
  calculateSharpeRatio, 
  calculateVaR 
} from './riskManagement';
import { calculateVolatilityPercentage } from './dataPreprocessing';

interface CurrentAllocation {
  [symbol: string]: {
    amount: number;
    value: number;
    percentage: number;
    price: number;
  };
}

interface TargetAllocation {
  [symbol: string]: {
    targetPercentage: number;
    minPercentage: number;
    maxPercentage: number;
  };
}

interface RebalanceParams {
  currentAllocation: CurrentAllocation;
  aiSignals: AISignal[];
  riskParams: {
    maxVolatility: number;
    targetSharpeRatio: number;
    maxVaR: number;
    rebalanceThreshold: number;
  };
  constraints: {
    minTradeSize: number;
    maxTradeSize: number;
    transactionCosts: number;
    slippageTolerance: number;
  };
}

export class PortfolioRebalancer {
  private totalPortfolioValue: number = 0;
  private currentAllocation: CurrentAllocation = {};
  private targetAllocation: TargetAllocation = {};

  constructor() {}

  calculateOptimalAllocation(
    currentPortfolio: CurrentAllocation,
    aiSignals: AISignal[],
    riskParams: RebalanceParams['riskParams']
  ): TargetAllocation {
    this.currentAllocation = currentPortfolio;
    this.totalPortfolioValue = Object.values(currentPortfolio).reduce((sum, pos) => sum + pos.value, 0);

    // Calculate AI-driven allocation weights
    const aiWeights = this.calculateAIWeights(aiSignals);
    
    // Apply risk constraints
    const riskAdjustedWeights = this.applyRiskConstraints(aiWeights, riskParams);
    
    // Normalize weights to sum to 100%
    const normalizedWeights = this.normalizeWeights(riskAdjustedWeights);
    
    // Convert to target allocation format
    this.targetAllocation = this.convertToTargetAllocation(normalizedWeights);
    
    return this.targetAllocation;
  }

  private calculateAIWeights(aiSignals: AISignal[]): Record<string, number> {
    const weights: Record<string, number> = {};
    
    // Group signals by symbol and calculate average confidence
    const signalGroups = aiSignals.reduce((groups, signal) => {
      if (!groups[signal.symbol]) {
        groups[signal.symbol] = [];
      }
      groups[signal.symbol].push(signal);
      return groups;
    }, {} as Record<string, AISignal[]>);
    
    // Calculate weights based on AI confidence and direction
    Object.entries(signalGroups).forEach(([symbol, signals]) => {
      const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
      const bullishSignals = signals.filter(s => s.direction === 'buy').length;
      const bearishSignals = signals.filter(s => s.direction === 'sell').length;
      
      // Weight calculation based on confidence and signal direction
      let weight = avgConfidence;
      if (bullishSignals > bearishSignals) {
        weight *= 1.2; // Boost for bullish signals
      } else if (bearishSignals > bullishSignals) {
        weight *= 0.8; // Reduce for bearish signals
      }
      
      weights[symbol] = Math.max(0, Math.min(1, weight));
    });
    
    return weights;
  }

  private applyRiskConstraints(
    weights: Record<string, number>,
    riskParams: RebalanceParams['riskParams']
  ): Record<string, number> {
    let constrainedWeights = { ...weights };
    
    // Apply maximum volatility constraint
    const currentVolatility = this.calculatePortfolioVolatility(constrainedWeights);
    if (currentVolatility > riskParams.maxVolatility) {
      // Reduce weights proportionally to meet volatility target
      const reductionFactor = riskParams.maxVolatility / currentVolatility;
      Object.keys(constrainedWeights).forEach(symbol => {
        constrainedWeights[symbol] *= reductionFactor;
      });
    }
    
    // Apply VaR constraint
    const currentVaR = this.calculatePortfolioVaR(constrainedWeights);
    if (currentVaR > riskParams.maxVaR) {
      // Reduce weights to meet VaR target
      const reductionFactor = riskParams.maxVaR / currentVaR;
      Object.keys(constrainedWeights).forEach(symbol => {
        constrainedWeights[symbol] *= reductionFactor;
      });
    }
    
    // Apply Sharpe ratio optimization
    const targetSharpe = riskParams.targetSharpeRatio;
    const currentSharpe = this.calculatePortfolioSharpeRatio(constrainedWeights);
    
    if (currentSharpe < targetSharpe) {
      // Optimize weights to improve Sharpe ratio
      constrainedWeights = this.optimizeSharpeRatio(constrainedWeights, targetSharpe);
    }
    
    return constrainedWeights;
  }

  private normalizeWeights(weights: Record<string, number>): Record<string, number> {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) {
      // Equal weight allocation if no AI signals
      const symbols = Object.keys(this.currentAllocation);
      const equalWeight = 1 / symbols.length;
      symbols.forEach(symbol => {
        weights[symbol] = equalWeight;
      });
      return weights;
    }
    
    // Normalize to sum to 1
    Object.keys(weights).forEach(symbol => {
      weights[symbol] /= totalWeight;
    });
    
    return weights;
  }

  private convertToTargetAllocation(weights: Record<string, number>): TargetAllocation {
    const allocation: TargetAllocation = {};
    
    Object.entries(weights).forEach(([symbol, weight]) => {
      allocation[symbol] = {
        targetPercentage: weight * 100,
        minPercentage: Math.max(0, weight * 100 - 5), // 5% buffer
        maxPercentage: Math.min(100, weight * 100 + 5) // 5% buffer
      };
    });
    
    return allocation;
  }

  generateRebalanceOrders(
    currentAllocation: CurrentAllocation,
    targetAllocation: TargetAllocation,
    constraints: RebalanceParams['constraints']
  ): Trade[] {
    const orders: Trade[] = [];
    
    Object.entries(targetAllocation).forEach(([symbol, target]) => {
      const current = currentAllocation[symbol];
      if (!current) return;
      
      const currentPercentage = current.percentage;
      const targetPercentage = target.targetPercentage;
      const deviation = Math.abs(currentPercentage - targetPercentage);
      
      // Check if rebalancing is needed
      if (deviation > 2) { // 2% threshold
        const targetValue = (targetPercentage / 100) * this.totalPortfolioValue;
        const currentValue = current.value;
        const valueDifference = targetValue - currentValue;
        
        if (Math.abs(valueDifference) >= constraints.minTradeSize) {
          const trade: Trade = {
            id: `rebalance_${symbol}_${Date.now()}`,
            symbol,
            type: valueDifference > 0 ? 'buy' : 'sell',
            amount: Math.abs(valueDifference) / current.price,
            price: current.price,
            timestamp: Date.now(),
            pnl: 0,
            status: 'pending',
            metadata: {
              rebalance: true,
              currentPercentage,
              targetPercentage,
              deviation
            }
          };
          
          orders.push(trade);
        }
      }
    });
    
    return orders;
  }

  assessRebalanceNeed(
    currentAllocation: CurrentAllocation,
    targetAllocation: TargetAllocation,
    threshold: number = 5
  ): {
    needsRebalancing: boolean;
    deviations: Array<{
      symbol: string;
      currentPercentage: number;
      targetPercentage: number;
      deviation: number;
    }>;
    totalDeviation: number;
  } {
    const deviations: Array<{
      symbol: string;
      currentPercentage: number;
      targetPercentage: number;
      deviation: number;
    }> = [];
    
    let totalDeviation = 0;
    
    Object.entries(targetAllocation).forEach(([symbol, target]) => {
      const current = currentAllocation[symbol];
      if (!current) return;
      
      const deviation = Math.abs(current.percentage - target.targetPercentage);
      totalDeviation += deviation;
      
      deviations.push({
        symbol,
        currentPercentage: current.percentage,
        targetPercentage: target.targetPercentage,
        deviation
      });
    });
    
    const needsRebalancing = totalDeviation > threshold;
    
    return {
      needsRebalancing,
      deviations,
      totalDeviation
    };
  }

  async executeRebalance(
    orders: Trade[],
    tradeExecutionCallback: (trade: Trade) => Promise<boolean>
  ): Promise<{
    success: boolean;
    executedTrades: Trade[];
    failedTrades: Trade[];
    totalCost: number;
  }> {
    const executedTrades: Trade[] = [];
    const failedTrades: Trade[] = [];
    let totalCost = 0;
    
    for (const order of orders) {
      try {
        const success = await tradeExecutionCallback(order);
        
        if (success) {
          order.status = 'completed';
          executedTrades.push(order);
          totalCost += order.amount * order.price * 0.001; // 0.1% fee
        } else {
          order.status = 'failed';
          failedTrades.push(order);
        }
      } catch (error) {
        order.status = 'failed';
        failedTrades.push(order);
        console.error(`Failed to execute rebalance trade: ${error}`);
      }
    }
    
    return {
      success: failedTrades.length === 0,
      executedTrades,
      failedTrades,
      totalCost
    };
  }

  generateRebalanceRecommendation(
    params: RebalanceParams
  ): RebalanceRecommendation {
    const { currentAllocation, aiSignals, riskParams, constraints } = params;
    
    // Calculate optimal allocation
    const targetAllocation = this.calculateOptimalAllocation(
      currentAllocation,
      aiSignals,
      riskParams
    );
    
    // Assess rebalancing need
    const rebalanceAssessment = this.assessRebalanceNeed(
      currentAllocation,
      targetAllocation,
      riskParams.rebalanceThreshold
    );
    
    // Generate rebalance orders
    const orders = this.generateRebalanceOrders(
      currentAllocation,
      targetAllocation,
      constraints
    );
    
    // Calculate expected impact
    const impact = this.calculateRebalanceImpact(
      currentAllocation,
      targetAllocation,
      orders
    );
    
    return {
      currentAllocation: Object.entries(currentAllocation).map(([symbol, pos]) => ({
        symbol,
        percentage: pos.percentage,
        value: pos.value
      })),
      targetAllocation: Object.entries(targetAllocation).map(([symbol, target]) => ({
        symbol,
        targetPercentage: target.targetPercentage,
        minPercentage: target.minPercentage,
        maxPercentage: target.maxPercentage
      })),
      trades: orders,
      reasoning: this.generateRebalanceReasoning(aiSignals, rebalanceAssessment, impact),
      impact,
      needsRebalancing: rebalanceAssessment.needsRebalancing,
      priority: this.calculateRebalancePriority(rebalanceAssessment, impact)
    };
  }

  private calculateRebalanceImpact(
    currentAllocation: CurrentAllocation,
    targetAllocation: TargetAllocation,
    orders: Trade[]
  ): {
    expectedReturn: number;
    riskReduction: number;
    costImpact: number;
    timeToRecovery: number;
  } {
    // Calculate expected return improvement
    const expectedReturn = orders.reduce((sum, order) => {
      const currentWeight = (currentAllocation[order.symbol]?.percentage || 0) / 100; // Convert to decimal
      const targetWeight = (targetAllocation[order.symbol]?.targetPercentage || 0) / 100; // Convert to decimal
      return sum + (targetWeight - currentWeight) * 0.02; // Assume 2% expected return per weight change
    }, 0);
    
    // Calculate risk reduction
    const currentRisk = this.calculatePortfolioRisk(currentAllocation);
    const targetRisk = this.calculatePortfolioRisk(targetAllocation);
    const riskReduction = currentRisk - targetRisk;
    
    // Calculate transaction costs
    const costImpact = orders.reduce((sum, order) => {
      return sum + (order.amount * order.price * 0.001); // 0.1% fee
    }, 0);
    
    // Estimate time to recover costs
    const timeToRecovery = costImpact > 0 ? costImpact / (expectedReturn * this.totalPortfolioValue / 365) : 0;
    
    return {
      expectedReturn,
      riskReduction,
      costImpact,
      timeToRecovery
    };
  }

  private generateRebalanceReasoning(
    aiSignals: AISignal[],
    assessment: any,
    impact: any
  ): string {
    const reasons: string[] = [];
    
    if (assessment.needsRebalancing) {
      reasons.push(`Portfolio allocation has drifted ${assessment.totalDeviation.toFixed(1)}% from target`);
    }
    
    if (aiSignals.length > 0) {
      const avgConfidence = aiSignals.reduce((sum, s) => sum + s.confidence, 0) / aiSignals.length;
      reasons.push(`AI signals indicate ${avgConfidence > 0.6 ? 'strong' : 'moderate'} confidence in allocation changes`);
    }
    
    if (impact.expectedReturn > 0.01) {
      reasons.push(`Expected return improvement of ${(impact.expectedReturn * 100).toFixed(2)}%`);
    }
    
    if (impact.riskReduction > 0) {
      reasons.push(`Risk reduction of ${(impact.riskReduction * 100).toFixed(2)}%`);
    }
    
    return reasons.join('. ') + '.';
  }

  private calculateRebalancePriority(
    assessment: any,
    impact: any
  ): 'high' | 'medium' | 'low' {
    const score = assessment.totalDeviation * 0.4 + 
                  impact.expectedReturn * 100 * 0.3 + 
                  impact.riskReduction * 100 * 0.3;
    
    if (score > 10) return 'high';
    if (score > 5) return 'medium';
    return 'low';
  }

  // Risk calculation methods
  private calculatePortfolioVolatility(weights: Record<string, number>): number {
    // Simplified volatility calculation
    return Object.values(weights).reduce((sum, weight) => sum + weight * 0.2, 0); // Assume 20% volatility per asset
  }

  private calculatePortfolioVaR(weights: Record<string, number>): number {
    // Simplified VaR calculation
    return Object.values(weights).reduce((sum, weight) => sum + weight * 0.05, 0); // Assume 5% VaR per asset
  }

  private calculatePortfolioSharpeRatio(weights: Record<string, number>): number {
    // Simplified Sharpe ratio calculation
    const expectedReturn = Object.values(weights).reduce((sum, weight) => sum + weight * 0.1, 0); // Assume 10% return per asset
    const volatility = this.calculatePortfolioVolatility(weights);
    return volatility > 0 ? (expectedReturn - 0.02) / volatility : 0; // 2% risk-free rate
  }

  private calculatePortfolioRisk(allocation: CurrentAllocation | TargetAllocation): number {
    // Simplified portfolio risk calculation
    return 0.15; // Placeholder
  }

  private optimizeSharpeRatio(
    weights: Record<string, number>,
    targetSharpe: number
  ): Record<string, number> {
    // Simplified Sharpe ratio optimization
    // In a real implementation, this would use quadratic programming
    return weights;
  }
}

