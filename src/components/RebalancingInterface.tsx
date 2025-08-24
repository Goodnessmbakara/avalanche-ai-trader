import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { useWeb3 } from '../hooks/useWeb3';
import { useAITrading } from '../hooks/useAITrading';
import { useTradeExecution } from '../hooks/useTradeExecution';
import { PortfolioRebalancer } from '../utils/portfolioRebalancer';
import { RebalanceRecommendation, AllocationTarget, AISignal } from '../shared/types';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  PieChart,
  ArrowRight,
  RefreshCw,
  Zap,
  Shield,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CurrentAllocation {
  [symbol: string]: {
    amount: number;
    value: number;
    percentage: number;
    price: number;
  };
}

interface RebalancingSettings {
  autoRebalance: boolean;
  rebalanceThreshold: number;
  maxTransactionCost: number;
  slippageTolerance: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
}

export const RebalancingInterface: React.FC = () => {
  const { avaxBalance, usdtBalance, portfolioValueUSDT, avaxPriceUSDT } = useWeb3();
  const { currentSignal } = useAITrading();
  const { queueTrade } = useTradeExecution();
  
  // Construct balances object from available fields
  const balances = useMemo(() => ({
    AVAX: avaxBalance,
    USDT: usdtBalance
  }), [avaxBalance, usdtBalance]);
  
  // Use portfolioValueUSDT for portfolio value
  const portfolioValue = portfolioValueUSDT;
  
  const [currentAllocation, setCurrentAllocation] = useState<CurrentAllocation>({});
  const [targetAllocation, setTargetAllocation] = useState<AllocationTarget[]>([]);
  const [rebalanceRecommendation, setRebalanceRecommendation] = useState<RebalanceRecommendation | null>(null);
  const [settings, setSettings] = useState<RebalancingSettings>({
    autoRebalance: false,
    rebalanceThreshold: 5,
    maxTransactionCost: 50,
    slippageTolerance: 0.5,
    rebalanceFrequency: 'weekly'
  });
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [manualAllocation, setManualAllocation] = useState<Record<string, number>>({});

  const rebalancer = new PortfolioRebalancer();

  // Calculate current allocation from balances
  useEffect(() => {
    if (balances && portfolioValue) {
      const allocation: CurrentAllocation = {};
      const totalValue = portfolioValue;
      
      Object.entries(balances).forEach(([token, balance]) => {
        const tokenValue = balance * (token === 'AVAX' ? avaxPriceUSDT : 1);
        allocation[token] = {
          amount: balance,
          value: tokenValue,
          percentage: (tokenValue / totalValue) * 100,
          price: token === 'AVAX' ? avaxPriceUSDT : 1
        };
      });
      
      setCurrentAllocation(allocation);
      
      // Initialize manual allocation with current values
      const manual: Record<string, number> = {};
      Object.entries(allocation).forEach(([token, pos]) => {
        manual[token] = pos.percentage;
      });
      setManualAllocation(manual);
    }
  }, [balances, portfolioValue]);

  // Generate rebalancing recommendation
  const generateRecommendation = async () => {
    setIsCalculating(true);
    
    try {
      // Convert currentSignal to AISignal format
      const aiSignals: AISignal[] = [];
      if (currentSignal) {
        const aiSignal: AISignal = {
          symbol: 'AVAX',
          predictedPrice: 42.50, // Default price - in real scenario this would come from currentPrediction
          currentPrice: avaxPriceUSDT,
          confidence: currentSignal.confidence / 100, // Convert percentage to decimal
          timestamp: Date.now(),
          direction: currentSignal.action.toLowerCase() as 'buy' | 'sell' | 'hold',
          features: {
            priceChange: 0,
            volatility: 0,
            volume: 0,
            rsi: 0,
            macd: 0
          }
        };
        aiSignals.push(aiSignal);
      }
      
      const recommendation = rebalancer.generateRebalanceRecommendation({
        currentAllocation,
        aiSignals,
        riskParams: {
          maxVolatility: 0.25,
          targetSharpeRatio: 1.2,
          maxVaR: 0.05,
          rebalanceThreshold: settings.rebalanceThreshold
        },
        constraints: {
          minTradeSize: 10,
          maxTradeSize: portfolioValue * 0.3,
          transactionCosts: settings.maxTransactionCost,
          slippageTolerance: settings.slippageTolerance
        }
      });
      
      setRebalanceRecommendation(recommendation);
      setTargetAllocation(recommendation.targetAllocation);
    } catch (error) {
      console.error('Failed to generate rebalancing recommendation:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Execute rebalancing
  const executeRebalancing = async () => {
    if (!rebalanceRecommendation) return;
    
    setIsExecuting(true);
    
    try {
      const result = await rebalancer.executeRebalance(
        rebalanceRecommendation.trades,
        async (trade) => {
          // Convert Trade to TradeParameters and queue for execution
          const tradeParams = {
            fromToken: trade.type === 'buy' ? 'USDT' : trade.symbol,
            toToken: trade.type === 'buy' ? trade.symbol : 'USDT',
            amount: trade.amount,
            slippage: 0.5, // Default slippage
            deadline: Math.floor(Date.now() / 1000) + 60 * 20,
            useSmartContract: true,
            aiValidation: false
          };
          
          // Queue the trade and wait for execution
          const tradeId = queueTrade(tradeParams);
          
          // For now, assume success (in a real implementation, you'd monitor the trade status)
          return true;
        }
      );
      
      if (result.success) {
        console.log('Rebalancing executed successfully');
        // Refresh allocation data
        window.location.reload();
      } else {
        console.error('Some rebalancing trades failed');
      }
    } catch (error) {
      console.error('Rebalancing execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Update manual allocation
  const updateManualAllocation = (token: string, percentage: number) => {
    setManualAllocation(prev => ({
      ...prev,
      [token]: Math.max(0, Math.min(100, percentage))
    }));
  };

  // Normalize manual allocation to sum to 100%
  const normalizeManualAllocation = () => {
    const total = Object.values(manualAllocation).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      const normalized: Record<string, number> = {};
      Object.entries(manualAllocation).forEach(([token, percentage]) => {
        normalized[token] = (percentage / total) * 100;
      });
      setManualAllocation(normalized);
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
    return `${value.toFixed(1)}%`;
  };

  const getDeviationColor = (deviation: number) => {
    if (deviation <= 2) return 'text-green-600';
    if (deviation <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDeviationBadge = (deviation: number) => {
    if (deviation <= 2) return <Badge variant="default">Optimal</Badge>;
    if (deviation <= 5) return <Badge variant="secondary">Minor</Badge>;
    return <Badge variant="destructive">Major</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Rebalancing Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Portfolio Rebalancing</CardTitle>
              <CardDescription>Intelligent allocation management and optimization</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={generateRecommendation} 
                disabled={isCalculating}
                variant="outline"
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Generate Recommendation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="target">Target</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6">
              {/* Current Allocation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Portfolio Allocation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(currentAllocation).map(([token, position]) => (
                    <Card key={token}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{token}</span>
                            <span className="text-sm text-muted-foreground">
                              {position.amount.toFixed(4)} {token}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Value</span>
                              <span className="font-medium">{formatCurrency(position.value)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Allocation</span>
                              <span className="font-medium">{formatPercentage(position.percentage)}</span>
                            </div>
                            <Progress value={position.percentage} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Portfolio Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(portfolioValue || 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Assets</p>
                      <p className="text-2xl font-bold">{Object.keys(currentAllocation).length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Largest Position</p>
                      <p className="text-2xl font-bold">
                        {Object.values(currentAllocation).reduce((max, pos) => 
                          pos.percentage > max ? pos.percentage : max, 0
                        ).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="target" className="space-y-6">
              {rebalanceRecommendation ? (
                <>
                  {/* Target Allocation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">AI-Recommended Target Allocation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {targetAllocation.map((target) => {
                        const current = currentAllocation[target.symbol];
                        const deviation = current ? Math.abs(current.percentage - target.targetPercentage) : 0;
                        
                        return (
                          <Card key={target.symbol}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{target.symbol}</span>
                                  {getDeviationBadge(deviation)}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Current</span>
                                    <span className="font-medium">
                                      {current ? formatPercentage(current.percentage) : '0%'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Target</span>
                                    <span className="font-medium">{formatPercentage(target.targetPercentage)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Deviation</span>
                                    <span className={cn("font-medium", getDeviationColor(deviation))}>
                                      {formatPercentage(deviation)}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={target.targetPercentage} 
                                    className="h-2"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rebalancing Impact */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Expected Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Expected Return Improvement</span>
                            <span className="font-medium text-green-600">
                              {formatPercentage(rebalanceRecommendation.impact.expectedReturn)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Risk Reduction</span>
                            <span className="font-medium text-green-600">
                              {formatPercentage(rebalanceRecommendation.impact.riskReduction)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Transaction Costs</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(rebalanceRecommendation.impact.costImpact)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time to Recovery</span>
                            <span className="font-medium">
                              {rebalanceRecommendation.impact.timeToRecovery.toFixed(1)} days
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rebalancing Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Rebalancing Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">AI Reasoning</p>
                          <p className="font-medium">{rebalanceRecommendation.reasoning}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant={rebalanceRecommendation.priority === 'high' ? 'destructive' : 'secondary'}>
                              {rebalanceRecommendation.priority.toUpperCase()} Priority
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {rebalanceRecommendation.trades.length} trades required
                            </span>
                          </div>
                          
                          <Button 
                            onClick={executeRebalancing}
                            disabled={isExecuting || !rebalanceRecommendation.needsRebalancing}
                            className="w-32"
                          >
                            {isExecuting ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Executing...
                              </>
                            ) : (
                              <>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Execute
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Generate a rebalancing recommendation to see target allocation</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              {/* Manual Allocation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Manual Allocation Adjustment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(currentAllocation).map(([token, position]) => (
                    <Card key={token}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{token}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatPercentage(manualAllocation[token] || 0)}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Slider
                              value={[manualAllocation[token] || 0]}
                              onValueChange={([value]) => updateManualAllocation(token, value)}
                              max={100}
                              step={0.1}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <Button onClick={normalizeManualAllocation} variant="outline">
                    Normalize to 100%
                  </Button>
                  <div className="text-sm">
                    Total: {Object.values(manualAllocation).reduce((sum, val) => sum + val, 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              {/* Rebalancing Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rebalancing Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto Rebalancing</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically rebalance when thresholds are exceeded
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoRebalance}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          autoRebalance: checked
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Rebalance Threshold: {settings.rebalanceThreshold}%</Label>
                      <Slider
                        value={[settings.rebalanceThreshold]}
                        onValueChange={([value]) => setSettings(prev => ({
                          ...prev,
                          rebalanceThreshold: value
                        }))}
                        max={20}
                        step={1}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Max Transaction Cost: ${settings.maxTransactionCost}</Label>
                      <Slider
                        value={[settings.maxTransactionCost]}
                        onValueChange={([value]) => setSettings(prev => ({
                          ...prev,
                          maxTransactionCost: value
                        }))}
                        max={200}
                        step={10}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Rebalance Frequency</Label>
                      <Select 
                        value={settings.rebalanceFrequency} 
                        onValueChange={(value: RebalancingSettings['rebalanceFrequency']) => 
                          setSettings(prev => ({ ...prev, rebalanceFrequency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Slippage Tolerance: {settings.slippageTolerance}%</Label>
                      <Slider
                        value={[settings.slippageTolerance]}
                        onValueChange={([value]) => setSettings(prev => ({
                          ...prev,
                          slippageTolerance: value
                        }))}
                        max={2}
                        step={0.1}
                      />
                    </div>
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

