import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Activity, 
  Server, 
  Database, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  BarChart3,
  Clock
} from 'lucide-react';

interface SystemHealth {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    aiSystem: {
      status: string;
      streaming: boolean;
      bufferSize: number;
      memoryUsage: number;
    };
    cache: {
      status: string;
      hitRate: number;
      totalKeys: number;
    };
    models: {
      status: string;
      activeModels: number;
      testingModels: number;
      activeABTests: number;
    };
    metrics: {
      status: string;
      apiRequests: number;
      aiPredictions: number;
      trades: number;
      errors: number;
    };
  };
  performance: {
    responseTime: number;
    memoryUsage: number;
    memoryLimit: number;
  };
}

interface MetricsData {
  apiRequests: {
    total: number;
    byEndpoint: Record<string, number>;
    responseTimes: number[];
  };
  aiModel: {
    predictions: number;
    accuracy: number[];
    confidence: number[];
    trainingTime: number[];
    memoryUsage: number[];
  };
  trading: {
    trades: number;
    successRate: number;
    volume: number;
    profitLoss: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
    errors: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

interface ModelInfo {
  version: string;
  modelType: string;
  trainingDate: string;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  status: string;
  deploymentDate: string;
}

const ProductionDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/health', {
        headers: {
          'x-admin-api-key': process.env.REACT_APP_ADMIN_API_KEY || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      
      const data = await response.json();
      setSystemHealth(data);
    } catch (err) {
      setError('Failed to fetch system health');
      console.error('Error fetching system health:', err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics/json', {
        headers: {
          'x-admin-api-key': process.env.REACT_APP_ADMIN_API_KEY || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/admin/models', {
        headers: {
          'x-admin-api-key': process.env.REACT_APP_ADMIN_API_KEY || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      setModels(data.models || []);
    } catch (err) {
      console.error('Error fetching models:', err);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchSystemHealth(),
      fetchMetrics(),
      fetchModels()
    ]);
    
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading && !systemHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading production dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and management of AI trading system
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              System Overview
            </CardTitle>
            <CardDescription>
              Overall system health and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth.status)}`} />
                <span className="font-medium">Status: {systemHealth.status}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Uptime: {formatUptime(systemHealth.uptime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Version: {systemHealth.version}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Environment: {systemHealth.environment}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="models">Model Management</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* AI System */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm">
                    <Brain className="h-4 w-4 mr-2" />
                    AI System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemHealth.components.aiSystem.status)}
                        <Badge variant="outline">{systemHealth.components.aiSystem.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Streaming</span>
                      <Badge variant={systemHealth.components.aiSystem.streaming ? "default" : "secondary"}>
                        {systemHealth.components.aiSystem.streaming ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Buffer Size</span>
                      <span className="text-sm">{systemHealth.components.aiSystem.bufferSize}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Memory</span>
                      <span className="text-sm">{formatMemory(systemHealth.components.aiSystem.memoryUsage)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cache */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm">
                    <Database className="h-4 w-4 mr-2" />
                    Cache
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemHealth.components.cache.status)}
                        <Badge variant="outline">{systemHealth.components.cache.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hit Rate</span>
                      <span className="text-sm">{systemHealth.components.cache.hitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Keys</span>
                      <span className="text-sm">{systemHealth.components.cache.totalKeys}</span>
                    </div>
                    <Progress value={systemHealth.components.cache.hitRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Models */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm">
                    <Brain className="h-4 w-4 mr-2" />
                    Models
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemHealth.components.models.status)}
                        <Badge variant="outline">{systemHealth.components.models.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active</span>
                      <Badge variant="default">{systemHealth.components.models.activeModels}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Testing</span>
                      <Badge variant="secondary">{systemHealth.components.models.testingModels}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">A/B Tests</span>
                      <Badge variant="outline">{systemHealth.components.models.activeABTests}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemHealth.components.metrics.status)}
                        <Badge variant="outline">{systemHealth.components.metrics.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Requests</span>
                      <span className="text-sm">{systemHealth.components.metrics.apiRequests}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Predictions</span>
                      <span className="text-sm">{systemHealth.components.metrics.aiPredictions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Trades</span>
                      <span className="text-sm">{systemHealth.components.metrics.trades}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Errors</span>
                      <span className="text-sm text-red-500">{systemHealth.components.metrics.errors}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Current Usage</span>
                      <span className="font-medium">{formatMemory(systemHealth.performance.memoryUsage)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Limit</span>
                      <span className="font-medium">{formatMemory(systemHealth.performance.memoryLimit)}</span>
                    </div>
                    <Progress 
                      value={(systemHealth.performance.memoryUsage / systemHealth.performance.memoryLimit) * 100} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Average</span>
                      <span className="font-medium">{systemHealth.performance.responseTime}ms</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-500">Good performance</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Versions</CardTitle>
              <CardDescription>
                Active and deployed AI models with performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.version} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                          {model.status}
                        </Badge>
                        <span className="font-medium">{model.version}</span>
                        <span className="text-sm text-muted-foreground">({model.modelType})</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(model.deploymentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="ml-1 font-medium">{(model.performance.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Precision:</span>
                        <span className="ml-1 font-medium">{(model.performance.precision * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recall:</span>
                        <span className="ml-1 font-medium">{(model.performance.recall * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">F1 Score:</span>
                        <span className="ml-1 font-medium">{(model.performance.f1Score * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.apiRequests.total}</div>
                  <p className="text-xs text-muted-foreground">
                    Total requests processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Predictions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.aiModel.predictions}</div>
                  <p className="text-xs text-muted-foreground">
                    Predictions generated
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trading Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.trading.volume.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Total trading volume
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.trading.successRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Trading success rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cache Hit Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.cache.hitRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Cache performance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{metrics.system.errors}</div>
                  <p className="text-xs text-muted-foreground">
                    Total errors encountered
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionDashboard;







