import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
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
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  BarChart3, 
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
  Trophy,
  Award,
  TrendingUpIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

interface BenchmarkData {
  date: string;
  portfolio: number;
  benchmark: number;
  excess: number;
  riskFree: number;
}

interface PerformanceMetrics {
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  sharpeRatio: number;
  benchmarkSharpe: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  trackingError: number;
  maxDrawdown: number;
  benchmarkMaxDrawdown: number;
  volatility: number;
  benchmarkVolatility: number;
  correlation: number;
}

export const PerformanceComparison: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
  const [benchmark, setBenchmark] = useState<'AVAX' | 'SPY' | 'QQQ' | 'BTC'>('AVAX');
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock benchmark data
  const mockBenchmarkData: BenchmarkData[] = useMemo(() => {
    const data: BenchmarkData[] = [];
    const startValue = 10000;
    let portfolioValue = startValue;
    let benchmarkValue = startValue;
    const riskFreeRate = 0.02; // 2% annual risk-free rate
    
    for (let i = 365; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic returns with some correlation
      const marketReturn = (Math.random() - 0.5) * 0.04; // ±2% daily
      const portfolioReturn = marketReturn + (Math.random() - 0.5) * 0.02; // Portfolio has some alpha
      const benchmarkReturn = marketReturn + (Math.random() - 0.5) * 0.01; // Benchmark follows market
      
      portfolioValue *= (1 + portfolioReturn);
      benchmarkValue *= (1 + benchmarkReturn);
      
      const riskFreeValue = startValue * Math.pow(1 + riskFreeRate / 365, 365 - i);
      
      data.push({
        date: date.toLocaleDateString(),
        portfolio: portfolioValue,
        benchmark: benchmarkValue,
        excess: portfolioValue - benchmarkValue,
        riskFree: riskFreeValue
      });
    }
    
    return data;
  }, []);

  // Calculate performance metrics
  const performanceMetrics: PerformanceMetrics = useMemo(() => {
    const data = mockBenchmarkData;
    const initialPortfolio = data[0].portfolio;
    const initialBenchmark = data[0].benchmark;
    const finalPortfolio = data[data.length - 1].portfolio;
    const finalBenchmark = data[data.length - 1].benchmark;
    
    const portfolioReturn = ((finalPortfolio - initialPortfolio) / initialPortfolio) * 100;
    const benchmarkReturn = ((finalBenchmark - initialBenchmark) / initialBenchmark) * 100;
    const excessReturn = portfolioReturn - benchmarkReturn;
    
    // Calculate daily returns
    const portfolioReturns = [];
    const benchmarkReturns = [];
    for (let i = 1; i < data.length; i++) {
      portfolioReturns.push((data[i].portfolio - data[i-1].portfolio) / data[i-1].portfolio);
      benchmarkReturns.push((data[i].benchmark - data[i-1].benchmark) / data[i-1].benchmark);
    }
    
    // Calculate volatility
    const portfolioMean = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length;
    
    const portfolioVariance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - portfolioMean, 2), 0) / portfolioReturns.length;
    const benchmarkVariance = benchmarkReturns.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / benchmarkReturns.length;
    
    const volatility = Math.sqrt(portfolioVariance * 365) * 100; // Annualized
    const benchmarkVolatility = Math.sqrt(benchmarkVariance * 365) * 100;
    
    // Calculate Sharpe ratios
    const riskFreeRate = 0.02; // 2% annual
    const sharpeRatio = (portfolioReturn - riskFreeRate) / volatility;
    const benchmarkSharpe = (benchmarkReturn - riskFreeRate) / benchmarkVolatility;
    
    // Calculate Beta and Alpha
    const covariance = portfolioReturns.reduce((sum, r, i) => sum + (r - portfolioMean) * (benchmarkReturns[i] - benchmarkMean), 0) / portfolioReturns.length;
    const beta = covariance / benchmarkVariance;
    const alpha = (portfolioReturn - riskFreeRate) - beta * (benchmarkReturn - riskFreeRate);
    
    // Calculate Information Ratio and Tracking Error
    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
    const excessMean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const trackingError = Math.sqrt(excessReturns.reduce((sum, r) => sum + Math.pow(r - excessMean, 2), 0) / excessReturns.length * 365) * 100;
    const informationRatio = excessReturn / trackingError;
    
    // Calculate correlation
    const correlation = covariance / (Math.sqrt(portfolioVariance) * Math.sqrt(benchmarkVariance));
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = data[0].portfolio;
    data.forEach(point => {
      if (point.portfolio > peak) peak = point.portfolio;
      const drawdown = (peak - point.portfolio) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    let benchmarkMaxDrawdown = 0;
    let benchmarkPeak = data[0].benchmark;
    data.forEach(point => {
      if (point.benchmark > benchmarkPeak) benchmarkPeak = point.benchmark;
      const drawdown = (benchmarkPeak - point.benchmark) / benchmarkPeak * 100;
      if (drawdown > benchmarkMaxDrawdown) benchmarkMaxDrawdown = drawdown;
    });
    
    return {
      portfolioReturn,
      benchmarkReturn,
      excessReturn,
      sharpeRatio,
      benchmarkSharpe,
      beta,
      alpha,
      informationRatio,
      trackingError,
      maxDrawdown,
      benchmarkMaxDrawdown,
      volatility,
      benchmarkVolatility,
      correlation
    };
  }, [mockBenchmarkData]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return mockBenchmarkData.map(point => ({
      ...point,
      portfolioReturn: ((point.portfolio - mockBenchmarkData[0].portfolio) / mockBenchmarkData[0].portfolio) * 100,
      benchmarkReturn: ((point.benchmark - mockBenchmarkData[0].benchmark) / mockBenchmarkData[0].benchmark) * 100,
      excessReturn: ((point.portfolio - mockBenchmarkData[0].portfolio) / mockBenchmarkData[0].portfolio) * 100 - 
                   ((point.benchmark - mockBenchmarkData[0].benchmark) / mockBenchmarkData[0].benchmark) * 100
    }));
  }, [mockBenchmarkData]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getPerformanceIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Comparison</h2>
          <p className="text-muted-foreground">
            Portfolio vs Benchmark Performance Analysis
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
            Comparison Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">Last Month</SelectItem>
                  <SelectItem value="3M">Last 3 Months</SelectItem>
                  <SelectItem value="6M">Last 6 Months</SelectItem>
                  <SelectItem value="1Y">Last Year</SelectItem>
                  <SelectItem value="ALL">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Benchmark</label>
              <Select value={benchmark} onValueChange={(value: any) => setBenchmark(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAX">AVAX</SelectItem>
                  <SelectItem value="SPY">S&P 500 (SPY)</SelectItem>
                  <SelectItem value="QQQ">NASDAQ (QQQ)</SelectItem>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Return</CardTitle>
            {getPerformanceIcon(performanceMetrics.portfolioReturn)}
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getPerformanceColor(performanceMetrics.portfolioReturn))}>
              {performanceMetrics.portfolioReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs {performanceMetrics.benchmarkReturn.toFixed(2)}% benchmark
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excess Return</CardTitle>
            {getPerformanceIcon(performanceMetrics.excessReturn)}
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getPerformanceColor(performanceMetrics.excessReturn))}>
              {performanceMetrics.excessReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Alpha generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              vs {performanceMetrics.benchmarkSharpe.toFixed(2)} benchmark
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Information Ratio</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getPerformanceColor(performanceMetrics.informationRatio))}>
              {performanceMetrics.informationRatio.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted alpha
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Chart</TabsTrigger>
          <TabsTrigger value="excess">Excess Returns</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Comparison Chart</CardTitle>
              <CardDescription>
                Portfolio vs {benchmark} Performance Over Time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="portfolioReturn"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Portfolio Return %"
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmarkReturn"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name={`${benchmark} Return %`}
                  />
                  <Line
                    type="monotone"
                    dataKey="riskFree"
                    stroke="#ffc658"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="Risk-Free Rate"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excess" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Excess Returns Analysis</CardTitle>
              <CardDescription>
                Portfolio performance relative to benchmark
              </CardDescription>
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
                    dataKey="excessReturn"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Excess Return %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Volatility Comparison</CardTitle>
                <CardDescription>Risk metrics comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Portfolio', volatility: performanceMetrics.volatility },
                    { name: benchmark, volatility: performanceMetrics.benchmarkVolatility }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="volatility" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maximum Drawdown</CardTitle>
                <CardDescription>Risk comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Portfolio', drawdown: performanceMetrics.maxDrawdown },
                    { name: benchmark, drawdown: performanceMetrics.benchmarkMaxDrawdown }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="drawdown" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Correlation Analysis</CardTitle>
              <CardDescription>
                Relationship between portfolio and benchmark returns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {performanceMetrics.correlation.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground">Correlation</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {performanceMetrics.beta.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground">Beta</p>
                </div>
                <div className="text-center">
                  <div className={cn("text-3xl font-bold", getPerformanceColor(performanceMetrics.alpha))}>
                    {performanceMetrics.alpha.toFixed(3)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Alpha</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Metrics */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Performance Metrics</CardTitle>
            <CardDescription>Detailed analysis of portfolio vs benchmark performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Return Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Portfolio Return:</span>
                    <span className={cn("text-sm font-medium", getPerformanceColor(performanceMetrics.portfolioReturn))}>
                      {performanceMetrics.portfolioReturn.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Benchmark Return:</span>
                    <span className={cn("text-sm font-medium", getPerformanceColor(performanceMetrics.benchmarkReturn))}>
                      {performanceMetrics.benchmarkReturn.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Excess Return:</span>
                    <span className={cn("text-sm font-medium", getPerformanceColor(performanceMetrics.excessReturn))}>
                      {performanceMetrics.excessReturn.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Alpha:</span>
                    <span className={cn("text-sm font-medium", getPerformanceColor(performanceMetrics.alpha))}>
                      {performanceMetrics.alpha.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Risk Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Portfolio Volatility:</span>
                    <span className="text-sm font-medium">{performanceMetrics.volatility.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Benchmark Volatility:</span>
                    <span className="text-sm font-medium">{performanceMetrics.benchmarkVolatility.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Portfolio Sharpe:</span>
                    <span className="text-sm font-medium">{performanceMetrics.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Benchmark Sharpe:</span>
                    <span className="text-sm font-medium">{performanceMetrics.benchmarkSharpe.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Risk-Adjusted Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Information Ratio:</span>
                    <span className={cn("text-sm font-medium", getPerformanceColor(performanceMetrics.informationRatio))}>
                      {performanceMetrics.informationRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tracking Error:</span>
                    <span className="text-sm font-medium">{performanceMetrics.trackingError.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Beta:</span>
                    <span className="text-sm font-medium">{performanceMetrics.beta.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Correlation:</span>
                    <span className="text-sm font-medium">{performanceMetrics.correlation.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Drawdown Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Portfolio Max DD:</span>
                    <span className="text-sm font-medium text-red-600">
                      -{performanceMetrics.maxDrawdown.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Benchmark Max DD:</span>
                    <span className="text-sm font-medium text-red-600">
                      -{performanceMetrics.benchmarkMaxDrawdown.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">DD Improvement:</span>
                    <span className={cn("text-sm font-medium", 
                      performanceMetrics.maxDrawdown < performanceMetrics.benchmarkMaxDrawdown ? "text-green-600" : "text-red-600"
                    )}>
                      {(performanceMetrics.benchmarkMaxDrawdown - performanceMetrics.maxDrawdown).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
