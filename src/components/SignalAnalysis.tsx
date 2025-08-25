import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  BarChart3, 
  PieChart as PieChartIcon,
  Calendar,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Filter,
  Download,
  Eye,
  EyeOff,
  DollarSign
} from 'lucide-react';
import { useAITrading } from '../hooks/useAITrading';
import { usePortfolioAnalytics } from '../hooks/usePortfolioAnalytics';
import { cn } from '../lib/utils';

interface SignalData {
  timestamp: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  predictedPrice: number;
  actualPrice?: number;
  accuracy?: boolean;
  profitLoss?: number;
  volume: number;
  marketCondition: 'bullish' | 'bearish' | 'neutral';
}

interface SignalPerformance {
  totalSignals: number;
  accurateSignals: number;
  accuracyRate: number;
  averageConfidence: number;
  totalProfitLoss: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  signalDistribution: {
    buy: number;
    sell: number;
    hold: number;
  };
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export const SignalAnalysis: React.FC = () => {
  const { currentSignal, currentPrediction, predictionHistory } = useAITrading();
  const { aiPerformanceMetrics } = usePortfolioAnalytics();
  
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [signalType, setSignalType] = useState<'all' | 'buy' | 'sell' | 'hold'>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(70);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock signal data for demonstration
  const mockSignalData: SignalData[] = useMemo(() => {
    const now = Date.now();
    const data: SignalData[] = [];
    
    for (let i = 30; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000); // Daily data
      const signal = Math.random() > 0.6 ? 'BUY' : Math.random() > 0.3 ? 'SELL' : 'HOLD';
      const confidence = Math.random() * 40 + 60; // 60-100%
      const predictedPrice = 40 + Math.random() * 20;
      const actualPrice = predictedPrice + (Math.random() - 0.5) * 5;
      const accuracy = Math.random() > 0.3; // 70% accuracy
      const profitLoss = accuracy ? (Math.random() * 10 - 2) : (Math.random() * -10 + 2);
      
      data.push({
        timestamp,
        signal,
        confidence,
        predictedPrice,
        actualPrice,
        accuracy,
        profitLoss,
        volume: Math.random() * 1000000 + 500000,
        marketCondition: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'bearish' : 'neutral'
      });
    }
    
    return data;
  }, []);

