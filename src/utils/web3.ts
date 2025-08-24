import Web3 from 'web3';
import TraderArtifact from './abis/AIPoweredTrader.json';
import OracleArtifact from './abis/PriceOracle.json';

/**
 * Web3 Utilities for Avalanche C-Chain Integration
 * Handles blockchain interactions for the AI trading system
 */

// Avalanche C-Chain configuration
export const AVALANCHE_CONFIG = {
  chainId: '0xA86A', // Avalanche C-Chain
  chainName: 'Avalanche Network C-Chain',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://snowtrace.io/'],
};

// Avalanche Fuji Testnet configuration
export const FUJI_CONFIG = {
  chainId: '0xA869', // Avalanche Fuji Testnet
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
};

// Pangolin Router addresses by network
export const PANGOLIN_ROUTER_ADDRESSES = {
  43114: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', // Avalanche mainnet
  43113: '0x2D99ABD9008Dc933ff5c0CD271B88309593aB921', // Fuji testnet
};

// Token addresses for AVAX/USDT pair by network
export const TOKEN_ADDRESSES = {
  43114: { 
    AVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Wrapped AVAX mainnet
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' // USDT on Avalanche mainnet
  },
  43113: { 
    AVAX: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // Wrapped AVAX Fuji testnet
    USDT: import.meta.env.VITE_USDT_ADDRESS_FUJI || '0x0000000000000000000000000000000000000000' // Load from env or use placeholder
  }
};

// Smart Contract ABIs and Addresses
export const AI_POWERED_TRADER_ABI = TraderArtifact.abi || [];
export const PRICE_ORACLE_ABI = OracleArtifact.abi || [];

// Contract addresses from environment variables
export const getContractAddresses = () => {
  const network = import.meta.env.VITE_NETWORK || 'fuji';
  
  return {
    aiPoweredTrader: import.meta.env.VITE_AI_POWERED_TRADER_ADDRESS || '',
    priceOracle: import.meta.env.VITE_PRICE_ORACLE_ADDRESS || '',
    chainId: network === 'avalanche' ? 43114 : 43113,
  };
};

/**
 * Resolve token address by symbol and chain ID
 */
