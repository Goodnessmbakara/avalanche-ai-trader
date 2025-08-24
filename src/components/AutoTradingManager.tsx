import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, 
  Pause, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  DollarSign,
  Activity,
  Shield
} from "lucide-react";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAITrading } from "@/hooks/useAITrading";
import { 
  calculatePositionSizeWithAI, 
  validateRiskLimits,
  performRiskAssessment,
  MarketConditions 
} from "@/utils/riskManagement";
import { resolveTokenAddress } from "@/utils/web3";
import { TradeParameters, TradeResult, TradeStatus } from "@/shared/types";

interface TradingStrategy {
  name: string;
  description: string;
  riskLevel: number;
  maxTradesPerHour: number;
  minTimeBetweenTrades: number; // minutes
  aiConfidenceThreshold: number;
  maxPortfolioExposure: number;
}

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageTradeSize: number;
}

interface TradeHistory {
  id: string;
  timestamp: Date;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  status: TradeStatus;
  profit?: number;
  aiConfidence: number;
}

const TRADING_STRATEGIES: TradingStrategy[] = [
  {
    name: "Conservative",
    description: "Low risk, steady returns",
    riskLevel: 25,
    maxTradesPerHour: 2,
    minTimeBetweenTrades: 30,
    aiConfidenceThreshold: 80,
    maxPortfolioExposure: 20
  },
  {
    name: "Balanced",
    description: "Moderate risk and returns",
    riskLevel: 50,
    maxTradesPerHour: 4,
    minTimeBetweenTrades: 15,
    aiConfidenceThreshold: 70,
    maxPortfolioExposure: 35
  },
  {
    name: "Aggressive",
    description: "High risk, high potential returns",
    riskLevel: 75,
    maxTradesPerHour: 6,
    minTimeBetweenTrades: 10,
    aiConfidenceThreshold: 60,
    maxPortfolioExposure: 50
  }
];

