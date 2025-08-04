import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

/**
 * Trade Controls Component
 * Provides manual and automated trading controls for the AI system
 * Includes risk management settings and trade execution buttons
 */
const TradeControls: React.FC = () => {
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [tradeAmount, setTradeAmount] = useState("100");
  const [riskLevel, setRiskLevel] = useState([50]);
  const [stopLoss, setStopLoss] = useState("5");
  const [takeProfit, setTakeProfit] = useState("10");
  const { toast } = useToast();

  const handleManualTrade = (action: "buy" | "sell") => {
    // In production, this would interact with Web3 and smart contracts
    toast({
      title: `${action.toUpperCase()} Order Submitted`,
      description: `${
        action === "buy" ? "Buying" : "Selling"
      } $${tradeAmount} worth of AVAX`,
    });
  };

  const toggleAutoTrading = () => {
    setIsAutoTrading(!isAutoTrading);
    toast({
      title: `Auto Trading ${!isAutoTrading ? "Enabled" : "Disabled"}`,
      description: !isAutoTrading
        ? "AI will now execute trades based on predictions"
        : "Manual trading mode activated",
    });
  };

  return (
    <div className="space-y-6">
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
              onCheckedChange={toggleAutoTrading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Trading Controls */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Manual Trading</Label>

        <div className="space-y-2">
          <Label htmlFor="tradeAmount" className="text-sm">
            Trade Amount (USD)
          </Label>
          <Input
            id="tradeAmount"
            type="number"
            value={tradeAmount}
            onChange={(e) => setTradeAmount(e.target.value)}
            placeholder="Enter amount in USD"
            disabled={isAutoTrading}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleManualTrade("buy")}
            disabled={isAutoTrading}
            className="bg-profit hover:bg-profit/90 text-success-foreground"
          >
            Buy AVAX
          </Button>
          <Button
            onClick={() => handleManualTrade("sell")}
            disabled={isAutoTrading}
            variant="destructive"
          >
            Sell AVAX
          </Button>
        </div>
      </div>

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
            />
          </div>
        </div>
      </div>

      {/* Current Strategy Status */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Strategy</span>
              <span className="text-foreground font-medium">LSTM + RL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Signal</span>
              <span className="text-profit font-medium">BUY (Strong)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <span className="text-warning font-medium">87%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next Check</span>
              <span className="text-foreground font-medium">5 min</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <div className="space-y-2">
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            toast({
              title: "Emergency Stop Activated",
              description: "All automated trading has been halted",
            });
          }}
        >
          Emergency Stop All Trading
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          This will immediately halt all AI trading activities
        </p>
      </div>
    </div>
  );
};

export default TradeControls;
