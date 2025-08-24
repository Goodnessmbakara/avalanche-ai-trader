import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { usePortfolioAnalytics } from '../hooks/usePortfolioAnalytics';
import { useWeb3 } from '../hooks/useWeb3';
import { useAITrading } from '../hooks/useAITrading';
import { PortfolioRebalancer } from '../utils/portfolioRebalancer';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export const PortfolioSummary: React.FC = () => {
  const {
    portfolioMetrics,
    riskMetrics,
    aiPerformanceMetrics,
    portfolioHistory,
    rebalanceRecommendations,
    isLoading,
    error,
    calculateRealTimePnL,
    refreshAnalytics
  } = usePortfolioAnalytics();

  const { avaxBalance, usdtBalance, portfolioValueUSDT, avaxPriceUSDT } = useWeb3();
  const { currentSignal } = useAITrading();
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Derive balances object locally from available fields
  const balances = useMemo(() => ({
    AVAX: avaxBalance,
    USDT: usdtBalance
  }), [avaxBalance, usdtBalance]);

  // Use portfolioValueUSDT for portfolio value
  const portfolioValue = portfolioValueUSDT;

  const realTimePnL = calculateRealTimePnL();
  const pnlColor = realTimePnL >= 0 ? 'text-green-600' : 'text-red-600';
  const pnlIcon = realTimePnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;

  const handleRebalance = async () => {
    setIsRebalancing(true);
    try {
      // Open the rebalancing modal in TradingDashboard
      // This would typically be done through a callback prop or context
      console.log('Opening rebalancing interface...');
      
      // For now, simulate the action
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you would:
      // 1. Call a callback to open the rebalancing modal
      // 2. Or navigate to the rebalancing interface
      // 3. Or trigger the rebalancing flow directly
      
    } catch (error) {
      console.error('Failed to open rebalancing interface:', error);
    } finally {
      setIsRebalancing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getRiskColor = (value: number, threshold: number) => {
    if (value <= threshold * 0.5) return 'text-green-600';
    if (value <= threshold) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading portfolio data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error loading portfolio data: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Portfolio Summary</CardTitle>
              <CardDescription>Real-time portfolio performance and analytics</CardDescription>
            </div>
            <Button onClick={refreshAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Portfolio Value */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(portfolioMetrics.totalValue)}</p>
              <div className="flex items-center space-x-1">
                {pnlIcon}
                <span className={cn("text-sm font-medium", pnlColor)}>
                  {formatCurrency(realTimePnL)} ({formatPercentage(portfolioMetrics.totalReturn)})
                </span>
              </div>
            </div>

            {/* Total Return */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Return</p>
              <p className={cn("text-2xl font-bold", pnlColor)}>
                {formatPercentage(portfolioMetrics.totalReturn)}
              </p>
              <p className="text-sm text-muted-foreground">
                Annualized: {formatPercentage(portfolioMetrics.annualizedReturn)}
              </p>
            </div>

            {/* Sharpe Ratio */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
              <p className={cn("text-2xl font-bold", getRiskColor(portfolioMetrics.sharpeRatio, 1))}>
                {portfolioMetrics.sharpeRatio.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Risk-adjusted return
              </p>
            </div>

            {/* Max Drawdown */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Max Drawdown</p>
              <p className={cn("text-2xl font-bold", getRiskColor(portfolioMetrics.maxDrawdown, 0.1))}>
                {formatPercentage(portfolioMetrics.maxDrawdown)}
              </p>
              <p className="text-sm text-muted-foreground">
                Peak to trough decline
              </p>
            </div>
          </div>

          {/* Real-time P&L Chart Placeholder */}
          <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Portfolio Value Chart</p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
              <TabsTrigger value="ai">AI Performance</TabsTrigger>
              <TabsTrigger value="rebalance">Rebalancing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Holdings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Current Holdings</h3>
                  {balances && Object.entries(balances).map(([token, balance]) => (
                    <div key={token} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{token}</p>
                        <p className="text-sm text-muted-foreground">
                          {balance.toFixed(4)} {token}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(balance * (token === 'AVAX' ? avaxPriceUSDT : 1))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {((balance * (token === 'AVAX' ? avaxPriceUSDT : 1)) / portfolioMetrics.totalValue * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trading Statistics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Trading Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Win Rate</span>
                      <span className="font-medium">{formatPercentage(portfolioMetrics.winRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Factor</span>
                      <span className="font-medium">{portfolioMetrics.profitFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Trade</span>
                      <span className="font-medium">{formatCurrency(portfolioMetrics.averageTrade)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volatility</span>
                      <span className="font-medium">{formatPercentage(portfolioMetrics.volatility)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risk Metrics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Risk Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Value at Risk (95%)</span>
                      <span className={cn("font-medium", getRiskColor(riskMetrics.var, 0.05))}>
                        {formatPercentage(riskMetrics.var)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conditional VaR</span>
                      <span className={cn("font-medium", getRiskColor(riskMetrics.cvar, 0.08))}>
                        {formatPercentage(riskMetrics.cvar)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Beta</span>
                      <span className="font-medium">{riskMetrics.beta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Information Ratio</span>
                      <span className="font-medium">{riskMetrics.informationRatio.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Alerts */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Risk Alerts</h3>
                  <div className="space-y-2">
                    {portfolioMetrics.maxDrawdown > 0.1 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Maximum drawdown exceeds 10% threshold
                        </AlertDescription>
                      </Alert>
                    )}
                    {riskMetrics.var > 0.05 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          VaR exceeds 5% risk limit
                        </AlertDescription>
                      </Alert>
                    )}
                    {portfolioMetrics.sharpeRatio < 1 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Sharpe ratio below optimal level
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Performance Metrics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">AI Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Prediction Accuracy</span>
                      <span className="font-medium">{formatPercentage(aiPerformanceMetrics.predictionAccuracy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Signal Effectiveness</span>
                      <span className="font-medium">{formatPercentage(aiPerformanceMetrics.signalEffectiveness)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence Correlation</span>
                      <span className="font-medium">{aiPerformanceMetrics.confidenceCorrelation.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Confidence</span>
                      <span className="font-medium">{formatPercentage(aiPerformanceMetrics.averageConfidence)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Signals</span>
                      <span className="font-medium">{aiPerformanceMetrics.signalCount}</span>
                    </div>
                  </div>
                </div>

                {/* AI Signal Analysis */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Recent AI Signals</h3>
                  <div className="space-y-2">
                    {currentSignal && (
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">Current Signal</p>
                          <p className="text-sm text-muted-foreground">
                            {currentSignal.action.toUpperCase()} - {formatPercentage(currentSignal.confidence)}
                          </p>
                        </div>
                        <Badge variant={currentSignal.action === 'buy' ? 'default' : 'secondary'}>
                          {currentSignal.action}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rebalance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current vs Target Allocation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Allocation Analysis</h3>
                  {rebalanceRecommendations.length > 0 ? (
                    rebalanceRecommendations[0].targetAllocation.map((target) => {
                      const current = rebalanceRecommendations[0].currentAllocation.find(c => c.symbol === target.symbol);
                      const currentPercentage = current?.percentage || 0;
                      
                      return (
                        <div key={target.symbol} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{target.symbol}</span>
                            <span>{currentPercentage.toFixed(1)}% / {target.targetPercentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={currentPercentage} className="h-2" />
                        </div>
                      );
                    })
                  ) : (
                    balances && Object.entries(balances).map(([token, balance]) => {
                      const currentPercentage = (balance * (token === 'AVAX' ? avaxPriceUSDT : 1)) / portfolioMetrics.totalValue * 100;
                      
                      return (
                        <div key={token} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{token}</span>
                            <span>{currentPercentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={currentPercentage} className="h-2" />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Rebalancing Recommendations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Rebalancing</h3>
                  <div className="space-y-3">
                    {rebalanceRecommendations.length > 0 ? (
                      <>
                        <div className="p-3 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Portfolio Drift</p>
                          <p className="font-medium">
                            {rebalanceRecommendations[0].targetAllocation.reduce((sum, target) => {
                              const current = rebalanceRecommendations[0].currentAllocation.find(c => c.symbol === target.symbol);
                              return sum + Math.abs((current?.percentage || 0) - target.targetPercentage);
                            }, 0).toFixed(1)}% from target allocation
                          </p>
                        </div>
                        
                        <div className="p-3 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Expected Impact</p>
                          <p className="font-medium text-green-600">
                            +{(rebalanceRecommendations[0].impact.expectedReturn * 100).toFixed(1)}% return improvement
                          </p>
                          <p className="text-sm text-muted-foreground">
                            -{(rebalanceRecommendations[0].impact.riskReduction * 100).toFixed(1)}% risk reduction
                          </p>
                        </div>

                        <Button 
                          onClick={handleRebalance} 
                          disabled={isRebalancing}
                          className="w-full"
                        >
                          {isRebalancing ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Rebalancing...
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4 mr-2" />
                              Execute Rebalancing
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No rebalancing recommendations available</p>
                        <Button 
                          onClick={handleRebalance} 
                          disabled={isRebalancing}
                          variant="outline"
                        >
                          {isRebalancing ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4 mr-2" />
                              Open Rebalancing Interface
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};