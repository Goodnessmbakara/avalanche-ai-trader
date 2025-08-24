import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertCircle, 
  Play, 
  Square, 
  RefreshCw,
  TrendingUp,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StreamingStatusProps {
  isStreamingEnabled: boolean;
  streamingStatus: any;
  streamingError: string | null;
  onEnableStreaming: () => void;
  onDisableStreaming: () => void;
}

export const StreamingStatus: React.FC<StreamingStatusProps> = ({
  isStreamingEnabled,
  streamingStatus,
  streamingError,
  onEnableStreaming,
  onDisableStreaming
}) => {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [priceHistory, setPriceHistory] = useState<Array<{ timestamp: number; price: number }>>([]);

  useEffect(() => {
    if (streamingStatus?.lastPriceUpdate) {
      setLastUpdate(new Date(streamingStatus.lastPriceUpdate * 1000));
    }
  }, [streamingStatus?.lastPriceUpdate]);

  // Simulate price history for demo (in real app, this would come from streaming buffer)
  useEffect(() => {
    if (isStreamingEnabled) {
      const interval = setInterval(() => {
        const now = Date.now();
        const mockPrice = 40 + (Math.random() - 0.5) * 2; // Mock price around $40
        setPriceHistory(prev => {
          const newHistory = [...prev, { timestamp: now, price: mockPrice }];
          // Keep last 20 data points for sparkline
          return newHistory.slice(-20);
        });
      }, 5000); // Update every 5 seconds when streaming

      return () => clearInterval(interval);
    }
  }, [isStreamingEnabled]);

  const getConnectionStatus = (source: string) => {
    if (!streamingStatus) return 'unknown';
    
    if (source === 'price') {
      return streamingStatus.priceStreamActive ? 'connected' : 'disconnected';
    }
    
    if (source === 'subgraph') {
      return streamingStatus.subgraphStreamActive ? 'connected' : 'disconnected';
    }
    
    return 'unknown';
  };

  const isInFallbackMode = streamingStatus?.connectionErrors?.length >= 5;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'connecting':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours}h ago`;
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-Time Data Streaming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(isStreamingEnabled ? 'connected' : 'disconnected')}`} />
            <span className="text-sm font-medium">
              {isStreamingEnabled 
                ? (isInFallbackMode ? 'Fallback Polling Mode' : 'Streaming Active')
                : 'Streaming Inactive'
              }
            </span>
          </div>
          <Switch
            checked={isStreamingEnabled}
            onCheckedChange={isStreamingEnabled ? onDisableStreaming : onEnableStreaming}
          />
        </div>

        {/* Fallback Mode Alert */}
        {isInFallbackMode && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Streaming failed, using fallback polling mode. Data updates every 5 minutes.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Mini Price Ticker/Chart */}
        {isStreamingEnabled && priceHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Price Activity</h4>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <XAxis 
                    dataKey="timestamp" 
                    hide 
                    type="number"
                    domain={['dataMin', 'dataMax']}
                  />
                  <YAxis 
                    hide 
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="text-sm font-medium">
                              {formatPrice(data.price)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(data.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Last 20 updates</span>
              <span>Live ticker</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Connection Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Connection Status</h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Price Stream */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(getConnectionStatus('price'))}
                <div>
                  <p className="text-sm font-medium">Price Feed</p>
                  <p className="text-xs text-muted-foreground">Binance AVAX/USDT</p>
                </div>
              </div>
              <Badge variant={getConnectionStatus('price') === 'connected' ? 'default' : 'secondary'}>
                {getConnectionStatus('price')}
              </Badge>
            </div>

            {/* Subgraph Stream */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(getConnectionStatus('subgraph'))}
                <div>
                  <p className="text-sm font-medium">DEX Data</p>
                  <p className="text-xs text-muted-foreground">Pangolin Subgraph</p>
                </div>
              </div>
              <Badge variant={getConnectionStatus('subgraph') === 'connected' ? 'default' : 'secondary'}>
                {getConnectionStatus('subgraph')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last price update: {formatTimeAgo(lastUpdate)}</span>
          </div>
        )}

        {/* Error Display */}
        {streamingError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Streaming error: {streamingError}
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Stats */}
        {streamingStatus && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span>Reconnect attempts: {streamingStatus.reconnectAttempts || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span>Errors: {streamingStatus.connectionErrors?.length || 0}</span>
            </div>
          </div>
        )}

        {/* Manual Controls */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onEnableStreaming}
            disabled={isStreamingEnabled}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Streaming
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDisableStreaming}
            disabled={!isStreamingEnabled}
            className="flex-1"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Streaming
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