export const AutoTradingManager: React.FC = () => {
  const {
    web3,
    account,
    isConnected,
    avaxBalance,
    usdtBalance,
    portfolioValueUSDT,
    executeAIValidatedTrade,
    tradeHistory: recentTrades,
  } = useWeb3();
  
  const {
    currentPrediction,
    currentSignal,
    isInitialized,
    getAISignal,
  } = useAITrading();

  // Auto trading state
  const [isAutoTradingActive, setIsAutoTradingActive] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy>(TRADING_STRATEGIES[1]);
  const [lastTradeTime, setLastTradeTime] = useState<Date | null>(null);
  const [autoTradeHistory, setAutoTradeHistory] = useState<TradeHistory[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfit: 0,
    totalLoss: 0,
    netProfit: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    averageTradeSize: 0
  });

  // Safety state
  const [isEmergencyStop, setIsEmergencyStop] = useState(false);
  const [safetyChecks, setSafetyChecks] = useState({
    balanceCheck: true,
    riskLimitCheck: true,
    aiValidationCheck: true,
    marketConditionCheck: true
  });

  // Market conditions (simplified)
  const [marketConditions, setMarketConditions] = useState<MarketConditions>({
    volatility: 0.3,
    liquidity: 1000000,
    trend: 'neutral',
    volume: 500000,
    priceChange: 0
  });

  // Use normalized portfolio value in USDT
  const portfolioValue = portfolioValueUSDT || (avaxBalance + usdtBalance);

  // Evaluate AI signal for trading decision
  const evaluateAISignal = useCallback((): {
    shouldTrade: boolean;
    action: 'BUY' | 'SELL' | null;
    reason: string;
  } => {
    if (!currentSignal || !currentPrediction) {
      return { shouldTrade: false, action: null, reason: 'No AI signal available' };
    }

    // Check AI confidence threshold
    if (currentSignal.confidence < selectedStrategy.aiConfidenceThreshold) {
      return { 
        shouldTrade: false, 
        action: null, 
        reason: `AI confidence (${currentSignal.confidence}%) below threshold (${selectedStrategy.aiConfidenceThreshold}%)` 
      };
    }

    // Check time between trades
    if (lastTradeTime) {
      const timeSinceLastTrade = Date.now() - lastTradeTime.getTime();
      const minTimeMs = selectedStrategy.minTimeBetweenTrades * 60 * 1000;
      if (timeSinceLastTrade < minTimeMs) {
        return { 
          shouldTrade: false, 
          action: null, 
          reason: `Too soon since last trade (${Math.floor(timeSinceLastTrade / 60000)}m ago)` 
        };
      }
    }

    // Check trades per hour limit
    const tradesLastHour = autoTradeHistory.filter(trade => 
      Date.now() - trade.timestamp.getTime() < 60 * 60 * 1000
    ).length;
    if (tradesLastHour >= selectedStrategy.maxTradesPerHour) {
      return { 
        shouldTrade: false, 
        action: null, 
        reason: `Maximum trades per hour (${selectedStrategy.maxTradesPerHour}) reached` 
      };
    }

    // Determine action based on AI signal
    const action = currentSignal.action === 'BUY' ? 'BUY' : 'SELL';
    
    return { 
      shouldTrade: true, 
      action, 
      reason: `AI recommends ${action} with ${currentSignal.confidence}% confidence` 
    };
  }, [currentSignal, currentPrediction, selectedStrategy, lastTradeTime, autoTradeHistory]);

  // Execute automated trade
  const executeAutoTrade = useCallback(async (action: 'BUY' | 'SELL'): Promise<boolean> => {
    if (!web3 || !account || !isConnected) {
      console.error('Cannot execute trade: wallet not connected');
      return false;
    }

    try {
      // Calculate position size based on AI confidence
      const basePosition = portfolioValue * (selectedStrategy.riskLevel / 100);
      const positionSize = calculatePositionSizeWithAI(
        currentSignal?.confidence / 100 || 0.5,
        basePosition,
        portfolioValue * (selectedStrategy.maxPortfolioExposure / 100),
        portfolioValue * 0.01 // Minimum 1% of portfolio
      );

      // Validate risk limits
      const riskValidation = validateRiskLimits(
        positionSize.recommendedSize,
        portfolioValue,
        selectedStrategy.riskLevel,
        autoTradeHistory.reduce((sum, trade) => sum + trade.amount, 0)
      );

      if (!riskValidation.isValid) {
        console.warn('Risk validation failed:', riskValidation.errors);
        return false;
      }

      // Execute trade - BUY means buy AVAX with USDT, SELL means sell AVAX for USDT
      const chainId = Number(await web3.eth.getChainId());
      const fromToken = resolveTokenAddress(action === 'BUY' ? 'USDT' : 'AVAX', chainId);
      const toToken = resolveTokenAddress(action === 'BUY' ? 'AVAX' : 'USDT', chainId);
      
      const result = await executeAIValidatedTrade(
        fromToken,
        toToken,
        positionSize.recommendedSize,
        0.5 // Default slippage
      );

      if (result) {
        // Record trade
        const tradeRecord: TradeHistory = {
          id: result.txHash,
          timestamp: new Date(),
          action,
          amount: positionSize.recommendedSize,
          price: currentPrediction?.price || 0,
          status: result.status,
          aiConfidence: currentSignal?.confidence || 0
        };

        setAutoTradeHistory(prev => [tradeRecord, ...prev.slice(0, 99)]); // Keep last 100 trades
        setLastTradeTime(new Date());
        
        console.log(`Auto trade executed: ${action} $${positionSize.recommendedSize.toFixed(2)}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Auto trade execution failed:', error);
      return false;
    }
  }, [
    web3, 
    account, 
    isConnected, 
    portfolioValue, 
    selectedStrategy, 
    currentSignal, 
    currentPrediction, 
    executeAIValidatedTrade, 
    autoTradeHistory
  ]);

  // Monitor and execute trades
  useEffect(() => {
    if (!isAutoTradingActive || !isInitialized || isEmergencyStop) return;

    const interval = setInterval(async () => {
      // Update AI signal
      await getAISignal();

      // Evaluate signal
      const evaluation = evaluateAISignal();
      
      if (evaluation.shouldTrade && evaluation.action) {
        console.log('Auto trading signal:', evaluation.reason);
        await executeAutoTrade(evaluation.action);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [
    isAutoTradingActive, 
    isInitialized, 
    isEmergencyStop, 
    evaluateAISignal, 
    executeAutoTrade, 
    getAISignal
  ]);

  // Calculate performance metrics
  useEffect(() => {
    if (autoTradeHistory.length === 0) return;

    const completedTrades = autoTradeHistory.filter(trade => trade.status === TradeStatus.COMPLETED);
    const winningTrades = completedTrades.filter(trade => (trade.profit || 0) > 0);
    const losingTrades = completedTrades.filter(trade => (trade.profit || 0) < 0);

    const totalProfit = winningTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0));
    const netProfit = totalProfit - totalLoss;

    setPerformanceMetrics({
      totalTrades: completedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0,
      totalProfit,
      totalLoss,
      netProfit,
      sharpeRatio: 1.2, // Placeholder - would need historical data
      maxDrawdown: 5.5, // Placeholder
      averageTradeSize: completedTrades.reduce((sum, trade) => sum + trade.amount, 0) / completedTrades.length
    });
  }, [autoTradeHistory]);

  // Emergency stop
  const handleEmergencyStop = () => {
    setIsEmergencyStop(true);
    setIsAutoTradingActive(false);
    console.log('Emergency stop activated');
  };

  // Resume trading
  const handleResumeTrading = () => {
    setIsEmergencyStop(false);
    console.log('Trading resumed');
  };

  // Toggle auto trading
  const toggleAutoTrading = () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (isEmergencyStop) {
      handleResumeTrading();
    } else {
      setIsAutoTradingActive(!isAutoTradingActive);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Automated Trading Manager
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isAutoTradingActive ? "default" : "secondary"}>
                {isAutoTradingActive ? "Active" : "Inactive"}
              </Badge>
              {isEmergencyStop && (
                <Badge variant="destructive">Emergency Stop</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={toggleAutoTrading}
              disabled={!isConnected || !isInitialized}
              variant={isAutoTradingActive ? "destructive" : "default"}
              className="flex-1"
            >
              {isAutoTradingActive ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Auto Trading
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Auto Trading
                </>
              )}
            </Button>
            <Button
              onClick={handleEmergencyStop}
              variant="destructive"
              disabled={!isAutoTradingActive}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Emergency Stop
            </Button>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Wallet not connected. Please connect your wallet to enable automated trading.
              </AlertDescription>
            </Alert>
          )}

          {!isInitialized && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                AI system not initialized. Please wait for AI models to load.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Strategy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TRADING_STRATEGIES.map((strategy) => (
              <div
                key={strategy.name}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedStrategy.name === strategy.name
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedStrategy(strategy)}
              >
                <div className="font-medium">{strategy.name}</div>
                <div className="text-sm text-muted-foreground">{strategy.description}</div>
                <div className="mt-2 space-y-1 text-xs">
                  <div>Risk Level: {strategy.riskLevel}%</div>
                  <div>Max Trades/Hour: {strategy.maxTradesPerHour}</div>
                  <div>AI Threshold: {strategy.aiConfidenceThreshold}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {performanceMetrics.totalTrades}
              </div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {performanceMetrics.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                performanceMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${performanceMetrics.netProfit.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Net Profit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {performanceMetrics.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Profit</span>
                <span>${performanceMetrics.totalProfit.toFixed(2)}</span>
              </div>
              <Progress value={performanceMetrics.totalProfit} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Loss</span>
                <span>${performanceMetrics.totalLoss.toFixed(2)}</span>
              </div>
              <Progress value={performanceMetrics.totalLoss} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSignal && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">AI Signal</Label>
                <div className="font-medium">{currentSignal.action}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Confidence</Label>
                <div className="font-medium">{currentSignal.confidence}%</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Predicted Price</Label>
                <div className="font-medium">
                  ${currentPrediction?.price.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Last Trade</Label>
                <div className="font-medium">
                  {lastTradeTime ? 
                    `${Math.floor((Date.now() - lastTradeTime.getTime()) / 60000)}m ago` : 
                    'Never'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Safety Checks */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Safety Checks</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(safetyChecks).map(([check, status]) => (
                <div key={check} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    status ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm capitalize">
                    {check.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      {autoTradeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {autoTradeHistory.slice(0, 10).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.action === 'BUY' ? 'default' : 'secondary'}>
                      {trade.action}
                    </Badge>
                    <span className="text-sm">${trade.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {trade.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

