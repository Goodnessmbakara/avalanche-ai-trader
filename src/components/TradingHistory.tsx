import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { mockProcessedData } from '../data/mockProcessedData';

interface Trade {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  amount: number;
  price: number;
  value: number;
  profit: number;
  gasUsed: number;
  gasPrice: number;
  txHash: string | null;
  status: string | null;
  aiSignal: string | null;
  confidence: number | null;
}

interface TradingHistoryData {
  trades: Trade[];
  summary: {
    totalTrades: number;
    profitableTrades: number;
    winRate: number;
    totalProfit: number;
    totalVolume: number;
    averageTradeSize: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Mock trading history data as fallback
const generateMockTradingHistory = (): TradingHistoryData => {
  // Generate dates for the last 3-4 months in 2025 (approximately 90-120 days)
  const generateRecentDates = () => {
    const dates = [];
    const now = new Date('2025-10-15'); // Assuming today is October 15, 2025
    
    // Generate 10 recent dates, starting from 3-4 months ago
    for (let i = 0; i < 10; i++) {
      const date = new Date(now);
      // Start from 90 days ago and go backwards
      date.setDate(now.getDate() - (90 - i * 10));
      dates.push(date.toISOString());
    }
    
    return dates.reverse(); // Oldest first
  };

  const recentDates = generateRecentDates();
  
  const mockTrades: Trade[] = [
    {
      id: 'trade_001',
      timestamp: recentDates[9], // Most recent
      type: 'BUY',
      asset: 'AVAX',
      amount: 101.27,
      price: 21.12,
      value: 2138.77,
      profit: 0,
      gasUsed: 210000,
      gasPrice: 25,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      status: 'CONFIRMED',
      aiSignal: 'BUY',
      confidence: 82
    },
    {
      id: 'trade_002',
      timestamp: recentDates[8],
      type: 'SELL',
      asset: 'AVAX',
      amount: 29.11,
      price: 21.07,
      value: 613.43,
      profit: 28.06,
      gasUsed: 210000,
      gasPrice: 30,
      txHash: '0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1',
      status: 'CONFIRMED',
      aiSignal: 'BUY',
      confidence: 99
    },
    {
      id: 'trade_003',
      timestamp: recentDates[7],
      type: 'HOLD',
      asset: 'AVAX',
      amount: 0,
      price: 21.19,
      value: 0,
      profit: 0,
      gasUsed: 0,
      gasPrice: 0,
      txHash: null,
      status: null,
      aiSignal: null,
      confidence: null
    },
    {
      id: 'trade_004',
      timestamp: recentDates[6],
      type: 'HOLD',
      asset: 'AVAX',
      amount: 0,
      price: 20.57,
      value: 0,
      profit: 0,
      gasUsed: 0,
      gasPrice: 0,
      txHash: null,
      status: null,
      aiSignal: null,
      confidence: null
    },
    {
      id: 'trade_005',
      timestamp: recentDates[5],
      type: 'HOLD',
      asset: 'AVAX',
      amount: 0,
      price: 20.74,
      value: 0,
      profit: 0,
      gasUsed: 0,
      gasPrice: 0,
      txHash: null,
      status: null,
      aiSignal: null,
      confidence: null
    },
    {
      id: 'trade_006',
      timestamp: recentDates[4],
      type: 'HOLD',
      asset: 'AVAX',
      amount: 0,
      price: 20.65,
      value: 0,
      profit: 0,
      gasUsed: 0,
      gasPrice: 0,
      txHash: null,
      status: null,
      aiSignal: null,
      confidence: null
    },
    {
      id: 'trade_007',
      timestamp: recentDates[3],
      type: 'SELL',
      asset: 'AVAX',
      amount: 36.95,
      price: 20.69,
      value: 764.51,
      profit: 42.77,
      gasUsed: 210000,
      gasPrice: 28,
      txHash: '0x4567890123def1234567890123def1234567890123def1234567890123def123',
      status: 'CONFIRMED',
      aiSignal: 'BUY',
      confidence: 77
    },
    {
      id: 'trade_008',
      timestamp: recentDates[2],
      type: 'BUY',
      asset: 'AVAX',
      amount: 77.73,
      price: 20.61,
      value: 1602.30,
      profit: 0,
      gasUsed: 210000,
      gasPrice: 26,
      txHash: '0x5678901234ef12345678901234ef12345678901234ef12345678901234ef1234',
      status: 'CONFIRMED',
      aiSignal: 'BUY',
      confidence: 96
    },
    {
      id: 'trade_009',
      timestamp: recentDates[1],
      type: 'SELL',
      asset: 'AVAX',
      amount: 31.90,
      price: 20.80,
      value: 663.56,
      profit: 168.06,
      gasUsed: 210000,
      gasPrice: 25,
      txHash: '0x6789012345f123456789012345f123456789012345f123456789012345f12345',
      status: 'CONFIRMED',
      aiSignal: 'BUY',
      confidence: 86
    },
    {
      id: 'trade_010',
      timestamp: recentDates[0], // Oldest
      type: 'BUY',
      asset: 'AVAX',
      amount: 95.62,
      price: 21.04,
      value: 2012.05,
      profit: 0,
      gasUsed: 210000,
      gasPrice: 24,
      txHash: '0x7890123456g1234567890123456g1234567890123456g1234567890123456g123456',
      status: 'CONFIRMED',
      aiSignal: 'BUY',
      confidence: 78
    }
  ];

  const totalTrades = mockTrades.filter(trade => trade.type !== 'HOLD').length;
  const profitableTrades = mockTrades.filter(trade => trade.profit > 0).length;
  const totalProfit = mockTrades.reduce((sum, trade) => sum + trade.profit, 0);
  const totalVolume = mockTrades.reduce((sum, trade) => sum + trade.value, 0);

  return {
    trades: mockTrades,
    summary: {
      totalTrades,
      profitableTrades,
      winRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0,
      totalProfit,
      totalVolume,
      averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0
    },
    pagination: {
      limit: 10,
      offset: 0,
      total: mockTrades.length,
      hasMore: false
    }
  };
};

const TradingHistory: React.FC = () => {
  const [tradingHistory, setTradingHistory] = useState<TradingHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const fetchTradingHistory = async (useMockData = false) => {
    try {
      setLoading(true);
      setError(null);

      if (useMockData) {
        // Use mock data as fallback
        const mockData = generateMockTradingHistory();
        setTradingHistory(mockData);
        toast({
          title: "Using Mock Data",
          description: "Trading history loaded from mock data due to API unavailability",
          duration: 3000,
        });
        return;
      }

      const response = await fetch(`/api/portfolio/trading-history?limit=${pageSize}&offset=${currentPage * pageSize}&type=${filterType}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch trading history`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTradingHistory(data.data);
        setError(null);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(data.message || 'Failed to fetch trading history');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // If this is the first failure, try using mock data
      if (retryCount === 0) {
        console.warn('API failed, falling back to mock data:', errorMessage);
        await fetchTradingHistory(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch trading history. Using mock data.",
          variant: "destructive"
        });
      }
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradingHistory();
  }, [currentPage, filterType]);

  const handleRetry = () => {
    setRetryCount(0);
    fetchTradingHistory();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTradeTypeIcon = (type: string) => {
    switch (type) {
      case 'BUY':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'SELL':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTradeTypeBadge = (type: string) => {
    switch (type) {
      case 'BUY':
        return <Badge variant="default" className="bg-green-100 text-green-800">BUY</Badge>;
      case 'SELL':
        return <Badge variant="destructive">SELL</Badge>;
      default:
        return <Badge variant="secondary">HOLD</Badge>;
    }
  };

  const getStatusIcon = (status: string | null) => {
    if (!status) return null;
    
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'PENDING':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && tradingHistory?.pagination.hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(0);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Trading History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !tradingHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Trading History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="ml-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Trading History
              {retryCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Mock Data
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Recent trading activity and performance metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Trades</SelectItem>
                <SelectItem value="BUY">Buys</SelectItem>
                <SelectItem value="SELL">Sells</SelectItem>
                <SelectItem value="HOLD">Holds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Statistics */}
        {tradingHistory?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(tradingHistory.summary.totalProfit)}
              </div>
              <div className="text-sm text-muted-foreground">Total Profit</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {tradingHistory.summary.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {tradingHistory.summary.totalTrades}
              </div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {formatCurrency(tradingHistory.summary.averageTradeSize)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Trade Size</div>
            </div>
          </div>
        )}

        {/* Trading History Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>AI Signal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tradingHistory?.trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTradeTypeIcon(trade.type)}
                      {getTradeTypeBadge(trade.type)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{trade.asset}</TableCell>
                  <TableCell>{formatNumber(trade.amount)}</TableCell>
                  <TableCell>{formatCurrency(trade.price)}</TableCell>
                  <TableCell>{formatCurrency(trade.value)}</TableCell>
                  <TableCell>
                    <span className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(trade.profit)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {trade.aiSignal && trade.confidence ? (
                      <div className="flex items-center gap-1">
                        <Badge variant={trade.aiSignal === 'BUY' ? 'default' : 'destructive'}>
                          {trade.aiSignal}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {trade.confidence}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(trade.status)}
                      {trade.status && (
                        <Badge variant={trade.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                          {trade.status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(trade.timestamp)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {tradingHistory?.pagination && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {tradingHistory.pagination.offset + 1} to{' '}
              {Math.min(tradingHistory.pagination.offset + tradingHistory.pagination.limit, tradingHistory.pagination.total)} of{' '}
              {tradingHistory.pagination.total} trades
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange('next')}
                disabled={!tradingHistory.pagination.hasMore}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingHistory;

