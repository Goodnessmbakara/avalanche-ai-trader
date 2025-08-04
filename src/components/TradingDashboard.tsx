import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PriceChart from './PriceChart';
import PortfolioSummary from './PortfolioSummary';
import TradeControls from './TradeControls';
import AIInsights from './AIInsights';
import WalletConnection from './WalletConnection';
import { useWeb3 } from '@/hooks/useWeb3';
import { useAITrading } from '@/hooks/useAITrading';

/**
 * Main Trading Dashboard Component
 * Displays real-time AVAX/USDT price data, AI predictions, portfolio metrics,
 * and trade execution controls for the automated trading system
 */
const TradingDashboard: React.FC = () => {
  const { isConnected, isAvalancheNetwork } = useWeb3();
  const { isInitialized, isTraining } = useAITrading();

  return (
    <div className="min-h-screen bg-gradient-dark p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            AI-Powered Trading System
          </h1>
          <p className="text-muted-foreground">
            AVAX/USDT Automated Trading on Pangolin DEX
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">AI Status</div>
          <div className={`text-lg font-semibold ${isInitialized ? 'text-profit' : 'text-warning'}`}>
            {isTraining ? 'Training...' : isInitialized ? 'Ready' : 'Initializing...'}
          </div>
        </div>
      </div>

      {/* Wallet Connection */}
      {!isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"></div>
          <WalletConnection />
        </div>
      )}

      {/* Main Dashboard Grid */}
      {isConnected && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Price Chart - Takes up more space */}
            <div className="lg:col-span-2">
              <Card className="bg-card border-border shadow-card-trading">
                <CardHeader>
                  <CardTitle className="text-card-foreground">
                    AVAX/USDT Price Chart & Technical Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PriceChart />
                </CardContent>
              </Card>
            </div>

            {/* AI Insights Panel */}
            <div>
              <Card className="bg-card border-border shadow-card-trading mb-6">
                <CardHeader>
                  <CardTitle className="text-card-foreground">
                    AI Predictions & Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AIInsights />
                </CardContent>
              </Card>

              {/* Trade Controls */}
              <Card className="bg-card border-border shadow-card-trading">
                <CardHeader>
                  <CardTitle className="text-card-foreground">
                    Trade Execution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TradeControls />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Portfolio and Performance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border shadow-card-trading">
              <CardHeader>
                <CardTitle className="text-card-foreground">
                  Portfolio Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PortfolioSummary />
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-card-trading">
              <CardHeader>
                <CardTitle className="text-card-foreground">
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total ROI</span>
                    <span className="text-profit font-semibold">+24.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <span className="text-foreground font-semibold">1.84</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className="text-loss font-semibold">-8.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="text-profit font-semibold">68.4%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default TradingDashboard;