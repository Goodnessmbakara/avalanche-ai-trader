import { Router } from 'express';
import { AISystem } from '../libs/aiSystem';
import { TradeRequest, TradeResponse } from '../types/api';

const router = Router();

/**
 * POST /api/trade
 * Get RL trading decision
 */
router.post('/', async (req, res) => {
  try {
    const { features, portfolioRatio }: TradeRequest = req.body;
    
    console.log('🎯 Trading decision request received');
    
    // Validate input parameters
    if (!features) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Features are required',
        timestamp: Date.now()
      });
    }
    
    if (typeof portfolioRatio !== 'number' || portfolioRatio < 0 || portfolioRatio > 1) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Portfolio ratio must be a number between 0 and 1',
        timestamp: Date.now()
      });
    }
    
    // Validate features structure
    const requiredFields = ['price', 'sma7', 'sma14', 'sma30', 'ema10', 'ema30', 'volatility', 'momentum', 'volume', 'priceChange', 'volumeChange'];
    for (const field of requiredFields) {
      if (typeof features[field as keyof typeof features] !== 'number') {
        return res.status(400).json({
          error: 'Invalid request',
          message: `Feature '${field}' must be a number`,
          timestamp: Date.now()
        });
      }
    }
    
    // Get AI system instance
    const aiSystem = AISystem.getInstance();
    
    // Get trading decision
    const decision = aiSystem.getDecision(features, portfolioRatio);
    
    const response: TradeResponse = {
      action: decision.action as 'BUY' | 'SELL' | 'HOLD',
      confidence: decision.confidence,
      timestamp: Date.now()
    };
    
    console.log(`✅ Trading decision: ${decision.action} (${decision.confidence.toFixed(1)}% confidence)`);
    
    res.json(response);
  } catch (error: any) {
    console.error('❌ Trading decision failed:', error);
    
    res.status(500).json({
      error: 'Trading decision failed',
      message: error.message || 'Failed to generate trading decision',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/trade/status
 * Get trading system status
 */
router.get('/status', (req, res) => {
  try {
    const aiSystem = AISystem.getInstance();
    const status = aiSystem.getStatus();
    
    res.json({
      rlReady: status.rlReady,
      initialized: status.initialized,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('❌ Trading status check failed:', error);
    
    res.status(500).json({
      error: 'Status check failed',
      message: error.message || 'Failed to get trading system status',
      timestamp: Date.now()
    });
  }
});

export { router as tradeRouter };
