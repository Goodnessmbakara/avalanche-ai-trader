import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { 
  initializeWeb3, 
  switchToAvalanche, 
  getCurrentAccount, 
  getAvaxBalance, 
  getTokenBalance,
  TOKEN_ADDRESSES 
} from '@/utils/web3';

/**
 * Custom hook for Web3 functionality
 * Manages wallet connection, network switching, and account balances
 */
export const useWeb3 = () => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avaxBalance, setAvaxBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [networkId, setNetworkId] = useState<string | null>(null);

  // Initialize Web3 and connect wallet
  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const web3Instance = await initializeWeb3();
      if (web3Instance) {
        setWeb3(web3Instance);
        
        const userAccount = await getCurrentAccount(web3Instance);
        if (userAccount) {
          setAccount(userAccount);
          setIsConnected(true);
          
          // Get network ID
          const netId = await web3Instance.eth.net.getId();
          setNetworkId(netId.toString());
          
          // Load balances
          await loadBalances(web3Instance, userAccount);
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWeb3(null);
    setAccount(null);
    setIsConnected(false);
    setAvaxBalance(0);
    setUsdtBalance(0);
    setNetworkId(null);
  }, []);

  // Switch to Avalanche network
  const switchNetwork = useCallback(async (testnet = false) => {
    setIsLoading(true);
    try {
      const success = await switchToAvalanche(testnet);
      if (success && web3) {
        const netId = await web3.eth.net.getId();
        setNetworkId(netId.toString());
        
        if (account) {
          await loadBalances(web3, account);
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [web3, account]);

  // Load token balances
  const loadBalances = useCallback(async (web3Instance: Web3, userAccount: string) => {
    try {
      const [avax, usdt] = await Promise.all([
        getAvaxBalance(web3Instance, userAccount),
        getTokenBalance(web3Instance, TOKEN_ADDRESSES.USDT, userAccount),
      ]);
      
      setAvaxBalance(avax);
      setUsdtBalance(usdt);
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  }, []);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (web3 && account) {
      await loadBalances(web3, account);
    }
  }, [web3, account, loadBalances]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          if (web3) {
            loadBalances(web3, accounts[0]);
          }
        }
      };

      const handleChainChanged = (chainId: string) => {
        setNetworkId(parseInt(chainId, 16).toString());
        if (web3 && account) {
          loadBalances(web3, account);
        }
      };

      (window.ethereum as any).on('accountsChanged', handleAccountsChanged);
      (window.ethereum as any).on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          (window.ethereum as any).removeListener('accountsChanged', handleAccountsChanged);
          (window.ethereum as any).removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [web3, account, disconnectWallet, loadBalances]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum && localStorage.getItem('walletConnected') === 'true') {
        await connectWallet();
      }
    };
    autoConnect();
  }, [connectWallet]);

  // Save connection state
  useEffect(() => {
    if (isConnected) {
      localStorage.setItem('walletConnected', 'true');
    } else {
      localStorage.removeItem('walletConnected');
    }
  }, [isConnected]);

  // Check if connected to Avalanche
  const isAvalancheNetwork = networkId === '43114' || networkId === '43113'; // Mainnet or Fuji

  return {
    web3,
    account,
    isConnected,
    isLoading,
    avaxBalance,
    usdtBalance,
    networkId,
    isAvalancheNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalances,
  };
};