  // Calculate performance metrics
  const performanceMetrics: SignalPerformance = useMemo(() => {
    const filteredData = mockSignalData.filter(signal => {
      if (signalType !== 'all' && signal.signal.toLowerCase() !== signalType) return false;
      if (signal.confidence < confidenceThreshold) return false;
      return true;
    });

    const totalSignals = filteredData.length;
    const accurateSignals = filteredData.filter(s => s.accuracy).length;
    const accuracyRate = totalSignals > 0 ? (accurateSignals / totalSignals) * 100 : 0;
    const averageConfidence = filteredData.reduce((sum, s) => sum + s.confidence, 0) / totalSignals;
    const totalProfitLoss = filteredData.reduce((sum, s) => sum + (s.profitLoss || 0), 0);
    const winRate = filteredData.filter(s => s.profitLoss && s.profitLoss > 0).length / totalSignals * 100;
    const averageReturn = totalSignals > 0 ? totalProfitLoss / totalSignals : 0;

    // Calculate Sharpe Ratio (simplified)
    const returns = filteredData.map(s => s.profitLoss || 0);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;

    // Calculate Max Drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningTotal = 0;
    filteredData.forEach(signal => {
      runningTotal += signal.profitLoss || 0;
      if (runningTotal > peak) peak = runningTotal;
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Signal distribution
    const signalDistribution = {
      buy: filteredData.filter(s => s.signal === 'BUY').length,
      sell: filteredData.filter(s => s.signal === 'SELL').length,
      hold: filteredData.filter(s => s.signal === 'HOLD').length
    };

    // Confidence distribution
    const confidenceDistribution = {
      high: filteredData.filter(s => s.confidence >= 80).length,
      medium: filteredData.filter(s => s.confidence >= 60 && s.confidence < 80).length,
      low: filteredData.filter(s => s.confidence < 60).length
    };

    return {
      totalSignals,
      accurateSignals,
      accuracyRate,
      averageConfidence,
      totalProfitLoss,
      winRate,
      averageReturn,
      sharpeRatio,
      maxDrawdown,
      signalDistribution,
      confidenceDistribution
    };
  }, [mockSignalData, signalType, confidenceThreshold]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return mockSignalData
      .filter(signal => {
        if (signalType !== 'all' && signal.signal.toLowerCase() !== signalType) return false;
        if (signal.confidence < confidenceThreshold) return false;
        return true;
      })
      .map(signal => ({
        date: new Date(signal.timestamp).toLocaleDateString(),
        predictedPrice: signal.predictedPrice,
        actualPrice: signal.actualPrice,
        confidence: signal.confidence,
        profitLoss: signal.profitLoss,
        signal: signal.signal,
        accuracy: signal.accuracy ? 1 : 0
      }));
  }, [mockSignalData, signalType, confidenceThreshold]);

  // Signal distribution chart data
  const signalDistributionData = useMemo(() => {
    const { signalDistribution } = performanceMetrics;
    return [
      { name: 'Buy', value: signalDistribution.buy, color: '#10b981' },
      { name: 'Sell', value: signalDistribution.sell, color: '#ef4444' },
      { name: 'Hold', value: signalDistribution.hold, color: '#6b7280' }
    ];
  }, [performanceMetrics]);

  // Confidence distribution chart data
  const confidenceDistributionData = useMemo(() => {
    const { confidenceDistribution } = performanceMetrics;
    return [
      { name: 'High (80%+)', value: confidenceDistribution.high, color: '#10b981' },
      { name: 'Medium (60-80%)', value: confidenceDistribution.medium, color: '#f59e0b' },
      { name: 'Low (<60%)', value: confidenceDistribution.low, color: '#ef4444' }
    ];
  }, [performanceMetrics]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-green-600 bg-green-100';
      case 'SELL': return 'text-red-600 bg-red-100';
      case 'HOLD': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Signal Analysis</h2>
          <p className="text-muted-foreground">
            AI Signal Performance and Analysis Dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Analysis Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1D">Last 24 Hours</SelectItem>
                  <SelectItem value="1W">Last Week</SelectItem>
                  <SelectItem value="1M">Last Month</SelectItem>
                  <SelectItem value="3M">Last 3 Months</SelectItem>
                  <SelectItem value="1Y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Signal Type</label>
              <Select value={signalType} onValueChange={(value: any) => setSignalType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Signals</SelectItem>
                  <SelectItem value="buy">Buy Only</SelectItem>
                  <SelectItem value="sell">Sell Only</SelectItem>
                  <SelectItem value="hold">Hold Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Min Confidence</label>
              <Select value={confidenceThreshold.toString()} onValueChange={(value) => setConfidenceThreshold(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="60">60%</SelectItem>
                  <SelectItem value="70">70%</SelectItem>
                  <SelectItem value="80">80%</SelectItem>
                  <SelectItem value="90">90%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.totalSignals}</div>
            <p className="text-xs text-muted-foreground">
              {performanceMetrics.accurateSignals} accurate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.accuracyRate.toFixed(1)}%</div>
            <Progress value={performanceMetrics.accuracyRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Profitable trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              performanceMetrics.totalProfitLoss >= 0 ? "text-green-600" : "text-red-600"
            )}>
              ${performanceMetrics.totalProfitLoss.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average: ${performanceMetrics.averageReturn.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Chart</TabsTrigger>
          <TabsTrigger value="signals">Signal Distribution</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Analysis</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Signal Performance Chart</CardTitle>
              <CardDescription>
                Predicted vs Actual Prices and Signal Performance Over Time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="predictedPrice"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Predicted Price"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="actualPrice"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Actual Price"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="profitLoss"
                    fill={(entry) => entry.profitLoss >= 0 ? "#10b981" : "#ef4444"}
                    name="Profit/Loss"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Signal Distribution</CardTitle>
                <CardDescription>Distribution of Buy, Sell, and Hold signals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={signalDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {signalDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signal Performance by Type</CardTitle>
                <CardDescription>Performance metrics for each signal type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['BUY', 'SELL', 'HOLD'].map((signal) => {
                    const signalData = mockSignalData.filter(s => s.signal === signal);
                    const accuracy = signalData.length > 0 
                      ? (signalData.filter(s => s.accuracy).length / signalData.length) * 100 
                      : 0;
                    const avgProfit = signalData.length > 0
                      ? signalData.reduce((sum, s) => sum + (s.profitLoss || 0), 0) / signalData.length
                      : 0;

                    return (
                      <div key={signal} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge className={getSignalColor(signal)}>
                            {signal}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{signalData.length} signals</p>
                            <p className="text-xs text-muted-foreground">
                              {accuracy.toFixed(1)}% accurate
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-medium",
                            avgProfit >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ${avgProfit.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Avg P&L</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="confidence" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Distribution</CardTitle>
                <CardDescription>Distribution of signal confidence levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={confidenceDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {confidenceDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confidence vs Accuracy</CardTitle>
                <CardDescription>Relationship between confidence and prediction accuracy</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="confidence" name="Confidence" domain={[50, 100]} />
                    <YAxis type="number" dataKey="accuracy" name="Accuracy" domain={[0, 1]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={chartData} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy Trends Over Time</CardTitle>
              <CardDescription>Signal accuracy and performance trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="confidence"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Confidence %"
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                    name="Accuracy (0-1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Metrics */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Performance Metrics</CardTitle>
            <CardDescription>Detailed analysis of AI signal performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Risk Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Sharpe Ratio:</span>
                    <span className="text-sm font-medium">{performanceMetrics.sharpeRatio.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Max Drawdown:</span>
                    <span className="text-sm font-medium text-red-600">${performanceMetrics.maxDrawdown.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Confidence:</span>
                    <span className="text-sm font-medium">{performanceMetrics.averageConfidence.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Signal Quality</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                                          <span className="text-sm">High Confidence (&gt;80%):</span>
                    <span className="text-sm font-medium">{performanceMetrics.confidenceDistribution.high}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Medium Confidence (60-80%):</span>
                    <span className="text-sm font-medium">{performanceMetrics.confidenceDistribution.medium}</span>
                  </div>
                  <div className="flex justify-between">
                                          <span className="text-sm">Low Confidence (&lt;60%):</span>
                    <span className="text-sm font-medium">{performanceMetrics.confidenceDistribution.low}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Current Status</h4>
                <div className="space-y-2">
                  {currentSignal && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Signal:</span>
                      <Badge className={getSignalColor(currentSignal.action)}>
                        {currentSignal.action}
                      </Badge>
                    </div>
                  )}
                  {currentPrediction && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Predicted Price:</span>
                      <span className="text-sm font-medium">${currentPrediction.price.toFixed(2)}</span>
                    </div>
                  )}
                  {currentSignal && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Confidence:</span>
                      <span className={cn("text-sm font-medium", getConfidenceColor(currentSignal.confidence))}>
                        {currentSignal.confidence.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
