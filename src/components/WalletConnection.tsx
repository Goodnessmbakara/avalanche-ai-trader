import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWeb3 } from "@/hooks/useWeb3";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink,
  Info
} from "lucide-react";

/**
 * Wallet Connection Component
 * Handles MetaMask connection and Avalanche network switching
 */
const WalletConnection: React.FC = () => {
  const {
    account,
    isConnected,
    isLoading,
    avaxBalance,
    usdtBalance,
    isAvalancheNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalances,
  } = useWeb3();

  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === "undefined") {
        toast({
          title: "MetaMask Not Found",
          description: (
            <div className="space-y-2">
              <p>Please install MetaMask extension to connect your wallet.</p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline flex items-center gap-1"
              >
                Download MetaMask <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ),
          variant: "destructive",
        });
        return;
      }

      await connectWallet();

      if (isConnected) {
        toast({
          title: "Wallet Connected",
          description: "Successfully connected to MetaMask",
        });
      }
    } catch (error: any) {
      console.error("Connection error:", error);

      let errorMessage = "Failed to connect wallet. Please try again.";

      if (error.code === 4001) {
        errorMessage = "Connection rejected by user. Please try again.";
      } else if (error.code === -32002) {
        errorMessage = "Please check MetaMask for pending connection request.";
      } else if (error.message?.includes("already pending")) {
        errorMessage = "Connection request already pending. Please check MetaMask.";
      } else if (error.message?.includes("User rejected")) {
        errorMessage = "Connection was rejected. Please try again.";
      }

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      const success = await switchNetwork(false); // false = mainnet, true = testnet
      if (success) {
        toast({
          title: "Network Switched",
          description: "Successfully switched to Avalanche network",
        });
      } else {
        toast({
          title: "Network Switch Failed",
          description: "Failed to switch to Avalanche network. Please try manually.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Network switch error:", error);

      let errorMessage = "Error switching network. Please try manually.";

      if (error.code === 4001) {
        errorMessage = "Network switch rejected by user.";
      } else if (error.code === 4902) {
        errorMessage = "Avalanche network not found. Adding to MetaMask...";
      }

      toast({
        title: "Network Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number, decimals: number = 4) => {
    return balance.toFixed(decimals);
  };

  if (!isConnected) {
    return (
      <Card className="bg-card border-border shadow-card-trading">
        <CardHeader>
          <CardTitle className="text-center text-card-foreground flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5" />
            Connect Your Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-muted-foreground">
            Connect your MetaMask wallet to start AI-powered trading on Avalanche
          </div>
          
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect MetaMask
              </>
            )}
          </Button>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="space-y-1">
                <div>• Make sure you have MetaMask installed and unlocked</div>
                <div>• Click the button above to connect your wallet</div>
                <div>• You'll be prompted to switch to Avalanche network</div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-card-trading">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-card-foreground flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Wallet Connected
          </span>
          <Badge
            variant={isAvalancheNetwork ? "default" : "destructive"}
            className={isAvalancheNetwork ? "bg-green-500" : ""}
          >
            {isAvalancheNetwork ? "Avalanche" : "Wrong Network"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Account</span>
            <span className="text-foreground font-mono text-sm">
              {account ? formatAddress(account) : ""}
            </span>
          </div>
        </div>

        {/* Network Warning */}
        {!isAvalancheNetwork && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Wrong Network Detected</div>
                <div className="text-sm">
                  Please switch to Avalanche network to use the trading features
                </div>
                <Button
                  onClick={handleSwitchNetwork}
                  disabled={isLoading}
                  variant="destructive"
                  size="sm"
                  className="w-full mt-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    "Switch to Avalanche"
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Balances */}
        {isAvalancheNetwork && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">AVAX Balance</span>
              <span className="text-foreground font-semibold">
                {formatBalance(avaxBalance)} AVAX
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">USDT Balance</span>
              <span className="text-foreground font-semibold">
                ${formatBalance(usdtBalance, 2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-muted-foreground">Portfolio Value</span>
              <span className="text-foreground font-bold">
                ${formatBalance(avaxBalance * 25 + usdtBalance, 2)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-4">
          <Button
            onClick={refreshBalances}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
          <Button
            onClick={disconnectWallet}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletConnection;