export const resolveTokenAddress = (symbol: 'AVAX' | 'USDT', chainId: number): string => {
  const addresses = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  const address = addresses[symbol];
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Token ${symbol} not configured for chain ID ${chainId}. Please set VITE_USDT_ADDRESS_FUJI environment variable.`);
  }
  
  return address;
};

/**
 * Check if address is WAVAX for given chain ID
 */
export const isWAVAX = (address: string, chainId: number): boolean => {
  const wavaxAddress = resolveTokenAddress('AVAX', chainId);
  return address.toLowerCase() === wavaxAddress.toLowerCase();
};

/**
 * Convert amount to token units (wei/smallest unit)
 */
export const toUnits = (amount: string | number, decimals: number): string => {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (amountNum * Math.pow(10, decimals)).toString();
};

/**
 * Convert token units to human readable amount
 */
export const fromUnits = (amount: string, decimals: number): string => {
  const amountNum = parseFloat(amount);
  return (amountNum / Math.pow(10, decimals)).toString();
};

/**
 * Get Pangolin router address for a given chain ID
 */
export const getPangolinRouterAddress = (chainId: number): string => {
  return PANGOLIN_ROUTER_ADDRESSES[chainId as keyof typeof PANGOLIN_ROUTER_ADDRESSES] || 
         PANGOLIN_ROUTER_ADDRESSES[43113]; // Default to Fuji
};

/**
 * Initialize Web3 connection
 */
export const initializeWeb3 = async (): Promise<Web3 | null> => {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      return web3;
    }
    return null;
  } catch (error) {
    console.error('Failed to initialize Web3:', error);
    return null;
  }
};

/**
 * Switch to Avalanche network
 */
export const switchToAvalanche = async (testnet = false): Promise<boolean> => {
  try {
    if (!window.ethereum) return false;

    const config = testnet ? FUJI_CONFIG : AVALANCHE_CONFIG;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // Chain not added to wallet, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [config],
        });
        return true;
      }
      throw switchError;
    }
  } catch (error) {
    console.error('Failed to switch to Avalanche:', error);
    return false;
  }
};

/**
 * Get current wallet address
 */
export const getCurrentAccount = async (web3: Web3): Promise<string | null> => {
  try {
    const accounts = await web3.eth.getAccounts();
    return accounts[0] || null;
  } catch (error) {
    console.error('Failed to get current account:', error);
    return null;
  }
};

/**
 * Get AVAX balance
 */
export const getAvaxBalance = async (web3: Web3, address: string): Promise<number> => {
  try {
    const balance = await web3.eth.getBalance(address);
    return parseFloat(web3.utils.fromWei(balance, 'ether'));
  } catch (error) {
    console.error('Failed to get AVAX balance:', error);
    return 0;
  }
};

/**
 * ERC-20 ABI for token interactions
 */
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{name:'_owner',type:'address'},{name:'_spender',type:'address'}],
    name: 'allowance',
    outputs: [{name:'',type:'uint256'}],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
];

/**
 * Get token balance
 */
export const getTokenBalance = async (
  web3: Web3,
  tokenAddress: string,
  walletAddress: string
): Promise<number> => {
  try {
    const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const balance = await contract.methods.balanceOf(walletAddress).call() as string;
    const decimals = await contract.methods.decimals().call() as string;
    return parseFloat(balance) / Math.pow(10, parseInt(decimals));
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return 0;
  }
};

/**
 * Get token decimals
 */
export const getTokenDecimals = async (web3: Web3, tokenAddress: string): Promise<number> => {
  try {
    const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const decimals = await contract.methods.decimals().call() as string;
    return parseInt(decimals);
  } catch (error) {
    console.error('Failed to get token decimals:', error);
    return 18; // Default to 18 decimals
  }
};

/**
 * Pangolin Router ABI (simplified for swaps)
 */
export const PANGOLIN_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactAVAXForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForAVAX',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * Calculate optimal slippage based on market conditions and AI confidence
 */
export const calculateOptimalSlippage = (
  baseSlippage: number,
  marketVolatility: number,
  aiConfidence: number
): number => {
  // Adjust slippage based on market volatility (higher volatility = higher slippage)
  const volatilityAdjustment = Math.min(marketVolatility * 0.3, 2);
  
  // Adjust based on AI confidence (higher confidence = lower slippage)
  const confidenceAdjustment = (1 - aiConfidence) * 1.5;
  
  // Calculate final slippage with bounds
  const optimalSlippage = baseSlippage + volatilityAdjustment - confidenceAdjustment;
  
  // Ensure slippage is within reasonable bounds (0.1% to 5%)
  return Math.max(0.1, Math.min(5, optimalSlippage));
};



/**
 * Validate trade parameters before execution
 */
export const validateTradeParameters = (
  fromToken: string,
  toToken: string,
  amount: number,
  slippage: number,
  deadline: number,
  balance: number
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if tokens are different
  if (fromToken === toToken) {
    errors.push('From and to tokens must be different');
  }
  
  // Validate amount
  if (amount <= 0) {
    errors.push('Trade amount must be greater than 0');
  }
  
  // Check balance
  if (amount > balance) {
    errors.push(`Insufficient balance. Required: ${amount}, Available: ${balance}`);
  }
  
  // Validate slippage
  if (slippage < 0.1 || slippage > 5) {
    errors.push('Slippage must be between 0.1% and 5%');
  }
  
  // Validate deadline
  const currentTime = Math.floor(Date.now() / 1000);
  if (deadline <= currentTime) {
    errors.push('Deadline must be in the future');
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Convert AVAX balance to USDT equivalent using current price
 */
export const getPortfolioValueInUSDT = async (
  web3: Web3,
  avaxBalance: number,
  usdtBalance: number,
  chainId: number
): Promise<number> => {
  try {
    const WAVAX = resolveTokenAddress('AVAX', chainId);
    const USDT = resolveTokenAddress('USDT', chainId);
    
    // Get current AVAX price in USDT
    const routerAddress = getPangolinRouterAddress(chainId);
    const router = new web3.eth.Contract(PANGOLIN_ROUTER_ABI, routerAddress);
    
    // Get price for 1 AVAX in USDT
    const oneAvax = toUnits('1', 18);
    const path = [WAVAX, USDT];
    const amounts = await router.methods.getAmountsOut(oneAvax, path).call();
    
    if (amounts && Array.isArray(amounts) && amounts.length >= 2) {
      const avaxPrice = parseFloat(fromUnits(amounts[1], 6)); // USDT has 6 decimals
      const avaxValueInUSDT = avaxBalance * avaxPrice;
      return avaxValueInUSDT + usdtBalance;
    }
    
    // Fallback: assume 1 AVAX = 1 USDT if price fetch fails
    return avaxBalance + usdtBalance;
  } catch (error) {
    console.error('Failed to get portfolio value in USDT:', error);
    // Fallback: assume 1 AVAX = 1 USDT
    return avaxBalance + usdtBalance;
  }
};

/**
 * Get trade quote (expected output amount)
 */
export const getTradeQuote = async (
  web3: Web3,
  fromToken: string,
  toToken: string,
  amount: string
): Promise<{ expectedOutput: string; priceImpact: number } | null> => {
  try {
    const chainId = Number(await web3.eth.getChainId());
    const routerAddress = getPangolinRouterAddress(chainId);
    const router = new web3.eth.Contract(PANGOLIN_ROUTER_ABI, routerAddress);
    
    // Get token decimals
    const fromDecimals = await getTokenDecimals(web3, fromToken);
    const toDecimals = await getTokenDecimals(web3, toToken);
    
    const amountIn = toUnits(amount, fromDecimals);
    const path = [fromToken, toToken];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    
    // Get amounts out
    const amounts = await router.methods.getAmountsOut(amountIn, path).call();
    if (!amounts || !Array.isArray(amounts) || amounts.length < 2) {
      throw new Error('Failed to get trade amounts');
    }
    const expectedOutput = fromUnits(amounts[1], toDecimals);
    
    // Calculate price impact (simplified)
    const priceImpact = 0.1; // Placeholder - would need price oracle for accurate calculation
    
    return { expectedOutput, priceImpact };
  } catch (error) {
    console.error('Failed to get trade quote:', error);
    return null;
  }
};

/**
 * Monitor transaction status
 */
export const monitorTransaction = async (
  web3: Web3,
  txHash: string,
  maxAttempts: number = 30
): Promise<{ status: 'pending' | 'confirmed' | 'failed'; receipt?: any }> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      
      if (receipt) {
        if (receipt.status) {
          return { status: 'confirmed', receipt };
        } else {
          return { status: 'failed', receipt };
        }
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('Error monitoring transaction:', error);
      attempts++;
    }
  }
  
  return { status: 'pending' };
};

/**
 * Emergency stop trading
 */
export const emergencyStopTrading = async (web3: Web3): Promise<boolean> => {
  try {
    const contract = getAIPoweredTraderContract(web3);
    const account = await getCurrentAccount(web3);
    
    if (!account) {
      throw new Error('No wallet connected');
    }
    
    const tx = await contract.methods.pause().send({ from: account });
    return !!tx.transactionHash;
  } catch (error) {
    console.error('Failed to emergency stop trading:', error);
    return false;
  }
};

/**
 * Check token allowance
 */
export const checkTokenAllowance = async (
  web3: Web3,
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<number> => {
  try {
    const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const allowance = await contract.methods.allowance(ownerAddress, spenderAddress).call();
    const decimals = await contract.methods.decimals().call();
    return parseFloat(allowance) / Math.pow(10, parseInt(decimals));
  } catch (error) {
    console.error('Failed to check token allowance:', error);
    return 0;
  }
};

/**
 * Approve token spending
 */
export const approveToken = async (
  web3: Web3,
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  gasOverride?: number
): Promise<string | null> => {
  try {
    const account = await getCurrentAccount(web3);
    if (!account) throw new Error('No wallet connected');
    
    const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const decimals = await getTokenDecimals(web3, tokenAddress);
    const amountIn = toUnits(amount, decimals);
    
    const gasLimit = gasOverride ? Math.floor(gasOverride * 1.2) : 100000;
    const tx = await contract.methods.approve(spenderAddress, amountIn).send({
      from: account,
      gas: gasLimit.toString()
    });
    
    return tx.transactionHash;
  } catch (error) {
    console.error('Failed to approve token:', error);
    return null;
  }
};

/**
 * Execute trade on Pangolin DEX
 */
export const executeTrade = async (
  web3: Web3,
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: number = 0.5,
  gasOverride?: number
): Promise<string | null> => {
  try {
    const account = await getCurrentAccount(web3);
    if (!account) throw new Error('No wallet connected');

    const chainId = Number(await web3.eth.getChainId());
    const routerAddress = getPangolinRouterAddress(chainId);
    const router = new web3.eth.Contract(PANGOLIN_ROUTER_ABI, routerAddress);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Get token decimals
    const fromDecimals = await getTokenDecimals(web3, fromToken);
    const toDecimals = await getTokenDecimals(web3, toToken);
    
    // Convert amount to token units
    const amountIn = toUnits(amount, fromDecimals);
    
    // Get expected output amount
    const path = [fromToken, toToken];
    const amounts = await router.methods.getAmountsOut(amountIn, path).call();
    if (!amounts || !Array.isArray(amounts) || amounts.length < 2) {
      throw new Error('Failed to get trade amounts');
    }
    const expectedOut = amounts[amounts.length - 1];
    
    // Calculate minimum amount out with slippage
    const amountOutMin = BigInt(expectedOut) * BigInt(10000 - Math.floor(slippage * 100)) / BigInt(10000);

    const WAVAX = resolveTokenAddress('AVAX', chainId);
    
    // Check and approve token if needed
    if (fromToken !== WAVAX) {
      const allowance = await checkTokenAllowance(web3, fromToken, account, routerAddress);
      if (allowance < parseFloat(amount)) {
        console.log('Approving token...');
        await approveToken(web3, fromToken, routerAddress, amount);
      }
    }
    
    let tx;
    const gasLimit = gasOverride ? Math.floor(gasOverride * 1.2) : 300000;
    
    if (fromToken === WAVAX) {
      // Swapping AVAX for tokens
      tx = await router.methods
        .swapExactAVAXForTokens(amountOutMin.toString(), path, account, deadline)
        .send({
          from: account,
          value: amountIn,
          gas: gasLimit.toString(),
        });
    } else if (toToken === WAVAX) {
      // Swapping tokens for AVAX
      tx = await router.methods
        .swapExactTokensForAVAX(amountIn, amountOutMin.toString(), path, account, deadline)
        .send({
          from: account,
          gas: gasLimit.toString(),
        });
    } else {
      // Swapping tokens for tokens
      tx = await router.methods
        .swapExactTokensForTokens(amountIn, amountOutMin.toString(), path, account, deadline)
        .send({
          from: account,
          gas: gasLimit.toString(),
        });
    }

    return tx.transactionHash;
  } catch (error) {
    console.error('Trade execution failed:', error);
    return null;
  }
};

/**
 * Get AIPoweredTrader contract instance
 */
export const getAIPoweredTraderContract = (web3: Web3) => {
  const addresses = getContractAddresses();
  if (!addresses.aiPoweredTrader || AI_POWERED_TRADER_ABI.length === 0) {
    throw new Error('AIPoweredTrader contract not deployed or ABI not loaded');
  }
  return new web3.eth.Contract(AI_POWERED_TRADER_ABI, addresses.aiPoweredTrader);
};

/**
 * Get PriceOracle contract instance
 */
export const getPriceOracleContract = (web3: Web3) => {
  const addresses = getContractAddresses();
  if (!addresses.priceOracle || PRICE_ORACLE_ABI.length === 0) {
    throw new Error('PriceOracle contract not deployed or ABI not loaded');
  }
  return new web3.eth.Contract(PRICE_ORACLE_ABI, addresses.priceOracle);
};

/**
 * Get current AI prediction status
 */
export const getAIPredictionStatus = async (web3: Web3) => {
  try {
    const contract = getAIPoweredTraderContract(web3);
    const status = await contract.methods.getAIPredictionStatus().call();
    return {
      isValid: status[0],
      confidence: parseInt(status[1])
    };
  } catch (error) {
    console.error('Failed to get AI prediction status:', error);
    return { isValid: false, confidence: 0 };
  }
};

/**
 * Get current AI prediction data
 */
export const getAIPrediction = async (web3: Web3) => {
  try {
    const contract = getPriceOracleContract(web3);
    const prediction = await contract.methods.getPrediction().call();
    return {
      price: web3.utils.fromWei(prediction[0], 'ether'),
      confidence: parseInt(prediction[1]),
      timestamp: parseInt(prediction[2]),
      expiresAt: parseInt(prediction[3]),
      isValid: prediction[4]
    };
  } catch (error) {
    console.error('Failed to get AI prediction:', error);
    return null;
  }
};

/**
 * Execute AI-validated trade through smart contract
 */
export const executeAITrade = async (
  web3: Web3,
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: number = 0.5,
  gasOverride?: number
): Promise<string | null> => {
  try {
    const account = await getCurrentAccount(web3);
    if (!account) throw new Error('No wallet connected');

    const contract = getAIPoweredTraderContract(web3);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Get token decimals
    const fromDecimals = await getTokenDecimals(web3, fromToken);
    const toDecimals = await getTokenDecimals(web3, toToken);
    
    // Convert amount to token units
    const amountIn = toUnits(amount, fromDecimals);
    
    // Get expected output amount from router
    const chainId = Number(await web3.eth.getChainId());
    const routerAddress = getPangolinRouterAddress(chainId);
    const router = new web3.eth.Contract(PANGOLIN_ROUTER_ABI, routerAddress);
    const path = [fromToken, toToken];
    const amounts = await router.methods.getAmountsOut(amountIn, path).call();
    if (!amounts || !Array.isArray(amounts) || amounts.length < 2) {
      throw new Error('Failed to get trade amounts');
    }
    const expectedOut = amounts[amounts.length - 1];
    
    // Calculate minimum amount out with slippage
    const amountOutMin = BigInt(expectedOut) * BigInt(10000 - Math.floor(slippage * 100)) / BigInt(10000);

    const WAVAX = resolveTokenAddress('AVAX', chainId);
    
    // Check and approve token if needed
    if (fromToken !== WAVAX) {
      const allowance = await checkTokenAllowance(web3, fromToken, account, contract.options.address);
      if (allowance < parseFloat(amount)) {
        console.log('Approving token for AI contract...');
        await approveToken(web3, fromToken, contract.options.address, amount);
      }
    }
    
    let tx;
    const gasLimit = gasOverride ? Math.floor(gasOverride * 1.2) : 300000;
    
    if (fromToken === WAVAX) {
      // Swapping AVAX for tokens
      tx = await contract.methods
        .tradeExactAVAXForTokens(toToken, amountOutMin.toString(), deadline)
        .send({
          from: account,
          value: amountIn,
          gas: gasLimit.toString(),
        });
    } else if (toToken === WAVAX) {
      // Swapping tokens for AVAX
      tx = await contract.methods
        .tradeExactTokensForAVAX(fromToken, amountIn, amountOutMin.toString(), deadline)
        .send({
          from: account,
          gas: gasLimit.toString(),
        });
    } else {
      // Swapping tokens for tokens
      tx = await contract.methods
        .tradeExactTokensForTokens(fromToken, toToken, amountIn, amountOutMin.toString(), deadline)
        .send({
          from: account,
          gas: gasLimit.toString(),
        });
    }

    return tx.transactionHash;
  } catch (error) {
    console.error('AI trade execution failed:', error);
    return null;
  }
};

// Type definitions for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (accounts: string[]) => void) => void;
      removeListener: (event: string, callback: (accounts: string[]) => void) => void;
    };
  }
}