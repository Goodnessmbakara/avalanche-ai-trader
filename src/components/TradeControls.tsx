import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAITrading } from "@/hooks/useAITrading";
import { resolveTokenAddress, getTradeQuote } from "@/utils/web3";
import { TradeConfirmationDialog } from "@/components/ui/trade-confirmation-dialog";
import { TradeStatus } from "@/shared/types";

/**
 * Trade Controls Component
 * Provides manual and automated trading controls for the AI system
 * Includes risk management settings and trade execution buttons
 */
const TradeControls: React.FC = () => {
  const { toast } = useToast();
  const {
    web3,
    account,
    isConnected,
    avaxBalance,
    usdtBalance,
    networkId,
    isTrading,
    lastTradeHash,
    tradeError,
    gasEstimate,
    portfolioValueUSDT,
    executeManualTrade,
    executeAIValidatedTrade,
    calculatePositionSize,
    calculateSlippage,
    estimateGas,
    emergencyStop,
  } = useWeb3();
  
  const {
    currentPrediction,
    currentSignal,
    isInitialized,
    getAISignal,
  } = useAITrading();

  // Trading state
  const [selectedToken, setSelectedToken] = useState<"AVAX" | "USDT">("AVAX");
  const [tradeAmount, setTradeAmount] = useState("100");
  const [slippageTolerance, setSlippageTolerance] = useState([0.5]);
  const [useSmartContract, setUseSmartContract] = useState(true);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [tradeConfirmation, setTradeConfirmation] = useState(false);
  const [riskLevel, setRiskLevel] = useState([50]);
  const [stopLoss, setStopLoss] = useState("5");
  const [takeProfit, setTakeProfit] = useState("10");
  const [isAutoTrading, setIsAutoTrading] = useState(false);

  // Trade confirmation dialog state
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [pendingTradeParams, setPendingTradeParams] = useState<any>(null);
  const [tradeQuote, setTradeQuote] = useState<any>(null);
  const [pendingGasEstimate, setPendingGasEstimate] = useState<number | null>(null);

  // Check if USDT is configured for current network
  const isUSDTConfigured = useCallback(() => {
    if (!web3 || !networkId) return false;
    try {
      const chainId = Number(networkId);
      resolveTokenAddress('USDT', chainId);
      return true;
    } catch (error) {
      return false;
    }
  }, [web3, networkId]);

  // Use normalized portfolio value in USDT
  const portfolioValue = portfolioValueUSDT || (avaxBalance + usdtBalance);

  // Calculate position size based on AI confidence
  const positionSize = currentSignal ? calculatePositionSize(
    riskLevel[0],
    portfolioValue,
    currentSignal.confidence / 100
  ) : null;

  // Calculate optimal slippage
  const optimalSlippage = currentSignal ? calculateSlippage(
    slippageTolerance[0],
    0.5, // Placeholder volatility
    currentSignal.confidence / 100
  ) : slippageTolerance[0];

  // Handle trade confirmation
  const handleTradeConfirm = async (): Promise<any> => {
    if (!pendingTradeParams) return null;

    const { action, fromTokenAddress, toTokenAddress, amount } = pendingTradeParams;
    
    try {
      const result = await executeManualTrade(
        fromTokenAddress,
        toTokenAddress,
        amount,
        optimalSlippage,
        useSmartContract
      );

      if (result) {
        toast({
          title: `${action.toUpperCase()} Order Executed`,
          description: `Transaction: ${result.txHash.slice(0, 10)}...`,
        });
      } else {
        toast({
          title: "Trade Failed",
          description: tradeError || "Unknown error occurred",
          variant: "destructive",
        });
      }

      return result;
    } catch (error: any) {
      toast({
        title: "Trade Error",
        description: error.message || "Failed to execute trade",
        variant: "destructive",
      });
      return null;
    } finally {
      setShowConfirmationDialog(false);
      setPendingTradeParams(null);
      setTradeQuote(null);
      setPendingGasEstimate(null);
    }
  };

  // Handle manual trade execution
  const handleManualTrade = async (action: "buy" | "sell") => {
    if (!isConnected || !web3 || !account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to trade",
        variant: "destructive",
      });
      return;
    }

    if (isTrading) {
      toast({
        title: "Trade in Progress",
        description: "Please wait for the current trade to complete",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid trade amount",
        variant: "destructive",
      });
      return;
    }

    // Determine tokens based on action and selected token
    let fromToken: "AVAX" | "USDT";
    let toToken: "AVAX" | "USDT";
    
    if (action === "buy") {
      // Buy selected token: if selectedToken is AVAX, buy AVAX with USDT; else buy USDT with AVAX
      if (selectedToken === "AVAX") {
        fromToken = "USDT";
        toToken = "AVAX";
      } else {
        fromToken = "AVAX";
        toToken = "USDT";
      }
    } else {
      // Sell selected token: if selectedToken is AVAX, sell AVAX for USDT; else sell USDT for AVAX
      if (selectedToken === "AVAX") {
        fromToken = "AVAX";
        toToken = "USDT";
      } else {
        fromToken = "USDT";
        toToken = "AVAX";
      }
    }

    // Validate balance
    const fromBalance = fromToken === "AVAX" ? avaxBalance : usdtBalance;
    
    if (amount > fromBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${amount} ${fromToken} but have ${fromBalance}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const chainId = Number(networkId);
      const fromTokenAddress = resolveTokenAddress(fromToken, chainId);
      const toTokenAddress = resolveTokenAddress(toToken, chainId);

      // Get trade quote
      const quote = await getTradeQuote(web3, fromTokenAddress, toTokenAddress, amount.toString());
      setTradeQuote(quote);

      // Estimate gas
      const gas = await estimateGas({
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount,
        slippage: optimalSlippage,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        useSmartContract,
        aiValidation: false
      });
      setPendingGasEstimate(gas);

      // Set pending trade parameters
      setPendingTradeParams({
        action,
        fromTokenAddress,
        toTokenAddress,
        amount,
        fromSymbol: fromToken,
        toSymbol: toToken,
      });

      // Show confirmation dialog
      setShowConfirmationDialog(true);

    } catch (error: any) {
      toast({
        title: "Trade Error",
        description: error.message || "Failed to prepare trade",
        variant: "destructive",
      });
    }
  };

  // Handle automated trading toggle
  const handleAutoTrade = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to enable auto trading",
        variant: "destructive",
      });
      return;
    }

    setIsAutoTrading(!isAutoTrading);
    toast({
      title: `Auto Trading ${!isAutoTrading ? "Enabled" : "Disabled"}`,
      description: !isAutoTrading
        ? "AI will now execute trades based on predictions"
        : "Manual trading mode activated",
    });
  };

  // Handle emergency stop
  const handleEmergencyStop = async () => {
    try {
      const success = await emergencyStop();
      if (success) {
        setIsAutoTrading(false);
        toast({
          title: "Emergency Stop Activated",
          description: "All automated trading has been halted",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Emergency Stop Failed",
          description: "Failed to halt trading. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Emergency Stop Error",
        description: "An error occurred while stopping trading",
        variant: "destructive",
      });
    }
  };

  // Update AI signal periodically
  useEffect(() => {
    if (isInitialized && !isAutoTrading) {
      const interval = setInterval(() => {
        getAISignal();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isInitialized, isAutoTrading, getAISignal]);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-secondary/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Wallet Status</Label>
              <p className="text-sm text-muted-foreground">
                {isConnected ? `Connected: ${account?.slice(0, 8)}...` : "Not connected"}
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          {isConnected && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>AVAX: {avaxBalance.toFixed(4)}</div>
              <div>USDT: {usdtBalance.toFixed(2)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Trading Toggle */}
      <Card className="bg-secondary/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Auto Trading</Label>
              <p className="text-sm text-muted-foreground">
                Let AI execute trades automatically
              </p>
            </div>
            <Switch
              checked={isAutoTrading}
              onCheckedChange={handleAutoTrade}
              disabled={!isConnected}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Trading Controls */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Manual Trading</Label>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tokenSelect" className="text-sm">
              Token
            </Label>
            <Select
              value={selectedToken}
              onValueChange={(value: "AVAX" | "USDT") => setSelectedToken(value)}
              disabled={isAutoTrading || !isUSDTConfigured()}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAX">AVAX</SelectItem>
                <SelectItem value="USDT" disabled={!isUSDTConfigured()}>
                  USDT {!isUSDTConfigured() && '(Not Configured)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradeAmount" className="text-sm">
              Amount (to spend)
            </Label>
            <Input
              id="tradeAmount"
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={isAutoTrading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Slippage Tolerance: {optimalSlippage.toFixed(2)}%</Label>
          <Slider
            value={slippageTolerance}
            onValueChange={setSlippageTolerance}
            max={5}
            min={0.1}
            step={0.1}
            className="w-full"
            disabled={isAutoTrading}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.1%</span>
            <span>5%</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={useSmartContract}
            onCheckedChange={setUseSmartContract}
            disabled={isAutoTrading}
          />
          <Label className="text-sm">Use AI Smart Contract</Label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleManualTrade("buy")}
            disabled={isAutoTrading || isTrading || !isConnected}
            className="bg-profit hover:bg-profit/90 text-success-foreground"
          >
            {isTrading ? "Processing..." : "Buy"}
          </Button>
          <Button
            onClick={() => handleManualTrade("sell")}
            disabled={isAutoTrading || isTrading || !isConnected}
            variant="destructive"
          >
            {isTrading ? "Processing..." : "Sell"}
          </Button>
        </div>
      </div>

      {/* AI Insights */}
      {isInitialized && currentSignal && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Trading Signal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Action</span>
              <span className={`font-medium ${
                currentSignal.action === "BUY" ? "text-profit" : "text-destructive"
              }`}>
                {currentSignal.action}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <span className="text-warning font-medium">{currentSignal.confidence}%</span>
            </div>
            {positionSize && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recommended Size</span>
                <span className="text-foreground font-medium">
                  ${positionSize.recommendedSize.toFixed(2)}
                </span>
              </div>
            )}
            {currentPrediction && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Predicted Price</span>
                <span className="text-foreground font-medium">
                  ${currentPrediction.price.toFixed(2)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Management */}
      <div className="space-y-4 pt-4 border-t border-border">
        <Label className="text-base font-medium">Risk Management</Label>

        <div className="space-y-2">
          <Label className="text-sm">Risk Level: {riskLevel[0]}%</Label>
          <Slider
            value={riskLevel}
            onValueChange={setRiskLevel}
            max={100}
            step={5}
            className="w-full"
            disabled={isAutoTrading}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stopLoss" className="text-sm">
              Stop Loss (%)
            </Label>
            <Input
              id="stopLoss"
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="5"
              disabled={isAutoTrading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="takeProfit" className="text-sm">
              Take Profit (%)
            </Label>
            <Input
              id="takeProfit"
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="10"
              disabled={isAutoTrading}
            />
          </div>
        </div>
      </div>

      {/* Trade Status */}
      {isTrading && (
        <Card className="bg-warning/10 border-warning">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warning"></div>
              <span className="text-sm font-medium">Processing Trade...</span>
            </div>
            {gasEstimate && (
              <p className="text-xs text-muted-foreground mt-1">
                Gas estimate: {gasEstimate} units
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {lastTradeHash && (
        <Card className="bg-success/10 border-success">
          <CardContent className="p-4">
            <div className="text-sm">
              <div className="font-medium text-success">Trade Completed</div>
              <div className="text-xs text-muted-foreground mt-1">
                TX: {lastTradeHash.slice(0, 10)}...{lastTradeHash.slice(-8)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tradeError && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-4">
            <div className="text-sm">
              <div className="font-medium text-destructive">Trade Error</div>
              <div className="text-xs text-muted-foreground mt-1">{tradeError}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Controls */}
      <div className="space-y-2">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleEmergencyStop}
          disabled={!isConnected}
        >
          Emergency Stop All Trading
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          This will immediately halt all AI trading activities
        </p>
      </div>

      {/* Trade Confirmation Dialog */}
      {pendingTradeParams && (
        <TradeConfirmationDialog
          isOpen={showConfirmationDialog}
          onClose={() => {
            setShowConfirmationDialog(false);
            setPendingTradeParams(null);
            setTradeQuote(null);
            setPendingGasEstimate(null);
          }}
          onConfirm={handleTradeConfirm}
          tradeParams={{
            fromToken: pendingTradeParams.fromTokenAddress,
            toToken: pendingTradeParams.toTokenAddress,
            amount: pendingTradeParams.amount,
            slippage: optimalSlippage,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20,
            useSmartContract,
            aiValidation: false,
            fromSymbol: pendingTradeParams.fromSymbol,
            toSymbol: pendingTradeParams.toSymbol,
          }}
          aiPrediction={currentPrediction ? {
            price: currentPrediction.price,
            confidence: currentSignal?.confidence || 0,
            action: currentSignal?.action || "HOLD"
          } : undefined}
          gasEstimate={pendingGasEstimate}
          expectedOutput={tradeQuote?.expectedOutput}
          priceImpact={tradeQuote?.priceImpact}
          portfolioValue={portfolioValue}
          positionSize={positionSize}
        />
      )}
    </div>
  );
};

export { TradeControls };
export default TradeControls;
