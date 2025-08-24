import { Router } from 'express';
import { initializeWeb3Server, executeAITrade, validatePredictionForTrade, getServerAccount, getServerAvaxBalance, getServerTokenBalance } from '../../libs/web3Server';
import { BlockchainTradeRequest, BlockchainTradeResponse } from '../../types/api';

const router = Router();

/**
 * POST /api/blockchain/trade
 * Execute AI-validated trade through smart contract
 */
router.post('/', async (req, res) => {
  try {
    const { fromToken, toToken, amount, slippage = 0.5 }: BlockchainTradeRequest = req.body;
    
    console.log('🔗 Blockchain trade request received');
    
    // Validate input parameters
    if (!fromToken || !toToken || !amount) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'fromToken, toToken, and amount are required',
        timestamp: Date.now()
      });
    }
    
    if (typeof amount !== 'string' || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Amount must be a positive number string',
        timestamp: Date.now()
      });
    }
    
    if (typeof slippage !== 'number' || slippage < 0 || slippage > 10) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Slippage must be a number between 0 and 10',
        timestamp: Date.now()
      });
    }
    
    // Initialize Web3 connection
    const web3 = initializeWeb3Server();
    
    // Check if server account is configured
    const account = getServerAccount(web3);
    if (!account) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'No server account configured. Please set BACKEND_PRIVATE_KEY environment variable.',
        timestamp: Date.now()
      });
    }
    
    console.log(`🔐 Using server account: ${account}`);
    
    // Validate prediction and balances before executing trade
    const validation = await validatePredictionForTrade(web3, fromToken, toToken, amount);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Trade validation failed',
        message: validation.reason || 'Trade validation failed',
        timestamp: Date.now()
      });
    }
    
    // Get current balances for logging
    const avaxBalance = await getServerAvaxBalance(web3);
    const tokenBalance = await getServerTokenBalance(web3, fromToken);
    
    console.log(`💰 Current balances - AVAX: ${avaxBalance.toFixed(4)}, Token: ${tokenBalance.toFixed(4)}`);
    console.log(`📊 Executing trade: ${amount} ${fromToken} → ${toToken} (slippage: ${slippage}%)`);
    
    // Execute the trade
    const txHash = await executeAITrade(web3, fromToken, toToken, amount, slippage);
    
    if (!txHash) {
      return res.status(500).json({
        error: 'Trade execution failed',
        message: 'Failed to execute trade on blockchain',
        timestamp: Date.now()
      });
    }
    
    const response: BlockchainTradeResponse = {
      txHash,
      timestamp: Date.now()
    };
    
    console.log(`✅ Trade executed successfully: ${txHash}`);
    
    res.json(response);
  } catch (error: any) {
    console.error('❌ Blockchain trade failed:', error);
    
    res.status(500).json({
      error: 'Blockchain trade failed',
      message: error.message || 'Failed to execute trade on blockchain',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/blockchain/status
 * Get blockchain connection and account status
 */
router.get('/status', (req, res) => {
  try {
    const web3 = initializeWeb3Server();
    const account = getServerAccount(web3);
    
    res.json({
      connected: !!web3,
      accountConfigured: !!account,
      accountAddress: account || null,
      network: process.env.BACKEND_NETWORK || 'fuji',
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('❌ Blockchain status check failed:', error);
    
    res.status(500).json({
      error: 'Status check failed',
      message: error.message || 'Failed to get blockchain status',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/blockchain/balances
 * Get current account balances
 */
router.get('/balances', async (req, res) => {
  try {
    const web3 = initializeWeb3Server();
    const account = getServerAccount(web3);
    
    if (!account) {
      return res.status(500).json({
        error: 'No account configured',
        message: 'Server account not configured',
        timestamp: Date.now()
      });
    }
    
    const avaxBalance = await getServerAvaxBalance(web3);
    
    res.json({
      account,
      avaxBalance,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('❌ Balance check failed:', error);
    
    res.status(500).json({
      error: 'Balance check failed',
      message: error.message || 'Failed to get account balances',
      timestamp: Date.now()
    });
  }
});

export { router as blockchainRouter };
