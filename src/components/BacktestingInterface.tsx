import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { BacktestEngine } from '../utils/backtestEngine';
import { BacktestConfig, BacktestResult, PortfolioMetrics } from '../shared/types';
import { 
  Play, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  Settings,
  Calendar,
  DollarSign,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

interface StrategyTemplate {
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

const strategyTemplates: StrategyTemplate[] = [
  {
    name: 'Conservative LSTM',
    description: 'Low-risk strategy using LSTM predictions with tight risk controls',
    aiModel: 'lstm',
    riskParams: {
      maxPositionSize: 0.1,
      stopLoss: 0.05,
      takeProfit: 0.15,
      maxDrawdown: 0.1
    },
    tradingParams: {
      minConfidence: 0.7,
      rebalanceFrequency: 7,
      slippageModel: 'fixed'
    }
  },
  {
    name: 'Aggressive RL',
    description: 'High-risk strategy using reinforcement learning with dynamic allocation',
    aiModel: 'reinforcement',
    riskParams: {
      maxPositionSize: 0.3,
      stopLoss: 0.1,
      takeProfit: 0.25,
      maxDrawdown: 0.2
    },
    tradingParams: {
      minConfidence: 0.5,
      rebalanceFrequency: 1,
      slippageModel: 'volatility'
    }
  },
  {
    name: 'Balanced Ensemble',
    description: 'Moderate risk strategy combining multiple AI models',
    aiModel: 'ensemble',
    riskParams: {
      maxPositionSize: 0.2,
      stopLoss: 0.07,
      takeProfit: 0.2,
      maxDrawdown: 0.15
    },
    tradingParams: {
      minConfidence: 0.6,
      rebalanceFrequency: 3,
      slippageModel: 'volume'
    }
  }
];

export const BacktestingInterface: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyTemplate>(strategyTemplates[0]);
  const [backtestConfig, setBacktestConfig] = useState<BacktestConfig>({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    endDate: new Date(),
    initialCapital: 10000,
    symbols: ['AVAX/USDT']
  });
  
  const [customParams, setCustomParams] = useState({
    maxPositionSize: selectedStrategy.riskParams.maxPositionSize,
    minConfidence: selectedStrategy.tradingParams.minConfidence,
    maxDrawdown: selectedStrategy.riskParams.maxDrawdown
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('setup');

  const backtestEngineRef = useRef(new BacktestEngine());

  const handleStrategyChange = (strategyName: string) => {
    const strategy = strategyTemplates.find(s => s.name === strategyName);
    if (strategy) {
      setSelectedStrategy(strategy);
      setCustomParams({
        maxPositionSize: strategy.riskParams.maxPositionSize,
        minConfidence: strategy.tradingParams.minConfidence,
        maxDrawdown: strategy.riskParams.maxDrawdown
      });
    }
  };

  const runBacktest = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResults(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const strategy = {
        ...selectedStrategy,
        riskParams: {
          ...selectedStrategy.riskParams,
          maxPositionSize: customParams.maxPositionSize,
          maxDrawdown: customParams.maxDrawdown
        },
        tradingParams: {
          ...selectedStrategy.tradingParams,
          minConfidence: customParams.minConfidence
        }
      };

      const result = await backtestEngineRef.current.runBacktest(strategy, backtestConfig);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResults(result);
      
      // Reset progress after a delay
      setTimeout(() => setProgress(0), 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setIsRunning(false);
    }
  }, [selectedStrategy, backtestConfig, customParams]);

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

  const exportResults = () => {
    if (!results) return;
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backtest-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Strategy Backtesting
          </CardTitle>
          <CardDescription>
            Test and validate trading strategies using historical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="results" disabled={!results}>Results</TabsTrigger>
              <TabsTrigger value="comparison" disabled={!results}>Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              {/* Strategy Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Strategy Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Strategy Template</Label>
                    <Select value={selectedStrategy.name} onValueChange={handleStrategyChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {strategyTemplates.map((strategy) => (
                          <SelectItem key={strategy.name} value={strategy.name}>
                            {strategy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {selectedStrategy.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Zap className="w-4 h-4" />
                      <span className="font-medium capitalize">{selectedStrategy.aiModel}</span>
                      <Badge variant="outline">{selectedStrategy.tradingParams.slippageModel}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backtest Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Backtest Setup</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={backtestConfig.startDate.toISOString().split('T')[0]}
                      onChange={(e) => setBacktestConfig(prev => ({
                        ...prev,
                        startDate: new Date(e.target.value)
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={backtestConfig.endDate.toISOString().split('T')[0]}
                      onChange={(e) => setBacktestConfig(prev => ({
                        ...prev,
                        endDate: new Date(e.target.value)
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Initial Capital</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={backtestConfig.initialCapital}
                        onChange={(e) => setBacktestConfig(prev => ({
                          ...prev,
                          initialCapital: parseFloat(e.target.value) || 10000
                        }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Trading Pair</Label>
                    <Select value={backtestConfig.symbols?.[0]} onValueChange={(value) => setBacktestConfig(prev => ({
                      ...prev,
                      symbols: [value]
                    }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAX/USDT">AVAX/USDT</SelectItem>
                        <SelectItem value="AVAX/USDC">AVAX/USDC</SelectItem>
                        <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Risk Parameters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Risk Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Max Position Size: {formatPercentage(customParams.maxPositionSize)}</Label>
                    <Slider
                      value={[customParams.maxPositionSize * 100]}
                      onValueChange={([value]) => setCustomParams(prev => ({
                        ...prev,
                        maxPositionSize: value / 100
                      }))}
                      max={50}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Min Confidence: {formatPercentage(customParams.minConfidence)}</Label>
                    <Slider
                      value={[customParams.minConfidence * 100]}
                      onValueChange={([value]) => setCustomParams(prev => ({
                        ...prev,
                        minConfidence: value / 100
                      }))}
                      max={100}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Drawdown: {formatPercentage(customParams.maxDrawdown)}</Label>
                    <Slider
                      value={[customParams.maxDrawdown * 100]}
                      onValueChange={([value]) => setCustomParams(prev => ({
                        ...prev,
                        maxDrawdown: value / 100
                      }))}
                      max={50}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* Run Backtest */}
              <div className="space-y-4">
                <Button 
                  onClick={runBacktest} 
                  disabled={isRunning}
                  className="w-full"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Running Backtest...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Backtest
                    </>
                  )}
                </Button>

                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {results && (
                <>
                  {/* Performance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                          <p className={cn("text-2xl font-bold", getMetricColor(results.metrics.totalReturn, 0.1))}>
                            {formatPercentage(results.metrics.totalReturn)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
                          <p className={cn("text-2xl font-bold", getMetricColor(results.metrics.sharpeRatio, 1))}>
                            {results.metrics.sharpeRatio.toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Max Drawdown</p>
                          <p className={cn("text-2xl font-bold", getMetricColor(results.metrics.maxDrawdown, 0.1, true))}>
                            {formatPercentage(results.metrics.maxDrawdown)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                          <p className={cn("text-2xl font-bold", getMetricColor(results.metrics.winRate, 0.5))}>
                            {formatPercentage(results.metrics.winRate)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Equity Curve */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Equity Curve</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Equity Curve Chart</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Annualized Return</span>
                          <span className="font-medium">{formatPercentage(results.metrics.annualizedReturn)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Volatility</span>
                          <span className="font-medium">{formatPercentage(results.metrics.volatility)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Profit Factor</span>
                          <span className="font-medium">{results.metrics.profitFactor.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Trade</span>
                          <span className="font-medium">{formatCurrency(results.metrics.averageTrade)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Trades</span>
                          <span className="font-medium">{results.trades.length}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Trade Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {results.trades.slice(0, 5).map((trade, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium">{trade.symbol}</p>
                                <p className="text-sm text-muted-foreground">
                                  {trade.type.toUpperCase()} - {formatCurrency(trade.amount * trade.price)}
                                </p>
                              </div>
                              <Badge variant={trade.pnl >= 0 ? 'default' : 'secondary'}>
                                {formatCurrency(trade.pnl)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Export Results */}
                  <div className="flex justify-end">
                    <Button onClick={exportResults} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export Results
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-6">
              {results && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Strategy Comparison</h3>
                  <p className="text-muted-foreground">
                    Compare this strategy against buy-and-hold and other strategies
                  </p>
                  
                  <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Strategy Comparison Chart</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

