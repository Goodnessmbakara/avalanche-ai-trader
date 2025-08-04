import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

/**
 * Portfolio Summary Component
 * Displays current holdings, cash balance, and portfolio allocation
 * for the AI-powered trading system
 */
const PortfolioSummary: React.FC = () => {
  // Mock portfolio data - In production, this would come from blockchain/API
  const portfolioData = {
    totalValue: 12543.67,
    cashBalance: 3200.45,
    avaxHoldings: 220.5,
    avaxValue: 9343.22,
    usdtBalance: 3200.45,
    totalPnL: 2043.67,
    totalPnLPercent: 19.5,
  };

  const allocationData = [
    { asset: 'AVAX', amount: 220.5, value: 9343.22, percentage: 74.5, color: 'hsl(var(--chart-primary))' },
    { asset: 'USDT', amount: 3200.45, value: 3200.45, percentage: 25.5, color: 'hsl(var(--chart-secondary))' },
  ];

  return (
    <div className="space-y-6">
      {/* Total Portfolio Value */}
      <div className="text-center p-4 bg-gradient-primary rounded-lg">
        <div className="text-sm text-primary-foreground opacity-90">Total Portfolio Value</div>
        <div className="text-3xl font-bold text-primary-foreground">
          ${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className={`text-sm ${portfolioData.totalPnL >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>
          {portfolioData.totalPnL >= 0 ? '+' : ''}
          ${Math.abs(portfolioData.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          {' '}({portfolioData.totalPnLPercent >= 0 ? '+' : ''}{portfolioData.totalPnLPercent}%)
        </div>
      </div>

      {/* Holdings Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Holdings</h3>
        
        {allocationData.map((holding, index) => (
          <div key={holding.asset} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: holding.color }}
                ></div>
                <span className="font-medium text-foreground">{holding.asset}</span>
              </div>
              <div className="text-right">
                <div className="text-foreground font-medium">
                  {holding.asset === 'AVAX' 
                    ? `${holding.amount.toFixed(2)} AVAX`
                    : `$${holding.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  ${holding.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Progress 
                value={holding.percentage} 
                className="flex-1 h-2"
              />
              <span className="text-sm text-muted-foreground w-12">
                {holding.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trading Statistics */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-lg font-semibold text-foreground">Trading Stats</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total Trades</div>
            <div className="text-foreground font-medium">47</div>
          </div>
          <div>
            <div className="text-muted-foreground">Success Rate</div>
            <div className="text-profit font-medium">68.4%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg. Trade Size</div>
            <div className="text-foreground font-medium">$267</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last Trade</div>
            <div className="text-foreground font-medium">2h ago</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button className="px-4 py-2 bg-profit text-success-foreground rounded font-medium hover:bg-profit/90 transition-fast">
          Rebalance
        </button>
        <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded font-medium hover:bg-accent transition-fast">
          View Details
        </button>
      </div>
    </div>
  );
};

export default PortfolioSummary;