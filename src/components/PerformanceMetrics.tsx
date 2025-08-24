import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { usePortfolioAnalytics } from '../hooks/usePortfolioAnalytics';
import { useTradeExecution } from '../hooks/useTradeExecution';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target, 
  AlertTriangle, 
  Download,
  Calendar,
  DollarSign,
  Activity,
  PieChart,
  LineChart,
  Scatter
} from 'lucide-react';
import { cn } from '../lib/utils';

type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface BenchmarkData {
  name: string;
  return: number;
  volatility: number;
  sharpeRatio: number;
}

const benchmarks: BenchmarkData[] = [
  { name: 'AVAX Buy & Hold', return: 0.15, volatility: 0.25, sharpeRatio: 0.6 },
  { name: 'S&P 500', return: 0.08, volatility: 0.15, sharpeRatio: 0.53 },
  { name: 'Crypto Market', return: 0.12, volatility: 0.35, sharpeRatio: 0.34 }
];

export const PerformanceMetrics: React.FC = () => {
  const {
    portfolioMetrics,
    riskMetrics,
    aiPerformanceMetrics,
    portfolioHistory,
    isLoading,
    error
  } = usePortfolioAnalytics();

  const { getExecutionStats } = useTradeExecution();

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('AVAX Buy & Hold');
  const [activeTab, setActiveTab] = useState('overview');

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

  const getMetricColor = (value: number, threshold: number, reverse = false) => {
    const isGood = reverse ? value <= threshold : value >= threshold;
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  const getMetricIcon = (value: number, threshold: number, reverse = false) => {
    const isGood = reverse ? value <= threshold : value >= threshold;
    return isGood ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const calculatePeriodReturns = (period: TimePeriod) => {
    if (!portfolioHistory.length) return 0;
    
    const now = Date.now();
    let startTime: number;
    
    switch (period) {
      case '1D':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '1W':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '1M':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '3M':
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case '1Y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case 'ALL':
        return portfolioMetrics.totalReturn;
      default:
        return 0;
    }
    
    const startEntry = portfolioHistory.find(entry => entry.timestamp >= startTime);
    const endEntry = portfolioHistory[portfolioHistory.length - 1];
    
    if (!startEntry || !endEntry) return 0;
    
    return (endEntry.totalValue - startEntry.totalValue) / startEntry.totalValue;
  };

  const selectedBenchmarkData = benchmarks.find(b => b.name === selectedBenchmark);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading performance metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error loading performance metrics: {error}</AlertDescription>
      </Alert>
    );
  }

  const periodReturn = calculatePeriodReturns(selectedPeriod);

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Performance Metrics</CardTitle>
              <CardDescription>Comprehensive portfolio performance analysis</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1D">1D</SelectItem>
                  <SelectItem value="1W">1W</SelectItem>
                  <SelectItem value="1M">1M</SelectItem>
                  <SelectItem value="3M">3M</SelectItem>
                  <SelectItem value="1Y">1Y</SelectItem>
                  <SelectItem value="ALL">ALL</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Period Return */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{selectedPeriod} Return</p>
              <div className="flex items-center space-x-2">
                {getMetricIcon(periodReturn, 0)}
                <p className={cn("text-2xl font-bold", getMetricColor(periodReturn, 0))}>
                  {formatPercentage(periodReturn)}
                </p>
              </div>
            </div>

            {/* Total Return */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Return</p>
              <div className="flex items-center space-x-2">
                {getMetricIcon(portfolioMetrics.totalReturn, 0)}
                <p className={cn("text-2xl font-bold", getMetricColor(portfolioMetrics.totalReturn, 0))}>
                  {formatPercentage(portfolioMetrics.totalReturn)}
                </p>
              </div>
            </div>

            {/* Annualized Return */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Annualized Return</p>
              <div className="flex items-center space-x-2">
                {getMetricIcon(portfolioMetrics.annualizedReturn, 0.08)}
                <p className={cn("text-2xl font-bold", getMetricColor(portfolioMetrics.annualizedReturn, 0.08))}>
                  {formatPercentage(portfolioMetrics.annualizedReturn)}
                </p>
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
              <div className="flex items-center space-x-2">
                {getMetricIcon(portfolioMetrics.sharpeRatio, 1)}
                <p className={cn("text-2xl font-bold", getMetricColor(portfolioMetrics.sharpeRatio, 1))}>
                  {portfolioMetrics.sharpeRatio.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
              <TabsTrigger value="trades">Trade Analysis</TabsTrigger>
              <TabsTrigger value="ai">AI Performance</TabsTrigger>
              <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="w-5 h-5" />
                      Portfolio Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Portfolio Value Chart</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Key Performance Indicators</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Win Rate</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatPercentage(portfolioMetrics.winRate)}</span>
                          <Badge variant={portfolioMetrics.winRate > 0.5 ? 'default' : 'secondary'}>
                            {portfolioMetrics.winRate > 0.5 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Profit Factor</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{portfolioMetrics.profitFactor.toFixed(2)}</span>
                          <Badge variant={portfolioMetrics.profitFactor > 1.5 ? 'default' : 'secondary'}>
                            {portfolioMetrics.profitFactor > 1.5 ? 'Excellent' : 'Fair'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Average Trade</span>
                        <span className={cn("font-medium", getMetricColor(portfolioMetrics.averageTrade, 0))}>
                          {formatCurrency(portfolioMetrics.averageTrade)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Volatility</span>
                        <span className={cn("font-medium", getMetricColor(portfolioMetrics.volatility, 0.2, true))}>
                          {formatPercentage(portfolioMetrics.volatility)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="risk" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risk Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Value at Risk (95%)</span>
                        <span className={cn("font-medium", getMetricColor(riskMetrics.var, 0.05, true))}>
                          {formatPercentage(riskMetrics.var)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Conditional VaR</span>
                        <span className={cn("font-medium", getMetricColor(riskMetrics.cvar, 0.08, true))}>
                          {formatPercentage(riskMetrics.cvar)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Maximum Drawdown</span>
                        <span className={cn("font-medium", getMetricColor(portfolioMetrics.maxDrawdown, 0.1, true))}>
                          {formatPercentage(portfolioMetrics.maxDrawdown)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Beta</span>
                        <span className="font-medium">{riskMetrics.beta.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Information Ratio</span>
                        <span className={cn("font-medium", getMetricColor(riskMetrics.informationRatio, 0.5))}>
                          {riskMetrics.informationRatio.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
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
                      {portfolioMetrics.volatility > 0.3 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            High volatility detected
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Drawdown Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Drawdown Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Drawdown Chart</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trades" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trade Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Trade Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Trade Distribution Chart</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Trade Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Trade Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {(() => {
                        const stats = getExecutionStats();
                        const totalTrades = stats.totalExecuted;
                        const winningTrades = stats.successful;
                        const losingTrades = totalTrades - winningTrades;
                        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
                        
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Total Trades</span>
                              <span className="font-medium">{totalTrades}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Winning Trades</span>
                              <span className="font-medium text-green-600">{winningTrades}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Losing Trades</span>
                              <span className="font-medium text-red-600">{losingTrades}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Win Rate</span>
                              <span className="font-medium">{formatPercentage(winRate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Volume</span>
                              <span className="font-medium">{formatCurrency(stats.totalVolume)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Average Trade Size</span>
                              <span className="font-medium">{formatCurrency(totalTrades > 0 ? stats.totalVolume / totalTrades : 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Success Rate</span>
                              <span className="font-medium">{formatPercentage(stats.successRate)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Prediction Accuracy</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatPercentage(aiPerformanceMetrics.predictionAccuracy)}</span>
                          <Badge variant={aiPerformanceMetrics.predictionAccuracy > 0.6 ? 'default' : 'secondary'}>
                            {aiPerformanceMetrics.predictionAccuracy > 0.6 ? 'Good' : 'Needs Training'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Signal Effectiveness</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatPercentage(aiPerformanceMetrics.signalEffectiveness)}</span>
                          <Badge variant={aiPerformanceMetrics.signalEffectiveness > 0.4 ? 'default' : 'secondary'}>
                            {aiPerformanceMetrics.signalEffectiveness > 0.4 ? 'Effective' : 'Weak'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Confidence Correlation</span>
                        <span className={cn("font-medium", getMetricColor(aiPerformanceMetrics.confidenceCorrelation, 0.3))}>
                          {aiPerformanceMetrics.confidenceCorrelation.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Average Confidence</span>
                        <span className="font-medium">{formatPercentage(aiPerformanceMetrics.averageConfidence)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Total Signals</span>
                        <span className="font-medium">{aiPerformanceMetrics.signalCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Signal Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Signal Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">AI Signal Performance Chart</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="benchmark" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Benchmark Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Benchmark Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Benchmark</span>
                        <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {benchmarks.map((benchmark) => (
                              <SelectItem key={benchmark.name} value={benchmark.name}>
                                {benchmark.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedBenchmarkData && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Return vs Benchmark</span>
                            <span className={cn("font-medium", getMetricColor(portfolioMetrics.totalReturn - selectedBenchmarkData.return, 0))}>
                              {formatPercentage(portfolioMetrics.totalReturn - selectedBenchmarkData.return)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Sharpe vs Benchmark</span>
                            <span className={cn("font-medium", getMetricColor(portfolioMetrics.sharpeRatio - selectedBenchmarkData.sharpeRatio, 0))}>
                              {(portfolioMetrics.sharpeRatio - selectedBenchmarkData.sharpeRatio).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Volatility vs Benchmark</span>
                            <span className={cn("font-medium", getMetricColor(selectedBenchmarkData.volatility - portfolioMetrics.volatility, 0))}>
                              {formatPercentage(selectedBenchmarkData.volatility - portfolioMetrics.volatility)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Benchmark Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Benchmark Comparison Chart</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

