import { Router } from 'express';
import { z } from 'zod';
import { AISystem } from '../libs/aiSystem';
import { PredictRequest, PredictResponse } from '../types/api';

const router = Router();

// Zod schema for MarketDataPoint validation
const MarketDataPointSchema = z.object({
  timestamp: z.number(),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  high: z.number().positive(),
  low: z.number().positive(),
  open: z.number().positive(),
  close: z.number().positive(),
});

const PredictRequestSchema = z.object({
  recentData: z.array(MarketDataPointSchema).optional(),
});

/**
 * POST /api/predict
 * Get LSTM price prediction
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validationResult = PredictRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request data format',
        details: validationResult.error.errors,
        timestamp: Date.now()
      });
    }

    const { recentData }: PredictRequest = validationResult.data;
    
    // Validate minimum data points if recentData is provided
    if (recentData && recentData.length < 60) {
      return res.status(400).json({
        error: 'Insufficient data',
        message: 'At least 60 data points are required for prediction',
        timestamp: Date.now()
      });
    }
    
    console.log('📊 Prediction request received');
    
    // Get AI system instance
    const aiSystem = AISystem.getInstance();
    
    // Get prediction
    const prediction = await aiSystem.predict(recentData);
    
    const response: PredictResponse = {
      price: prediction.price,
      confidence: prediction.confidence,
      timestamp: Date.now()
    };
    
    console.log(`✅ Prediction generated: $${prediction.price.toFixed(2)} (${prediction.confidence.toFixed(1)}% confidence)`);
    
    res.json(response);
  } catch (error: any) {
    console.error('❌ Prediction failed:', error);
    
    res.status(500).json({
      error: 'Prediction failed',
      message: error.message || 'Failed to generate prediction',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/predict/status
 * Get prediction system status
 */
router.get('/status', (req, res) => {
  try {
    const aiSystem = AISystem.getInstance();
    const status = aiSystem.getStatus();
    
    res.json({
      lstmReady: status.lstmReady,
      rlReady: status.rlReady,
      initialized: status.initialized,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('❌ Status check failed:', error);
    
    res.status(500).json({
      error: 'Status check failed',
      message: error.message || 'Failed to get system status',
      timestamp: Date.now()
    });
  }
});

export { router as predictRouter };
