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
    USDT: '0x0000000000000000000000000000000000000000' // Placeholder for Fuji USDT
  }
};

// Smart Contract ABIs and Addresses
export const AI_POWERED_TRADER_ABI = TraderArtifact.abi || [];
export const PRICE_ORACLE_ABI = OracleArtifact.abi || [];

// Contract addresses from environment variables
const getContractAddresses = () => {
  const network = import.meta.env.VITE_NETWORK || 'fuji';
  
  return {
    aiPoweredTrader: import.meta.env.VITE_AI_POWERED_TRADER_ADDRESS || '',
    priceOracle: import.meta.env.VITE_PRICE_ORACLE_ADDRESS || '',
    chainId: network === 'avalanche' ? 43114 : 43113,
  };
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
];

/**
 * Execute trade on Pangolin DEX
 */
export const executeTrade = async (
  web3: Web3,
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: number = 0.5
): Promise<string | null> => {
  try {
    const account = await getCurrentAccount(web3);
    if (!account) throw new Error('No wallet connected');

    const chainId = Number(await web3.eth.getChainId());
    const routerAddress = getPangolinRouterAddress(chainId);
    const router = new web3.eth.Contract(PANGOLIN_ROUTER_ABI, routerAddress);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Convert amount to Wei
    const amountIn = web3.utils.toWei(amount, 'ether');
    
    // Calculate minimum amount out with slippage
    const amountOutMin = web3.utils.toWei(
      (parseFloat(amount) * (1 - slippage / 100)).toString(),
      'ether'
    );

    const path = [fromToken, toToken];

    const { chainId: networkChainId } = getContractAddresses();
    const WAVAX = TOKEN_ADDRESSES[networkChainId].AVAX;
    
    let tx;
    if (fromToken === WAVAX) {
      // Swapping AVAX for tokens
      tx = await router.methods
        .swapExactAVAXForTokens(amountOutMin, path, account, deadline)
        .send({
          from: account,
          value: amountIn,
          gas: '300000',
        });
    } else {
      // Swapping tokens for tokens
      tx = await router.methods
        .swapExactTokensForTokens(amountIn, amountOutMin, path, account, deadline)
        .send({
          from: account,
          gas: '300000',
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
  slippage: number = 0.5
): Promise<string | null> => {
  try {
    const account = await getCurrentAccount(web3);
    if (!account) throw new Error('No wallet connected');

    const contract = getAIPoweredTraderContract(web3);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Convert amount to Wei
    const amountIn = web3.utils.toWei(amount, 'ether');
    
    // Calculate minimum amount out with slippage
    const amountOutMin = web3.utils.toWei(
      (parseFloat(amount) * (1 - slippage / 100)).toString(),
      'ether'
    );

    const { chainId: networkChainId } = getContractAddresses();
    const WAVAX = TOKEN_ADDRESSES[networkChainId].AVAX;
    
    let tx;
    if (fromToken === WAVAX) {
      // Swapping AVAX for tokens
      tx = await contract.methods
        .tradeExactAVAXForTokens(toToken, amountOutMin, deadline)
        .send({
          from: account,
          value: amountIn,
          gas: '300000',
        });
    } else if (toToken === WAVAX) {
      // Swapping tokens for AVAX
      tx = await contract.methods
        .tradeExactTokensForAVAX(fromToken, amountIn, amountOutMin, deadline)
        .send({
          from: account,
          gas: '300000',
        });
    } else {
      // Swapping tokens for tokens
      tx = await contract.methods
        .tradeExactTokensForTokens(fromToken, toToken, amountIn, amountOutMin, deadline)
        .send({
          from: account,
          gas: '300000',
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