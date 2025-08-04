import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Price Chart Component
 * Displays AVAX/USDT price data with technical indicators (SMA, EMA)
 * and AI prediction overlay for the trading system
 */
const PriceChart: React.FC = () => {
  const [chartData, setChartData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<"1H" | "4H" | "1D" | "1W">("1D");

  // Mock data for demonstration - In production, this would come from API
  useEffect(() => {
    const generateMockData = () => {
      const now = new Date();
      const labels = [];
      const prices = [];
      const sma7 = [];
      const sma30 = [];
      const predictions = [];

      // Generate 30 days of mock data
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString());

        // Mock AVAX price around $40 with some volatility
        const basePrice = 40;
        const volatility = Math.sin(i * 0.1) * 5 + Math.random() * 3;
        const price = basePrice + volatility;
        prices.push(price);

        // Simple moving averages
        if (i <= 22) {
          const sma7Value =
            prices.slice(-7).reduce((a, b) => a + b, 0) /
            Math.min(7, prices.length);
          sma7.push(sma7Value);
        } else {
          sma7.push(null);
        }

        if (i <= 0) {
          const sma30Value = prices.reduce((a, b) => a + b, 0) / prices.length;
          sma30.push(sma30Value);
        } else {
          sma30.push(null);
        }

        // Mock AI predictions (slightly ahead of current price)
        if (i <= 5) {
          predictions.push(price + Math.random() * 2 - 1);
        } else {
          predictions.push(null);
        }
      }

      return {
        labels,
        datasets: [
          {
            label: "AVAX/USDT Price",
            data: prices,
            borderColor: "hsl(var(--chart-primary))",
            backgroundColor: "hsl(var(--chart-primary) / 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.1,
          },
          {
            label: "SMA 7",
            data: sma7,
            borderColor: "hsl(var(--chart-secondary))",
            backgroundColor: "transparent",
            borderWidth: 1,
            pointRadius: 0,
          },
          {
            label: "SMA 30",
            data: sma30,
            borderColor: "hsl(var(--chart-tertiary))",
            backgroundColor: "transparent",
            borderWidth: 1,
            pointRadius: 0,
          },
          {
            label: "AI Prediction",
            data: predictions,
            borderColor: "hsl(var(--warning))",
            backgroundColor: "hsl(var(--warning) / 0.2)",
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointBackgroundColor: "hsl(var(--warning))",
          },
        ],
      };
    };

    setChartData(generateMockData());
  }, [timeframe]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "hsl(var(--foreground))",
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "hsl(var(--popover))",
        titleColor: "hsl(var(--popover-foreground))",
        bodyColor: "hsl(var(--popover-foreground))",
        borderColor: "hsl(var(--border))",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: "hsl(var(--chart-grid))",
        },
        ticks: {
          color: "hsl(var(--muted-foreground))",
        },
      },
      y: {
        grid: {
          color: "hsl(var(--chart-grid))",
        },
        ticks: {
          color: "hsl(var(--muted-foreground))",
          callback: function (value: any) {
            return "$" + value.toFixed(2);
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
  };

  const timeframeButtons = ["1H", "4H", "1D", "1W"] as const;

  return (
    <div className="w-full">
      {/* Timeframe Selection */}
      <div className="flex gap-2 mb-4">
        {timeframeButtons.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 rounded text-sm font-medium transition-fast ${
              timeframe === tf
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="h-80 w-full">
        {chartData && <Line data={chartData} options={options} />}
      </div>

      {/* Chart Legend/Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
        <div>
          <div className="text-muted-foreground">Current Price</div>
          <div className="text-lg font-semibold text-foreground">$42.35</div>
        </div>
        <div>
          <div className="text-muted-foreground">24h Change</div>
          <div className="text-lg font-semibold text-profit">+2.45%</div>
        </div>
        <div>
          <div className="text-muted-foreground">Volume</div>
          <div className="text-lg font-semibold text-foreground">$1.2M</div>
        </div>
        <div>
          <div className="text-muted-foreground">AI Confidence</div>
          <div className="text-lg font-semibold text-warning">87%</div>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;
