import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
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
  Shield,
  AlertCircle,
  TrendingUpIcon,
  DollarSign,
  Percent,
  Gauge,
  PieChart as PieChartIcon,
  Settings,
  RotateCcw,
  ArrowUpDown,
  Target as TargetIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AssetAllocation {
  symbol: string;
  name: string;
  currentValue: number;
  targetAllocation: number;
  currentAllocation: number;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  risk: 'low' | 'medium' | 'high';
  category: 'crypto' | 'stablecoin' | 'defi' | 'gaming';
}

interface RebalancingRecommendation {
  id: string;
  asset: string;
  action: 'buy' | 'sell';
  currentAmount: number;
  targetAmount: number;
  difference: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedCost: number;
  impact: 'positive' | 'negative' | 'neutral';
}

interface PortfolioMetrics {
  totalValue: number;
  totalChange24h: number;
  totalChange7d: number;
  diversificationScore: number;
  riskScore: number;
  rebalancingNeeded: boolean;
  lastRebalanced: Date;
  targetAllocation: {
    crypto: number;
    stablecoin: number;
    defi: number;
    gaming: number;
  };
}

export const AllocationAnalysis: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [viewMode, setViewMode] = useState<'current' | 'target' | 'difference'>('current');
  const [showRebalancing, setShowRebalancing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock asset allocation data
  const mockAllocations: AssetAllocation[] = useMemo(() => [
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      currentValue: 45000,
      targetAllocation: 60,
      currentAllocation: 58.5,
      price: 45.23,
      change24h: 2.34,
      change7d: -5.67,
      marketCap: 16000000000,
      volume24h: 450000000,
      risk: 'medium',
      category: 'crypto'
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      currentValue: 32000,
      targetAllocation: 40,
      currentAllocation: 41.5,
      price: 1.00,
      change24h: 0.01,
      change7d: 0.02,
      marketCap: 95000000000,
      volume24h: 85000000000,
      risk: 'low',
      category: 'stablecoin'
    }
  ], []);

  // Mock rebalancing recommendations
  const mockRebalancingRecommendations: RebalancingRecommendation[] = useMemo(() => {
    const recommendations: RebalancingRecommendation[] = [];
    
    mockAllocations.forEach(asset => {
      const difference = asset.targetAllocation - asset.currentAllocation;
      if (Math.abs(difference) > 1) { // Only recommend if difference > 1%
        recommendations.push({
          id: asset.symbol,
          asset: asset.symbol,
          action: difference > 0 ? 'buy' : 'sell',
          currentAmount: asset.currentValue,
          targetAmount: (asset.targetAllocation / 100) * 77000, // Total portfolio value
          difference: Math.abs(difference),
          priority: Math.abs(difference) > 5 ? 'high' : Math.abs(difference) > 2 ? 'medium' : 'low',
          reason: `Allocation is ${Math.abs(difference).toFixed(1)}% ${difference > 0 ? 'below' : 'above'} target`,
          estimatedCost: Math.abs(difference) * 770, // Rough estimate
          impact: difference > 0 ? 'positive' : 'negative'
        });
      }
    });
    
    return recommendations;
  }, [mockAllocations]);

  // Calculate portfolio metrics
  const portfolioMetrics: PortfolioMetrics = useMemo(() => {
    const totalValue = mockAllocations.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalChange24h = mockAllocations.reduce((sum, asset) => sum + (asset.currentValue * asset.change24h / 100), 0);
    const totalChange7d = mockAllocations.reduce((sum, asset) => sum + (asset.currentValue * asset.change7d / 100), 0);
    
    // Calculate diversification score (simplified)
    const allocationVariance = mockAllocations.reduce((sum, asset) => {
      return sum + Math.pow(asset.currentAllocation - 50, 2); // Distance from equal allocation
    }, 0) / mockAllocations.length;
    const diversificationScore = Math.max(0, 100 - allocationVariance);
    
    // Calculate risk score
    const riskWeights = { low: 1, medium: 2, high: 3 };
    const riskScore = mockAllocations.reduce((sum, asset) => {
      return sum + (asset.currentAllocation * riskWeights[asset.risk]);
    }, 0) / 100;
    
    const rebalancingNeeded = mockRebalancingRecommendations.length > 0;
    
    return {
      totalValue,
      totalChange24h,
      totalChange7d,
      diversificationScore,
      riskScore,
      rebalancingNeeded,
      lastRebalanced: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      targetAllocation: {
        crypto: 60,
        stablecoin: 40,
        defi: 0,
        gaming: 0
      }
    };
  }, [mockAllocations, mockRebalancingRecommendations]);

  // Chart data preparation
  const pieChartData = useMemo(() => {
    return mockAllocations.map(asset => ({
      name: asset.symbol,
      value: asset.currentValue,
      allocation: asset.currentAllocation,
      color: asset.symbol === 'AVAX' ? '#E84142' : '#26A17B'
    }));
  }, [mockAllocations]);

  const allocationComparisonData = useMemo(() => {
    return mockAllocations.map(asset => ({
      asset: asset.symbol,
      current: asset.currentAllocation,
      target: asset.targetAllocation,
      difference: asset.currentAllocation - asset.targetAllocation
    }));
  }, [mockAllocations]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? "text-green-600" : "text-red-600";
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionColor = (action: string) => {
    return action === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  const COLORS = ['#E84142', '#26A17B', '#F7931A', '#627EEA', '#00D4AA'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Allocation Analysis</h2>
          <p className="text-muted-foreground">
            Portfolio Asset Allocation and Rebalancing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            variant={portfolioMetrics.rebalancingNeeded ? "destructive" : "outline"} 
            size="sm" 
            onClick={() => setShowRebalancing(!showRebalancing)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {showRebalancing ? 'Close' : 'Open'} Rebalancing Interface
          </Button>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioMetrics.totalValue.toLocaleString()}</div>
            <div className={cn("flex items-center text-xs", getChangeColor(portfolioMetrics.totalChange24h))}>
              {getChangeIcon(portfolioMetrics.totalChange24h)}
              <span className="ml-1">${Math.abs(portfolioMetrics.totalChange24h).toFixed(2)} (24h)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diversification Score</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioMetrics.diversificationScore.toFixed(1)}%</div>
            <Progress value={portfolioMetrics.diversificationScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {portfolioMetrics.diversificationScore > 80 ? 'Excellent' : portfolioMetrics.diversificationScore > 60 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioMetrics.riskScore.toFixed(1)}</div>
            <Progress value={portfolioMetrics.riskScore * 33.33} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {portfolioMetrics.riskScore < 1.5 ? 'Low' : portfolioMetrics.riskScore < 2.5 ? 'Medium' : 'High'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rebalancing Status</CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioMetrics.rebalancingNeeded ? (
                <Badge variant="destructive" className="text-lg">
                  Needed
                </Badge>
              ) : (
                <Badge variant="default" className="text-lg">
                  Balanced
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {portfolioMetrics.rebalancingNeeded ? `${mockRebalancingRecommendations.length} recommendations` : 'Last: 7 days ago'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Allocation Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Allocation</CardTitle>
            <CardDescription>Portfolio asset distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAllocations.map((asset, index) => (
                <div key={asset.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                    <div>
                      <p className="font-medium">{asset.symbol}</p>
                      <p className="text-sm text-muted-foreground">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{asset.currentAllocation.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">${asset.currentValue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocation Chart</CardTitle>
            <CardDescription>Visual representation of portfolio allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, allocation }) => `${name} ${allocation.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rebalancing Interface */}
      {showRebalancing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Rebalancing Interface
            </CardTitle>
            <CardDescription>
              {mockRebalancingRecommendations.length > 0 
                ? `${mockRebalancingRecommendations.length} rebalancing recommendations available`
                : 'No rebalancing recommendations available'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mockRebalancingRecommendations.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your portfolio is well-balanced. No rebalancing actions are currently recommended.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-3">Current vs Target Allocation</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={allocationComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="asset" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="current" fill="#8884d8" name="Current %" />
                        <Bar dataKey="target" fill="#82ca9d" name="Target %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Rebalancing Recommendations</h4>
                    <div className="space-y-2">
                      {mockRebalancingRecommendations.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                            <div>
                              <p className="font-medium">{rec.asset}</p>
                              <p className="text-sm text-muted-foreground">{rec.reason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-medium", getActionColor(rec.action))}>
                              {rec.action.toUpperCase()} {rec.difference.toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ~${rec.estimatedCost.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Estimated total cost: ${mockRebalancingRecommendations.reduce((sum, rec) => sum + rec.estimatedCost, 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button variant="default" size="sm">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Execute Rebalancing
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Asset Details */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>Detailed information about each asset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAllocations.map((asset) => (
              <div key={asset.symbol} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{asset.symbol}</h4>
                  <p className="text-sm text-muted-foreground">{asset.name}</p>
                  <p className="text-lg font-bold">${asset.price.toFixed(2)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Allocation</p>
                  <p className="font-medium">{asset.currentAllocation.toFixed(1)}% / {asset.targetAllocation.toFixed(1)}%</p>
                  <Progress value={asset.currentAllocation} className="mt-1" />
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <div className={cn("flex items-center", getChangeColor(asset.change24h))}>
                    {getChangeIcon(asset.change24h)}
                    <span className="ml-1">{asset.change24h.toFixed(2)}% (24h)</span>
                  </div>
                  <div className={cn("flex items-center text-sm", getChangeColor(asset.change7d))}>
                    {getChangeIcon(asset.change7d)}
                    <span className="ml-1">{asset.change7d.toFixed(2)}% (7d)</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <Badge variant={asset.risk === 'high' ? 'destructive' : asset.risk === 'medium' ? 'secondary' : 'default'}>
                    {asset.risk.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vol: ${(asset.volume24h / 1000000).toFixed(0)}M
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Analysis Settings
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
                  <SelectItem value="1D">Last 24 Hours</SelectItem>
                  <SelectItem value="1W">Last Week</SelectItem>
                  <SelectItem value="1M">Last Month</SelectItem>
                  <SelectItem value="3M">Last 3 Months</SelectItem>
                  <SelectItem value="1Y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">View Mode</label>
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Allocation</SelectItem>
                  <SelectItem value="target">Target Allocation</SelectItem>
                  <SelectItem value="difference">Difference</SelectItem>
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
    </div>
  );
};
