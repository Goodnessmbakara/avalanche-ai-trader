import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWeb3 } from '@/hooks/useWeb3';
import { useToast } from '@/hooks/use-toast';

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
      await connectWallet();
      if (isConnected) {
        toast({
          title: "Wallet Connected",
          description: "Successfully connected to MetaMask",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
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
          description: "Failed to switch to Avalanche network",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Error switching network. Please try manually.",
        variant: "destructive",
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Card className="bg-card border-border shadow-card-trading">
        <CardHeader>
          <CardTitle className="text-center text-card-foreground">
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
            {isLoading ? 'Connecting...' : 'Connect MetaMask'}
          </Button>
          <div className="text-xs text-muted-foreground text-center">
            Make sure you have MetaMask installed and unlocked
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-card-trading">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-card-foreground">Wallet Connected</span>
          <Badge 
            variant={isAvalancheNetwork ? "default" : "destructive"}
            className={isAvalancheNetwork ? "bg-profit" : ""}
          >
            {isAvalancheNetwork ? 'Avalanche' : 'Wrong Network'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Account</span>
            <span className="text-foreground font-mono">
              {account ? formatAddress(account) : ''}
            </span>
          </div>
        </div>

        {/* Network Warning */}
        {!isAvalancheNetwork && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
            <div className="text-sm text-destructive font-medium mb-2">
              Wrong Network Detected
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              Please switch to Avalanche network to use the trading features
            </div>
            <Button
              onClick={handleSwitchNetwork}
              disabled={isLoading}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {isLoading ? 'Switching...' : 'Switch to Avalanche'}
            </Button>
          </div>
        )}

        {/* Balances */}
        {isAvalancheNetwork && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">AVAX Balance</span>
              <span className="text-foreground font-semibold">
                {avaxBalance.toFixed(4)} AVAX
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">USDT Balance</span>
              <span className="text-foreground font-semibold">
                ${usdtBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-muted-foreground">Portfolio Value</span>
              <span className="text-foreground font-bold">
                ${(avaxBalance * 42.35 + usdtBalance).toFixed(2)}
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