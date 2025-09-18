import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { 
  initializeWeb3, 
  switchToAvalanche, 
  getCurrentAccount, 
  getAvaxBalance, 
  getTokenBalance,
  resolveTokenAddress,
  getTokenDecimals,
  toUnits,
  getPangolinRouterAddress,
  PANGOLIN_ROUTER_ABI,
  getPortfolioValueInUSDT,
  executeTrade,
  executeAITrade as executeAITradeOnChain,
  getAIPredictionStatus,
  getAIPrediction,
  getAIPoweredTraderContract,
  getPriceOracleContract,
  monitorTransaction,
  emergencyStopTrading
} from '@/utils/web3';
import { calculatePositionSizeWithAI } from '@/utils/riskManagement';
import { TradeParameters, TradeResult, RiskParameters, PositionSizeResult, TradeStatus } from '@/shared/types';

/**
 * Custom hook for Web3 functionality
 * Manages wallet connection, network switching, account balances, and trading operations
 */
export const useWeb3 = () => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avaxBalance, setAvaxBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [isAvalancheNetwork, setIsAvalancheNetwork] = useState(false);
  
  // Trading state
  const [isTrading, setIsTrading] = useState(false);
  const [lastTradeHash, setLastTradeHash] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<number | null>(null);
  const [pendingTrades, setPendingTrades] = useState<TradeParameters[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeResult[]>([]);
  const [portfolioValueUSDT, setPortfolioValueUSDT] = useState<number>(0);
  const [avaxPriceUSDT, setAvaxPriceUSDT] = useState<number>(25); // Default price, will be updated

  // Load balances for connected account
  const loadBalances = useCallback(async (web3Instance: Web3, userAccount: string) => {
    try {
      const avaxBal = await getAvaxBalance(web3Instance, userAccount);
      setAvaxBalance(avaxBal);
      
      // Get USDT balance
      const usdtAddress = resolveTokenAddress('USDT', parseInt(networkId || '43113'));
      const usdtBal = await getTokenBalance(web3Instance, usdtAddress, userAccount);
      setUsdtBalance(usdtBal);
      
      // Calculate portfolio value
      const portfolioValue = avaxBal * avaxPriceUSDT + usdtBal;
      setPortfolioValueUSDT(portfolioValue);
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  }, [networkId, avaxPriceUSDT]);

  // Check if current network is Avalanche
  const checkAvalancheNetwork = useCallback((netId: string) => {
    const isAvalanche = netId === '43114' || netId === '43113'; // Mainnet or Fuji testnet
    setIsAvalancheNetwork(isAvalanche);
    return isAvalanche;
  }, []);

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
          const netIdString = netId.toString();
          setNetworkId(netIdString);
          
          // Check if on Avalanche network
          const isAvalanche = checkAvalancheNetwork(netIdString);
          
          // Load balances
          await loadBalances(web3Instance, userAccount);
          
          // If not on Avalanche, prompt to switch
          if (!isAvalanche) {
            console.log('Not on Avalanche network, prompting to switch...');
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadBalances, checkAvalancheNetwork]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWeb3(null);
    setAccount(null);
    setIsConnected(false);
    setAvaxBalance(0);
    setUsdtBalance(0);
    setNetworkId(null);
    setIsAvalancheNetwork(false);
    setLastTradeHash(null);
    setTradeError(null);
    setGasEstimate(null);
    setPendingTrades([]);
  }, []);

  // Switch to Avalanche network
  const switchNetwork = useCallback(async (testnet = false) => {
    setIsLoading(true);
    try {
      const success = await switchToAvalanche(testnet);
      if (success && web3) {
        const netId = await web3.eth.net.getId();
        const netIdString = netId.toString();
        setNetworkId(netIdString);
        
        const isAvalanche = checkAvalancheNetwork(netIdString);
        if (isAvalanche && account) {
          await loadBalances(web3, account);
        }
        
        return success;
      }
      return false;
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [web3, account, loadBalances, checkAvalancheNetwork]);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (web3 && account) {
      await loadBalances(web3, account);
    }
  }, [web3, account, loadBalances]);

  // Import position sizing from risk management
  const calculatePositionSize = useCallback((
    riskLevel: number, 
    portfolioValue: number, 
    confidence: number = 0.5
  ): PositionSizeResult => {
    const basePosition = portfolioValue * (riskLevel / 100);
    return calculatePositionSizeWithAI(
      confidence,
      basePosition,
      portfolioValue * 0.1, // Max 10% of portfolio
      portfolioValue * 0.01 // Minimum 1% of portfolio
    );
  }, []);

  // Calculate optimal slippage based on market conditions
  const calculateSlippage = useCallback((
    baseSlippage: number, 
    volatility: number, 
    confidence: number
  ): number => {
    const volatilityAdjustment = Math.min(volatility * 0.5, 2); // Max 2% additional slippage
    const confidenceAdjustment = (1 - confidence) * 1; // Higher confidence = lower slippage
    return Math.max(0.1, Math.min(baseSlippage + volatilityAdjustment - confidenceAdjustment, 5)); // Min 0.1%, Max 5%
  }, []);

  // Estimate gas for trade
  const estimateGas = useCallback(async (tradeParams: TradeParameters): Promise<number | null> => {
    if (!web3 || !account) return null;
    
    try {
      const { fromToken, toToken, amount, useSmartContract } = tradeParams;
      const chainId = Number(await web3.eth.getChainId());
      const WAVAX = resolveTokenAddress('AVAX', chainId);
      
      // Get token decimals and convert amount properly
      const fromDecimals = await getTokenDecimals(web3, fromToken);
      const amountIn = toUnits(amount.toString(), fromDecimals);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      if (useSmartContract) {
        const contract = getAIPoweredTraderContract(web3);
        
        if (fromToken === WAVAX) {
          const gas = await contract.methods
            .tradeExactAVAXForTokens(toToken, '0', deadline)
            .estimateGas({ from: account, value: amountIn });
          return gas;
        } else {
          const gas = await contract.methods
            .tradeExactTokensForAVAX(fromToken, amountIn, '0', deadline)
            .estimateGas({ from: account });
          return gas;
        }
      } else {
        const routerAddress = getPangolinRouterAddress(chainId);
        const router = new web3.eth.Contract(PANGOLIN_ROUTER_ABI, routerAddress);
        
        if (fromToken === WAVAX) {
          const gas = await router.methods
            .swapExactAVAXForTokens('0', [fromToken, toToken], account, deadline)
            .estimateGas({ from: account, value: amountIn });
          return gas;
        } else if (toToken === WAVAX) {
          const gas = await router.methods
            .swapExactTokensForAVAX(amountIn, '0', [fromToken, toToken], account, deadline)
            .estimateGas({ from: account });
          return gas;
        } else {
          const gas = await router.methods
            .swapExactTokensForTokens(amountIn, '0', [fromToken, toToken], account, deadline)
            .estimateGas({ from: account });
          return gas;
        }
      }
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      return null;
    }
  }, [web3, account]);

  // Validate trade parameters before execution
  const validateTrade = useCallback(async (tradeParams: TradeParameters): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];
    
    if (!web3 || !account) {
      errors.push('Wallet not connected');
      return { isValid: false, errors };
    }
    
    const { fromToken, toToken, amount, slippage } = tradeParams;
    
    // Check balances
    const chainId = Number(await web3.eth.getChainId());
    const WAVAX = resolveTokenAddress('AVAX', chainId);
    
    if (fromToken === WAVAX) {
      if (amount > avaxBalance) {
        errors.push(`Insufficient AVAX balance. Required: ${amount}, Available: ${avaxBalance}`);
      }
    } else {
      if (amount > usdtBalance) {
        errors.push(`Insufficient USDT balance. Required: ${amount}, Available: ${usdtBalance}`);
      }
    }
    
    // Validate slippage
    if (slippage < 0.1 || slippage > 5) {
      errors.push('Slippage must be between 0.1% and 5%');
    }
    
    // Validate amount
    if (amount <= 0) {
      errors.push('Trade amount must be greater than 0');
    }
    
    // Check if tokens are different
    if (fromToken === toToken) {
      errors.push('From and to tokens must be different');
    }
    
    return { isValid: errors.length === 0, errors };
  }, [web3, account, avaxBalance, usdtBalance]);

  // Execute manual trade
  const executeManualTrade = useCallback(async (
    fromToken: string,
    toToken: string,
    amount: number,
    slippage: number = 0.5,
    useSmartContract: boolean = true
  ): Promise<TradeResult | null> => {
    if (!web3 || !account) {
      setTradeError('Wallet not connected');
      return null;
    }
    
    setIsTrading(true);
    setTradeError(null);
    
    try {
      const tradeParams: TradeParameters = {
        fromToken,
        toToken,
        amount,
        slippage,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        useSmartContract,
        aiValidation: false
      };
      
      // Validate trade
      const validation = await validateTrade(tradeParams);
      if (!validation.isValid) {
        setTradeError(validation.errors.join(', '));
        return null;
      }
      
      // Estimate gas
      const gas = await estimateGas(tradeParams);
      setGasEstimate(gas);
      
      // Execute trade
      let txHash: string | null;
      const gasLimit = gas ? Math.floor(gas * 1.2) : undefined;
      if (useSmartContract) {
        txHash = await executeAITradeOnChain(web3, fromToken, toToken, amount.toString(), slippage, gasLimit);
      } else {
        txHash = await executeTrade(web3, fromToken, toToken, amount.toString(), slippage, gasLimit);
      }
      
      if (txHash) {
        // Monitor transaction for completion and gas usage
        const { status, receipt } = await monitorTransaction(web3, txHash);
        
        const result: TradeResult = {
          txHash,
          status: status === 'confirmed' ? TradeStatus.COMPLETED : TradeStatus.FAILED,
          gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : (gas || 0),
          actualSlippage: slippage,
          executionTime: Date.now(),
          fromToken,
          toToken,
          amount,
          timestamp: new Date().toISOString()
        };
        
        setLastTradeHash(txHash);
        setTradeHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 trades
        await refreshBalances();
        
        return result;
      } else {
        setTradeError('Trade execution failed');
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Trade execution failed';
      setTradeError(errorMessage);
      return null;
    } finally {
      setIsTrading(false);
      setGasEstimate(null);
    }
  }, [web3, account, validateTrade, estimateGas, refreshBalances]);

  // Execute AI-validated trade
  const executeAIValidatedTrade = useCallback(async (
    fromToken: string,
    toToken: string,
    amount: number,
    slippage: number = 0.5
  ): Promise<TradeResult | null> => {
    if (!web3 || !account) {
      setTradeError('Wallet not connected');
      return null;
    }
    
    setIsTrading(true);
    setTradeError(null);
    
    try {
      // Check AI prediction status
      const aiStatus = await getAIPredictionStatus(web3);
      if (!aiStatus.isValid) {
        setTradeError('AI prediction is not valid for trading');
        return null;
      }
      
      const tradeParams: TradeParameters = {
        fromToken,
        toToken,
        amount,
        slippage,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        useSmartContract: true,
        aiValidation: true
      };
      
      // Validate trade
      const validation = await validateTrade(tradeParams);
      if (!validation.isValid) {
        setTradeError(validation.errors.join(', '));
        return null;
      }
      
      // Estimate gas for AI trade
      const gas = await estimateGas(tradeParams);
      setGasEstimate(gas);
      
      // Execute trade through smart contract
      const gasLimit = gas ? Math.floor(gas * 1.2) : undefined;
      const txHash = await executeAITradeOnChain(web3, fromToken, toToken, amount.toString(), slippage, gasLimit);
      
      if (txHash) {
        // Monitor transaction for completion and gas usage
        const { status, receipt } = await monitorTransaction(web3, txHash);
        
        const result: TradeResult = {
          txHash,
          status: status === 'confirmed' ? TradeStatus.COMPLETED : TradeStatus.FAILED,
          gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : (gas || 0),
          actualSlippage: slippage,
          executionTime: Date.now(),
          fromToken,
          toToken,
          amount,
          timestamp: new Date().toISOString()
        };
        
        setLastTradeHash(txHash);
        setTradeHistory(prev => [result, ...prev.slice(0, 9)]);
        await refreshBalances();
        
        return result;
      } else {
        setTradeError('AI trade execution failed');
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'AI trade execution failed';
      setTradeError(errorMessage);
      return null;
    } finally {
      setIsTrading(false);
    }
  }, [web3, account, validateTrade, refreshBalances]);

  // Emergency stop wrapper
  const emergencyStop = useCallback(async () => {
    if (!web3) throw new Error('Wallet not connected');
    return emergencyStopTrading(web3);
  }, [web3]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          disconnectWallet();
        } else if (web3) {
          // Account changed
          const newAccount = accounts[0];
          setAccount(newAccount);
          await loadBalances(web3, newAccount);
        }
      };

      const handleChainChanged = async (chainId: string) => {
        // Reload the page when chain changes
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [web3, disconnectWallet, loadBalances]);

  // Auto-connect on mount if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
        }
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

  return {
    web3,
    account,
    isConnected,
    isLoading,
    avaxBalance,
    usdtBalance,
    networkId,
    isAvalancheNetwork,
    // Trading state
    isTrading,
    lastTradeHash,
    tradeError,
    gasEstimate,
    pendingTrades,
    tradeHistory,
    portfolioValueUSDT,
    avaxPriceUSDT,
    // Core functions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalances,
    // Trading functions
    executeManualTrade,
    executeAIValidatedTrade,
    calculatePositionSize,
    calculateSlippage,
    estimateGas,
    validateTrade,
    monitorTransaction,
    emergencyStop: emergencyStop,
  };
};