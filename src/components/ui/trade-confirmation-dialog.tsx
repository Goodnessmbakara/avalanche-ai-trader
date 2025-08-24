import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { TradeParameters, TradeResult } from "@/shared/types";

interface TradeConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<TradeResult | null>;
  tradeParams: TradeParameters & {
    fromSymbol?: string;
    toSymbol?: string;
  };
  aiPrediction?: {
    price: number;
    confidence: number;
    action: string;
  };
  gasEstimate?: number;
  expectedOutput?: string;
  priceImpact?: number;
  portfolioValue: number;
  positionSize?: {
    recommendedSize: number;
    maxSize: number;
    reasoning: string;
  };
}

export const TradeConfirmationDialog: React.FC<TradeConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tradeParams,
  aiPrediction,
  gasEstimate,
  expectedOutput,
  priceImpact,
  portfolioValue,
  positionSize,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [useAIValidation, setUseAIValidation] = useState(tradeParams.aiValidation);
  const [gasPrice, setGasPrice] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // Calculate trade details
  const tradePercentage = (tradeParams.amount / portfolioValue) * 100;
  const isHighRisk = tradePercentage > 10;
  const isAIMatch = aiPrediction && 
    ((aiPrediction.action === "BUY" && tradeParams.fromSymbol === "USDT" && tradeParams.toSymbol === "AVAX") ||
     (aiPrediction.action === "SELL" && tradeParams.fromSymbol === "AVAX" && tradeParams.toSymbol === "USDT"));

  // Update gas price periodically
  useEffect(() => {
    if (isOpen && gasEstimate) {
      const updateGasPrice = async () => {
        try {
          // Simulate gas price fetch (in real implementation, fetch from network)
          const currentGasPrice = 25; // gwei
          setGasPrice(currentGasPrice);
          setEstimatedCost((gasEstimate * currentGasPrice * 1e-9)); // Convert to AVAX
        } catch (error) {
          console.error('Failed to fetch gas price:', error);
        }
      };

      updateGasPrice();
      const interval = setInterval(updateGasPrice, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, gasEstimate]);

  const handleConfirm = async () => {
    if (!riskAcknowledged) return;

    setIsConfirming(true);
    try {
      const result = await onConfirm();
      if (result) {
        // Success - dialog will be closed by parent
        console.log('Trade executed successfully:', result);
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const formatTokenSymbol = (symbol?: string) => {
    return symbol || 'Unknown';
  };

  const getAIValidationStatus = () => {
    if (!aiPrediction) return { status: 'no-data', message: 'No AI prediction available' };
    if (!isAIMatch) return { status: 'mismatch', message: 'AI recommendation differs from trade' };
    if (aiPrediction.confidence < 70) return { status: 'low-confidence', message: 'Low AI confidence' };
    return { status: 'valid', message: 'AI validates this trade' };
  };

  const aiStatus = getAIValidationStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Confirm Trade
          </DialogTitle>
          <DialogDescription>
            Review your trade details and confirm execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trade Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Trade Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">From</Label>
                  <div className="font-medium">{formatTokenSymbol(tradeParams.fromSymbol)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">To</Label>
                  <div className="font-medium">{formatTokenSymbol(tradeParams.toSymbol)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <div className="font-medium">{tradeParams.amount.toFixed(2)} {formatTokenSymbol(tradeParams.fromSymbol)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Slippage</Label>
                  <div className="font-medium">{tradeParams.slippage}%</div>
                </div>
              </div>

              {expectedOutput && (
                <div>
                  <Label className="text-sm text-muted-foreground">Expected Output</Label>
                  <div className="font-medium">{expectedOutput} {formatTokenSymbol(tradeParams.toSymbol)}</div>
                </div>
              )}

              {priceImpact && (
                <div>
                  <Label className="text-sm text-muted-foreground">Price Impact</Label>
                  <div className="font-medium">{priceImpact.toFixed(3)}%</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Validation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-4 w-4" />
                AI Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiPrediction ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">AI Action</Label>
                      <div className="font-medium">{aiPrediction.action}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Confidence</Label>
                      <div className="font-medium">{aiPrediction.confidence}%</div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Predicted Price</Label>
                    <div className="font-medium">${aiPrediction.price.toFixed(2)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        aiStatus.status === 'valid' ? 'default' :
                        aiStatus.status === 'mismatch' ? 'destructive' :
                        aiStatus.status === 'low-confidence' ? 'secondary' : 'outline'
                      }
                    >
                      {aiStatus.status === 'valid' ? 'Validated' :
                       aiStatus.status === 'mismatch' ? 'Mismatch' :
                       aiStatus.status === 'low-confidence' ? 'Low Confidence' : 'No Data'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{aiStatus.message}</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No AI prediction available for this trade
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={useAIValidation}
                  onCheckedChange={setUseAIValidation}
                  disabled={!aiPrediction}
                />
                <Label className="text-sm">Use AI validation</Label>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Portfolio Allocation</Label>
                  <div className="font-medium">{tradePercentage.toFixed(2)}%</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Risk Level</Label>
                  <div className="font-medium">
                    {isHighRisk ? (
                      <Badge variant="destructive">High</Badge>
                    ) : tradePercentage > 5 ? (
                      <Badge variant="secondary">Medium</Badge>
                    ) : (
                      <Badge variant="default">Low</Badge>
                    )}
                  </div>
                </div>
              </div>

              {positionSize && (
                <div>
                  <Label className="text-sm text-muted-foreground">Recommended Position Size</Label>
                  <div className="font-medium">${positionSize.recommendedSize.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{positionSize.reasoning}</div>
                </div>
              )}

              {isHighRisk && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This trade represents a high percentage of your portfolio. Consider reducing the amount.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Gas and Cost */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Gas Estimate</Label>
                  <div className="font-medium">
                    {gasEstimate ? `${gasEstimate.toLocaleString()} units` : 'Calculating...'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Gas Price</Label>
                  <div className="font-medium">
                    {gasPrice ? `${gasPrice} gwei` : 'Fetching...'}
                  </div>
                </div>
              </div>

              {estimatedCost && (
                <div>
                  <Label className="text-sm text-muted-foreground">Estimated Cost</Label>
                  <div className="font-medium">{estimatedCost.toFixed(6)} AVAX</div>
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground">Total Cost</Label>
                <div className="font-medium">
                  {tradeParams.amount.toFixed(2)} {formatTokenSymbol(tradeParams.fromSymbol)} + {estimatedCost ? `${estimatedCost.toFixed(6)} AVAX` : 'gas fees'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="risk-acknowledgment"
                checked={riskAcknowledged}
                onCheckedChange={(checked) => setRiskAcknowledged(checked as boolean)}
              />
              <Label htmlFor="risk-acknowledgment" className="text-sm">
                I understand the risks involved in this trade and confirm my decision
              </Label>
            </div>

            {!riskAcknowledged && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Please acknowledge the risks before proceeding with the trade.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!riskAcknowledged || isConfirming}
            className="min-w-[100px]"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              'Confirm Trade'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

