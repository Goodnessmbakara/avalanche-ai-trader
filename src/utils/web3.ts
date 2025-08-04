import Web3 from 'web3';

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

// Pangolin Router contract address (Avalanche)
export const PANGOLIN_ROUTER_ADDRESS = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106';

// Token addresses for AVAX/USDT pair
export const TOKEN_ADDRESSES = {
  AVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Wrapped AVAX
  USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // USDT on Avalanche
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

    const router = new web3.eth.Contract(PANGOLIN_ROUTER_ABI, PANGOLIN_ROUTER_ADDRESS);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Convert amount to Wei
    const amountIn = web3.utils.toWei(amount, 'ether');
    
    // Calculate minimum amount out with slippage
    const amountOutMin = web3.utils.toWei(
      (parseFloat(amount) * (1 - slippage / 100)).toString(),
      'ether'
    );

    const path = [fromToken, toToken];

    let tx;
    if (fromToken === TOKEN_ADDRESSES.AVAX) {
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