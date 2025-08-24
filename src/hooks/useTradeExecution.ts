import { useState, useCallback, useRef, useEffect } from 'react';
import { useWeb3 } from './useWeb3';
import { useAITrading } from './useAITrading';
import { 
  validateRiskLimits, 
  calculatePositionSizeWithAI,
  performRiskAssessment,
  MarketConditions 
} from '@/utils/riskManagement';
import { TradeParameters, TradeResult, TradeStatus } from '@/shared/types';

interface PendingTrade extends TradeParameters {
  id: string;
  timestamp: Date;
  status: TradeStatus;
  priority: number;
  retryCount: number;
  maxRetries: number;
  fromSymbol?: string;
  toSymbol?: string;
}

interface ExecutionStatus {
  isExecuting: boolean;
  currentTradeId: string | null;
  queueLength: number;
  lastExecutionTime: Date | null;
  errors: string[];
}

interface PerformanceMetrics {
  totalExecuted: number;
  successful: number;
  failed: number;
  averageExecutionTime: number;
  successRate: number;
  totalVolume: number;
}

export const useTradeExecution = () => {
  const {
    web3,
    account,
    isConnected,
    avaxBalance,
    usdtBalance,
    executeManualTrade,
    executeAIValidatedTrade,
    estimateGas,
    validateTrade,
    monitorTransaction,
  } = useWeb3();

  const {
    currentPrediction,
    currentSignal,
    isInitialized,
    getAISignal,
  } = useAITrading();

  // State management
  const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);
  const [tradeQueue, setTradeQueue] = useState<PendingTrade[]>([]);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({
    isExecuting: false,
    currentTradeId: null,
    queueLength: 0,
    lastExecutionTime: null,
    errors: [],
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalExecuted: 0,
    successful: 0,
    failed: 0,
    averageExecutionTime: 0,
    successRate: 0,
    totalVolume: 0,
  });

  // Refs for optimization
  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueProcessingRef = useRef<boolean>(false);

  // Calculate portfolio value
  const portfolioValue = avaxBalance + usdtBalance;

  // Generate unique trade ID
  const generateTradeId = useCallback((): string => {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Queue a trade for execution
  const queueTrade = useCallback((
    tradeParams: Omit<TradeParameters, 'deadline'> & {
      fromSymbol?: string;
      toSymbol?: string;
    },
    priority: number = 1
  ): string => {
    const tradeId = generateTradeId();
    const pendingTrade: PendingTrade = {
      ...tradeParams,
      id: tradeId,
      timestamp: new Date(),
      status: TradeStatus.PENDING,
      priority,
      retryCount: 0,
      maxRetries: 3,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
      fromSymbol: tradeParams.fromSymbol,
      toSymbol: tradeParams.toSymbol,
    };

    setPendingTrades(prev => [...prev, pendingTrade]);
    setTradeQueue(prev => [...prev, pendingTrade].sort((a, b) => b.priority - a.priority));
    setExecutionStatus(prev => ({ ...prev, queueLength: prev.queueLength + 1 }));

    console.log(`Trade queued: ${tradeId}`, pendingTrade);
    return tradeId;
  }, [generateTradeId]);

  // Validate trade before execution
  const validateTradeExecution = useCallback(async (
    trade: PendingTrade
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic trade validation
    const tradeValidation = await validateTrade(trade);
    if (!tradeValidation.isValid) {
      errors.push(...tradeValidation.errors);
    }

    // Risk limit validation
    const riskValidation = validateRiskLimits(
      trade.amount,
      portfolioValue,
      10, // Max 10% risk per trade
      pendingTrades.reduce((sum, t) => sum + t.amount, 0)
    );
    if (!riskValidation.isValid) {
      errors.push(...riskValidation.errors);
    }
    warnings.push(...riskValidation.warnings);

    // AI validation (if required)
    if (trade.aiValidation && currentSignal) {
      if (currentSignal.confidence < 70) {
        warnings.push(`Low AI confidence: ${currentSignal.confidence}%`);
      }
      
      const isAIMatch = (currentSignal.action === 'BUY' && trade.toSymbol === 'AVAX') ||
                       (currentSignal.action === 'SELL' && trade.fromSymbol === 'AVAX');
      if (!isAIMatch) {
        warnings.push('AI recommendation differs from trade direction');
      }
    }

    // Market condition validation
    if (trade.amount > portfolioValue * 0.1) {
      warnings.push('Large trade size - consider breaking into smaller trades');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }, [validateTrade, portfolioValue, pendingTrades, currentSignal]);

  // Execute a single trade
  const executeTrade = useCallback(async (trade: PendingTrade): Promise<TradeResult | null> => {
    const startTime = Date.now();
    
    try {
      // Update execution status
      setExecutionStatus(prev => ({
        ...prev,
        isExecuting: true,
        currentTradeId: trade.id,
      }));

      // Validate trade
      const validation = await validateTradeExecution(trade);
      if (!validation.isValid) {
        throw new Error(`Trade validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        console.warn(`Trade warnings for ${trade.id}:`, validation.warnings);
      }

      // Estimate gas
      const gasEstimate = await estimateGas(trade);
      if (gasEstimate && gasEstimate > 500000) {
        console.warn(`High gas estimate: ${gasEstimate} units`);
      }

      // Execute trade
      let result: TradeResult | null;
      if (trade.useSmartContract) {
        result = await executeAIValidatedTrade(
          trade.fromToken,
          trade.toToken,
          trade.amount,
          trade.slippage
        );
      } else {
        result = await executeManualTrade(
          trade.fromToken,
          trade.toToken,
          trade.amount,
          trade.slippage,
          trade.useSmartContract
        );
      }

      if (result) {
        // Update trade status
        setPendingTrades(prev => 
          prev.map(t => 
            t.id === trade.id 
              ? { ...t, status: TradeStatus.COMPLETED }
              : t
          )
        );

        // Update performance metrics
        const executionTime = Date.now() - startTime;
        setPerformanceMetrics(prev => ({
          ...prev,
          totalExecuted: prev.totalExecuted + 1,
          successful: prev.successful + 1,
          successRate: ((prev.successful + 1) / (prev.totalExecuted + 1)) * 100,
          averageExecutionTime: (prev.averageExecutionTime * prev.totalExecuted + executionTime) / (prev.totalExecuted + 1),
          totalVolume: prev.totalVolume + trade.amount,
        }));

        console.log(`Trade executed successfully: ${trade.id}`, result);
        return result;
      } else {
        throw new Error('Trade execution returned null result');
      }
    } catch (error: any) {
      // Handle execution failure
      const errorMessage = error.message || 'Unknown execution error';
      
      // Update trade status
      setPendingTrades(prev => 
        prev.map(t => 
          t.id === trade.id 
            ? { 
                ...t, 
                status: TradeStatus.FAILED,
                retryCount: t.retryCount + 1
              }
            : t
        )
      );

      // Update performance metrics
      setPerformanceMetrics(prev => ({
        ...prev,
        totalExecuted: prev.totalExecuted + 1,
        failed: prev.failed + 1,
        successRate: (prev.successful / (prev.totalExecuted + 1)) * 100,
      }));

      // Add to errors
      setExecutionStatus(prev => ({
        ...prev,
        errors: [...prev.errors.slice(-9), errorMessage], // Keep last 10 errors
      }));

      console.error(`Trade execution failed: ${trade.id}`, error);
      return null;
    } finally {
      // Update execution status
      setExecutionStatus(prev => ({
        ...prev,
        isExecuting: false,
        currentTradeId: null,
        lastExecutionTime: new Date(),
      }));
    }
  }, [
    validateTradeExecution,
    estimateGas,
    executeAIValidatedTrade,
    executeManualTrade,
  ]);

  // Optimize trade execution
  const optimizeTradeExecution = useCallback(async (): Promise<void> => {
    if (queueProcessingRef.current || !isConnected) return;

    queueProcessingRef.current = true;

    try {
      // Get next trade from queue
      const nextTrade = tradeQueue[0];
      if (!nextTrade) {
        queueProcessingRef.current = false;
        return;
      }

      // Check if trade is still valid (not expired)
      const now = Math.floor(Date.now() / 1000);
      if (nextTrade.deadline < now) {
        // Remove expired trade
        setTradeQueue(prev => prev.slice(1));
        setPendingTrades(prev => 
          prev.map(t => 
            t.id === nextTrade.id 
              ? { ...t, status: TradeStatus.FAILED }
              : t
          )
        );
        console.log(`Trade expired: ${nextTrade.id}`);
        queueProcessingRef.current = false;
        return;
      }

      // Execute trade
      await executeTrade(nextTrade);

      // Remove from queue
      setTradeQueue(prev => prev.slice(1));
      setExecutionStatus(prev => ({ ...prev, queueLength: prev.queueLength - 1 }));

    } catch (error) {
      console.error('Error in trade execution optimization:', error);
    } finally {
      queueProcessingRef.current = false;
    }
  }, [tradeQueue, isConnected, executeTrade]);

  // Batch trades for efficient execution
  const batchTrades = useCallback(async (trades: PendingTrade[]): Promise<TradeResult[]> => {
    const results: TradeResult[] = [];
    
    // Group trades by type (buy/sell) and execute in batches
    const buyTrades = trades.filter(t => t.toSymbol === 'AVAX');
    const sellTrades = trades.filter(t => t.fromSymbol === 'AVAX');

    // Execute buy trades first
    for (const trade of buyTrades) {
      const result = await executeTrade(trade);
      if (result) results.push(result);
    }

    // Execute sell trades
    for (const trade of sellTrades) {
      const result = await executeTrade(trade);
      if (result) results.push(result);
    }

    return results;
  }, [executeTrade]);

  // Schedule delayed trade
  const scheduleDelayedTrade = useCallback((
    tradeParams: Omit<TradeParameters, 'deadline'> & {
      fromSymbol?: string;
      toSymbol?: string;
    },
    delayMinutes: number,
    priority: number = 1
  ): string => {
    const tradeId = generateTradeId();
    
    setTimeout(() => {
      queueTrade(tradeParams, priority);
    }, delayMinutes * 60 * 1000);

    return tradeId;
  }, [generateTradeId, queueTrade]);

  // Cancel pending trade
  const cancelTrade = useCallback((tradeId: string): boolean => {
    const tradeExists = pendingTrades.some(t => t.id === tradeId);
    
    if (tradeExists) {
      setPendingTrades(prev => 
        prev.map(t => 
          t.id === tradeId 
            ? { ...t, status: TradeStatus.CANCELLED }
            : t
        )
      );
      
      setTradeQueue(prev => prev.filter(t => t.id !== tradeId));
      setExecutionStatus(prev => ({ ...prev, queueLength: prev.queueLength - 1 }));
      
      console.log(`Trade cancelled: ${tradeId}`);
      return true;
    }
    
    return false;
  }, [pendingTrades]);

  // Get trade status
  const getTradeStatus = useCallback((tradeId: string): TradeStatus | null => {
    const trade = pendingTrades.find(t => t.id === tradeId);
    return trade ? trade.status : null;
  }, [pendingTrades]);

  // Monitor trade execution
  const monitorTradeExecution = useCallback(async (tradeId: string): Promise<void> => {
    const trade = pendingTrades.find(t => t.id === tradeId);
    if (!trade) return;

    // Monitor transaction if we have a hash
    if (trade.status === TradeStatus.COMPLETED) {
      // Could implement transaction monitoring here
      console.log(`Monitoring completed trade: ${tradeId}`);
    }
  }, [pendingTrades]);

  // Clear completed trades
  const clearCompletedTrades = useCallback(() => {
    setPendingTrades(prev => prev.filter(t => t.status === TradeStatus.PENDING));
  }, []);

  // Get execution statistics
  const getExecutionStats = useCallback(() => {
    const pending = pendingTrades.filter(t => t.status === TradeStatus.PENDING).length;
    const completed = pendingTrades.filter(t => t.status === TradeStatus.COMPLETED).length;
    const failed = pendingTrades.filter(t => t.status === TradeStatus.FAILED).length;
    const cancelled = pendingTrades.filter(t => t.status === TradeStatus.CANCELLED).length;

    return {
      pending,
      completed,
      failed,
      cancelled,
      total: pendingTrades.length,
      queueLength: tradeQueue.length,
      ...performanceMetrics,
    };
  }, [pendingTrades, tradeQueue, performanceMetrics]);

  // Process queue continuously
  const processQueue = useCallback(() => {
    if (executionTimeoutRef.current) {
      clearTimeout(executionTimeoutRef.current);
    }

    executionTimeoutRef.current = setTimeout(async () => {
      await optimizeTradeExecution();
      processQueue(); // Continue processing
    }, 5000); // Process every 5 seconds
  }, [optimizeTradeExecution]);

  // Start queue processing when connected
  useEffect(() => {
    if (isConnected && !executionTimeoutRef.current) {
      processQueue();
    }
    
    return () => {
      if (executionTimeoutRef.current) {
        clearTimeout(executionTimeoutRef.current);
      }
    };
  }, [isConnected, processQueue]);

  return {
    // State
    pendingTrades,
    tradeQueue,
    executionStatus,
    performanceMetrics,
    
    // Core functions
    queueTrade,
    executeTrade,
    cancelTrade,
    getTradeStatus,
    
    // Advanced functions
    batchTrades,
    scheduleDelayedTrade,
    monitorTradeExecution,
    optimizeTradeExecution,
    
    // Utility functions
    clearCompletedTrades,
    getExecutionStats,
    
    // Validation
    validateTradeExecution,
  };
};

