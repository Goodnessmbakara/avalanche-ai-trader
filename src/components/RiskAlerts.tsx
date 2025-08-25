import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
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
  Shield,
  AlertCircle,
  TrendingUpIcon,
  DollarSign,
  Percent,
  Gauge
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RiskAlert {
  id: string;
  type: 'high' | 'medium' | 'low';
  category: 'drawdown' | 'volatility' | 'concentration' | 'liquidity' | 'correlation';
  title: string;
  description: string;
  value: number;
  threshold: number;
  timestamp: Date;
  status: 'active' | 'resolved' | 'acknowledged';
  severity: number; // 1-10
}

interface DrawdownData {
  date: string;
  portfolioValue: number;
  peakValue: number;
  drawdown: number;
  cumulativeReturn: number;
  recovery: number;
}

interface RiskMetrics {
  currentDrawdown: number;
  maxDrawdown: number;
  avgDrawdown: number;
  drawdownDuration: number;
  recoveryTime: number;
  volatility: number;
  var95: number;
  var99: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  concentrationRisk: number;
  correlationRisk: number;
  liquidityRisk: number;
}

export const RiskAlerts: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [alertFilter, setAlertFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock drawdown data
  const mockDrawdownData: DrawdownData[] = useMemo(() => {
    const data: DrawdownData[] = [];
    const startValue = 10000;
    let currentValue = startValue;
    let peakValue = startValue;
    let cumulativeReturn = 0;
    
    for (let i = 365; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic price movements with drawdowns
      const dailyReturn = (Math.random() - 0.5) * 0.06; // ±3% daily
      currentValue *= (1 + dailyReturn);
      cumulativeReturn = ((currentValue - startValue) / startValue) * 100;
      
      if (currentValue > peakValue) {
        peakValue = currentValue;
      }
      
      const drawdown = ((peakValue - currentValue) / peakValue) * 100;
      const recovery = ((currentValue - startValue) / startValue) * 100;
      
      data.push({
        date: date.toLocaleDateString(),
        portfolioValue: currentValue,
        peakValue: peakValue,
        drawdown: drawdown,
        cumulativeReturn: cumulativeReturn,
        recovery: recovery
      });
    }
    
    return data;
  }, []);

  // Mock risk alerts
  const mockRiskAlerts: RiskAlert[] = useMemo(() => {
    const alerts: RiskAlert[] = [];
    const now = new Date();
    
    // High severity alerts
    if (mockDrawdownData[mockDrawdownData.length - 1].drawdown > 15) {
      alerts.push({
        id: '1',
        type: 'high',
        category: 'drawdown',
        title: 'High Drawdown Alert',
        description: 'Portfolio drawdown exceeds 15% threshold',
        value: mockDrawdownData[mockDrawdownData.length - 1].drawdown,
        threshold: 15,
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'active',
        severity: 9
      });
    }
    
    // Medium severity alerts
    if (Math.random() > 0.5) {
      alerts.push({
        id: '2',
        type: 'medium',
        category: 'volatility',
        title: 'Elevated Volatility',
        description: 'Portfolio volatility is above normal levels',
        value: 25.5,
        threshold: 20,
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        status: 'active',
        severity: 6
      });
    }
    
    if (Math.random() > 0.7) {
      alerts.push({
        id: '3',
        type: 'medium',
        category: 'concentration',
        title: 'Concentration Risk',
        description: 'Single asset concentration exceeds 40%',
        value: 45.2,
        threshold: 40,
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        status: 'acknowledged',
        severity: 5
      });
    }
    
    // Low severity alerts
    if (Math.random() > 0.8) {
      alerts.push({
        id: '4',
        type: 'low',
        category: 'correlation',
        title: 'High Correlation',
        description: 'Asset correlation is above 0.8',
        value: 0.85,
        threshold: 0.8,
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
        status: 'active',
        severity: 3
      });
    }
    
    return alerts;
  }, [mockDrawdownData]);

  // Calculate risk metrics
  const riskMetrics: RiskMetrics = useMemo(() => {
    const data = mockDrawdownData;
    const currentDrawdown = data[data.length - 1].drawdown;
    const maxDrawdown = Math.max(...data.map(d => d.drawdown));
    const avgDrawdown = data.reduce((sum, d) => sum + d.drawdown, 0) / data.length;
    
    // Calculate drawdown duration
    let drawdownDuration = 0;
    let maxDuration = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i].drawdown > 0) {
        drawdownDuration++;
        maxDuration = Math.max(maxDuration, drawdownDuration);
      } else {
        drawdownDuration = 0;
      }
    }
    
    // Calculate recovery time (simplified)
    const recoveryTime = Math.max(0, data.length - maxDuration);
    
    // Calculate volatility
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].portfolioValue - data[i-1].portfolioValue) / data[i-1].portfolioValue);
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length * 365) * 100;
    
    // Calculate VaR (simplified)
    const sortedReturns = returns.sort((a, b) => a - b);
    const var95 = sortedReturns[Math.floor(sortedReturns.length * 0.05)] * 100;
    const var99 = sortedReturns[Math.floor(sortedReturns.length * 0.01)] * 100;
    
    // Calculate Sharpe and Sortino ratios
    const riskFreeRate = 0.02; // 2% annual
    const totalReturn = ((data[data.length - 1].portfolioValue - data[0].portfolioValue) / data[0].portfolioValue) * 100;
    const sharpeRatio = (totalReturn - riskFreeRate) / volatility;
    
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / negativeReturns.length * 365) * 100;
    const sortinoRatio = (totalReturn - riskFreeRate) / downsideDeviation;
    
    // Calculate Calmar ratio
    const calmarRatio = totalReturn / maxDrawdown;
    
    // Mock other risk metrics
    const concentrationRisk = Math.random() * 30 + 20; // 20-50%
    const correlationRisk = Math.random() * 0.3 + 0.5; // 0.5-0.8
    const liquidityRisk = Math.random() * 20 + 10; // 10-30%
    
    return {
      currentDrawdown,
      maxDrawdown,
      avgDrawdown,
      drawdownDuration: maxDuration,
      recoveryTime,
      volatility,
      var95,
      var99,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      concentrationRisk,
      correlationRisk,
      liquidityRisk
    };
  }, [mockDrawdownData]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600';
      case 'acknowledged': return 'text-yellow-600';
      case 'resolved': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const filteredAlerts = mockRiskAlerts.filter(alert => 
    alertFilter === 'all' || alert.type === alertFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Risk Alerts</h2>
          <p className="text-muted-foreground">
            Portfolio Risk Monitoring and Drawdown Analysis
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

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Drawdown</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", riskMetrics.currentDrawdown > 10 ? "text-red-600" : "text-green-600")}>
              -{riskMetrics.currentDrawdown.toFixed(2)}%
            </div>
            <Progress value={Math.min(riskMetrics.currentDrawdown, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Max: -{riskMetrics.maxDrawdown.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volatility</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskMetrics.volatility.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Annualized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VaR (95%)</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{riskMetrics.var95.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Daily Value at Risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAlerts.filter(a => a.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredAlerts.length} total alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Risk Analysis Settings
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
              <label className="text-sm font-medium">Alert Level</label>
              <Select value={alertFilter} onValueChange={(value: any) => setAlertFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
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

      {/* Charts */}
      <Tabs defaultValue="drawdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drawdown">Drawdown Chart</TabsTrigger>
          <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
          <TabsTrigger value="metrics">Risk Metrics</TabsTrigger>
          <TabsTrigger value="analysis">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="drawdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drawdown Analysis</CardTitle>
              <CardDescription>
                Portfolio drawdown over time with peak and recovery analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={mockDrawdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="portfolioValue"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Portfolio Value"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="peakValue"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Peak Value"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="drawdown"
                    fill="#ef4444"
                    fillOpacity={0.7}
                    name="Drawdown %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No risk alerts match the current filter criteria.
                </AlertDescription>
              </Alert>
            ) : (
              filteredAlerts.map((alert) => (
                <Card key={alert.id} className={cn("border-l-4", getAlertColor(alert.type))}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getAlertIcon(alert.type)}
                        <CardTitle className="text-sm">{alert.title}</CardTitle>
                        <Badge variant="outline" className={getAlertColor(alert.type)}>
                          {alert.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={cn("text-sm", getStatusColor(alert.status))}>
                          {alert.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {alert.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {alert.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-sm font-medium">Current Value:</span>
                          <span className="text-sm ml-2">{alert.value.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Threshold:</span>
                          <span className="text-sm ml-2">{alert.threshold.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Severity:</span>
                          <span className="text-sm ml-2">{alert.severity}/10</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Acknowledge</Button>
                        <Button variant="outline" size="sm">Resolve</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk-Adjusted Returns</CardTitle>
                <CardDescription>Performance metrics adjusted for risk</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Sharpe Ratio:</span>
                    <span className="text-sm font-medium">{riskMetrics.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Sortino Ratio:</span>
                    <span className="text-sm font-medium">{riskMetrics.sortinoRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Calmar Ratio:</span>
                    <span className="text-sm font-medium">{riskMetrics.calmarRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">VaR (99%):</span>
                    <span className="text-sm font-medium text-red-600">{riskMetrics.var99.toFixed(2)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Drawdown Statistics</CardTitle>
                <CardDescription>Historical drawdown analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Max Drawdown:</span>
                    <span className="text-sm font-medium text-red-600">-{riskMetrics.maxDrawdown.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Drawdown:</span>
                    <span className="text-sm font-medium">-{riskMetrics.avgDrawdown.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Max Duration:</span>
                    <span className="text-sm font-medium">{riskMetrics.drawdownDuration} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Recovery Time:</span>
                    <span className="text-sm font-medium">{riskMetrics.recoveryTime} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Concentration Risk</CardTitle>
                <CardDescription>Asset concentration analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {riskMetrics.concentrationRisk.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Largest Position</p>
                  <Progress value={riskMetrics.concentrationRisk} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correlation Risk</CardTitle>
                <CardDescription>Portfolio correlation analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {riskMetrics.correlationRisk.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Correlation</p>
                  <Progress value={riskMetrics.correlationRisk * 100} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Liquidity Risk</CardTitle>
                <CardDescription>Portfolio liquidity assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {riskMetrics.liquidityRisk.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Liquidity Score</p>
                  <Progress value={riskMetrics.liquidityRisk} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detailed Metrics */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Risk Metrics</CardTitle>
            <CardDescription>Comprehensive risk analysis and monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Risk Thresholds</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Drawdown Limit:</span>
                    <span className="text-sm font-medium">-20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Volatility Limit:</span>
                    <span className="text-sm font-medium">30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">VaR Limit:</span>
                    <span className="text-sm font-medium">-5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Concentration Limit:</span>
                    <span className="text-sm font-medium">50%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Current Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Risk Level:</span>
                    <Badge variant={riskMetrics.currentDrawdown > 15 ? "destructive" : riskMetrics.currentDrawdown > 10 ? "secondary" : "default"}>
                      {riskMetrics.currentDrawdown > 15 ? "High" : riskMetrics.currentDrawdown > 10 ? "Medium" : "Low"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Alert Count:</span>
                    <span className="text-sm font-medium">{filteredAlerts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Update:</span>
                    <span className="text-sm font-medium">{new Date().toLocaleString()}</span>
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
