import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/**
 * AI Insights Component
 * Displays LSTM predictions, RL trading signals, and model confidence
 * for the AI-powered trading system
 */
const AIInsights: React.FC = () => {
  // Mock AI data - In production, this would come from TensorFlow.js models
  const aiData = {
    lstm: {
      nextPricePrediction: 43.75,
      currentPrice: 42.35,
      confidence: 87,
      direction: 'up' as const,
      timeframe: '24h',
    },
    reinforcementLearning: {
      action: 'BUY' as const,
      strength: 'Strong',
      confidence: 84,
      expectedReturn: 5.2,
      riskScore: 3.1,
    },
    technicalAnalysis: {
      sma7Trend: 'bullish',
      sma30Trend: 'bullish',
      momentum: 'positive',
      volatility: 'moderate',
    },
  };

  const getSignalColor = (signal: string) => {
    switch (signal.toLowerCase()) {
      case 'buy':
        return 'bg-profit text-success-foreground';
      case 'sell':
        return 'bg-loss text-destructive-foreground';
      default:
        return 'bg-warning text-warning-foreground';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-profit';
    if (confidence >= 60) return 'text-warning';
    return 'text-loss';
  };

  return (
    <div className="space-y-4">
      {/* LSTM Price Prediction */}
      <Card className="bg-gradient-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">LSTM Prediction</h3>
              <Badge variant="secondary" className="text-xs">
                {aiData.lstm.timeframe}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                ${aiData.lstm.nextPricePrediction.toFixed(2)}
              </div>
              <div className={`text-sm ${aiData.lstm.direction === 'up' ? 'text-profit' : 'text-loss'}`}>
                {aiData.lstm.direction === 'up' ? '↗' : '↘'} 
                {' '}${Math.abs(aiData.lstm.nextPricePrediction - aiData.lstm.currentPrice).toFixed(2)}
                {' '}({((aiData.lstm.nextPricePrediction - aiData.lstm.currentPrice) / aiData.lstm.currentPrice * 100).toFixed(1)}%)
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Model Confidence</span>
                <span className={getConfidenceColor(aiData.lstm.confidence)}>
                  {aiData.lstm.confidence}%
                </span>
              </div>
              <Progress value={aiData.lstm.confidence} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RL Trading Signal */}
      <Card className="bg-gradient-dark/50 border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">RL Trading Signal</h3>
              <Badge className={getSignalColor(aiData.reinforcementLearning.action)}>
                {aiData.reinforcementLearning.action}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Signal Strength</span>
                <span className="text-foreground font-medium">
                  {aiData.reinforcementLearning.strength}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected Return</span>
                <span className="text-profit font-medium">
                  +{aiData.reinforcementLearning.expectedReturn}%
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk Score</span>
                <span className="text-warning font-medium">
                  {aiData.reinforcementLearning.riskScore}/5
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">RL Confidence</span>
                <span className={getConfidenceColor(aiData.reinforcementLearning.confidence)}>
                  {aiData.reinforcementLearning.confidence}%
                </span>
              </div>
              <Progress value={aiData.reinforcementLearning.confidence} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Analysis Summary */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Technical Analysis</h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SMA 7</span>
                <span className="text-profit">Bullish</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SMA 30</span>
                <span className="text-profit">Bullish</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Momentum</span>
                <span className="text-profit">Positive</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volatility</span>
                <span className="text-warning">Moderate</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Sentiment */}
      <Card className="bg-secondary/30 border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Market Sentiment</h3>
            
            <div className="text-center">
              <div className="text-lg font-bold text-profit">Bullish</div>
              <div className="text-sm text-muted-foreground">
                Based on on-chain data analysis
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume Trend</span>
                <span className="text-profit">Increasing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Addresses</span>
                <span className="text-profit">Growing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquidity</span>
                <span className="text-foreground">Stable</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsights;