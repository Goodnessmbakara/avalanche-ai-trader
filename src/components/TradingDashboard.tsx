import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PriceChart from "./PriceChart";
import PortfolioSummary from "./PortfolioSummary";
import TradeControls from "./TradeControls";
import AIInsights from "./AIInsights";
import WalletConnection from "./WalletConnection";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAITrading } from "@/hooks/useAITrading";

/**
 * Main Trading Dashboard Component
 * Displays real-time AVAX/USDT price data, AI predictions, portfolio metrics,
 * and trade execution controls for the automated trading system
 */
const TradingDashboard: React.FC = () => {
  const { isConnected, isAvalancheNetwork } = useWeb3();
  const {
    isInitialized,
    isTraining,
    trainingProgress,
    initializationError,
    historicalDataLength,
    initializeAI,
    checkModelsExist,
    forceRetrain,
  } = useAITrading();

  // Testing mode state
  const [testingMode, setTestingMode] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [modelsExist, setModelsExist] = useState<boolean | null>(null);

  // Check if models exist on component mount
  React.useEffect(() => {
    const exist = checkModelsExist();
    setModelsExist(exist);
  }, [checkModelsExist]);

  // Debug logging
  console.log("TradingDashboard render:", {
    isConnected,
    isAvalancheNetwork,
    isInitialized,
    isTraining,
    initializationError,
    historicalDataLength,
    modelsExist,
  });

  const testComponents = [
    {
      id: "wallet",
      name: "Wallet Connection",
      component: <WalletConnection />,
    },
    { id: "pricechart", name: "Price Chart", component: <PriceChart /> },
    { id: "aiinsights", name: "AI Insights", component: <AIInsights /> },
    {
      id: "tradecontrols",
      name: "Trade Controls",
      component: <TradeControls />,
    },
    {
      id: "portfolio",
      name: "Portfolio Summary",
      component: <PortfolioSummary />,
    },
  ];

  const runComponentTest = (componentId: string) => {
    setCurrentTest(componentId);
    console.log(`Testing component: ${componentId}`);
  };

  if (testingMode) {
    return (
      <div className="min-h-screen bg-gradient-dark p-6 space-y-6">
        {/* Testing Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              🧪 Component Testing Mode
            </h1>
            <p className="text-muted-foreground">
              Testing each component individually
            </p>
          </div>
          <Button onClick={() => setTestingMode(false)} variant="outline">
            Exit Testing Mode
          </Button>
        </div>

        {/* Test Controls */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {testComponents.map((test) => (
                <Button
                  key={test.id}
                  onClick={() => runComponentTest(test.id)}
                  variant={currentTest === test.id ? "default" : "outline"}
                  className="text-sm"
                >
                  {test.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Test Component */}
        {currentTest && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>
                Testing:{" "}
                {testComponents.find((t) => t.id === currentTest)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-primary/50 p-4 rounded">
                {testComponents.find((t) => t.id === currentTest)?.component}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Wallet Connected:</span>
                <span className={isConnected ? "text-profit" : "text-loss"}>
                  {isConnected ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avalanche Network:</span>
                <span
                  className={isAvalancheNetwork ? "text-profit" : "text-loss"}
                >
                  {isAvalancheNetwork ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>AI System:</span>
                <span
                  className={isInitialized ? "text-profit" : "text-warning"}
                >
                  {isInitialized ? "✅ Ready" : "⏳ Initializing"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data Points:</span>
                <span className="text-foreground">{historicalDataLength}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">AI Status</div>
            <div
              className={`text-lg font-semibold ${
                isInitialized ? "text-profit" : "text-warning"
              }`}
            >
              {isTraining
                ? trainingProgress || "Training..."
                : isInitialized
                ? "Ready"
                : "Initializing..."}
            </div>
            {modelsExist !== null && (
              <div className="text-xs text-muted-foreground">
                Models: {modelsExist ? "📂 Saved" : "🆕 New"}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isInitialized && modelsExist && (
              <Button
                onClick={forceRetrain}
                variant="outline"
                size="sm"
                disabled={isTraining}
              >
                {isTraining ? "🔄 Training..." : "🔄 Retrain"}
              </Button>
            )}
            <Button
              onClick={() => setTestingMode(true)}
              variant="outline"
              size="sm"
            >
              🧪 Test Components
            </Button>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
        Debug: Connected: {isConnected ? "Yes" : "No"} | Avalanche:{" "}
        {isAvalancheNetwork ? "Yes" : "No"} | AI:{" "}
        {isInitialized ? "Ready" : "Initializing"} | Models:{" "}
        {modelsExist ? "Saved" : "New"} | Data: {historicalDataLength} points
      </div>

      {/* AI Initialization Error */}
      {initializationError && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>AI Initialization Error:</strong> {initializationError}
            <div className="mt-2">
              <Button
                onClick={initializeAI}
                size="sm"
                variant="outline"
                disabled={isTraining}
              >
                {isTraining ? "Initializing..." : "Retry AI Initialization"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Manual AI Initialization */}
      {!isInitialized && !isTraining && !initializationError && (
        <Alert>
          <AlertDescription>
            <strong>AI System Ready to Initialize</strong>
            <div className="mt-2 space-y-2">
              <div className="text-sm text-muted-foreground">
                {modelsExist
                  ? "📂 Found saved models - will load existing models (fast)"
                  : "🆕 No saved models found - will train new models (slower)"}
              </div>
              <div className="flex gap-2">
                <Button onClick={initializeAI} size="sm" disabled={isTraining}>
                  {isTraining ? "Initializing..." : "🚀 Initialize AI System"}
                </Button>
                <Button
                  onClick={() => {
                    const exist = checkModelsExist();
                    setModelsExist(exist);
                    console.log("Model check result:", exist);
                  }}
                  size="sm"
                  variant="outline"
                >
                  🔍 Check Models
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

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

      {/* Fallback for connected but no components showing */}
      {isConnected && (
        <div className="text-center text-muted-foreground">
          <p>
            If you don't see the dashboard components, please check the browser
            console for errors.
          </p>
        </div>
      )}
    </div>
  );
};

export default TradingDashboard;
