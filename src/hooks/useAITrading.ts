import { useState, useEffect, useCallback } from 'react';
import { AITradingSystem, ProcessedFeatures } from '@/utils/aiModels';
import { collectHistoricalData, preprocessData } from '@/utils/dataCollection';
import { processMarketData } from '@/utils/aiModels';

/**
 * Custom hook for AI Trading functionality
 * Manages LSTM predictions, RL trading decisions, and model training
 */
export const useAITrading = () => {
  const [aiSystem, setAISystem] = useState<AITradingSystem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<{
    price: number;
    confidence: number;
  } | null>(null);
  const [currentSignal, setCurrentSignal] = useState<{
    action: string;
    confidence: number;
  } | null>(null);
  const [historicalData, setHistoricalData] = useState<ProcessedFeatures[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialize AI system
  const initializeAI = useCallback(async () => {
    setIsTraining(true);
    try {
      console.log('Initializing AI Trading System...');
      
      // Collect and preprocess data
      const rawData = await collectHistoricalData();
      const processedData = preprocessData(rawData);
      const features = processMarketData(processedData);
      
      setHistoricalData(features);
      
      // Initialize AI system
      const system = new AITradingSystem();
      await system.initialize(features);
      
      setAISystem(system);
      setIsInitialized(true);
      setLastUpdate(new Date());
      
      console.log('AI Trading System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI system:', error);
      
      // Try to load existing models
      try {
        const system = new AITradingSystem();
        await system.loadModels();
        setAISystem(system);
        setIsInitialized(true);
        console.log('Loaded existing AI models');
      } catch (loadError) {
        console.error('Failed to load existing models:', loadError);
      }
    } finally {
      setIsTraining(false);
    }
  }, []);

  // Get AI prediction and trading signal
  const getAISignal = useCallback(async (portfolioRatio: number = 0.5) => {
    if (!aiSystem || !isInitialized || historicalData.length === 0) {
      return null;
    }

    try {
      // Use recent data for prediction
      const recentData = historicalData.slice(-60); // Last 60 data points
      const signal = await aiSystem.getTradeSignal(recentData, portfolioRatio);
      
      setCurrentPrediction(signal.prediction);
      setCurrentSignal(signal.decision);
      setLastUpdate(new Date());
      
      return signal;
    } catch (error) {
      console.error('Failed to get AI signal:', error);
      return null;
    }
  }, [aiSystem, isInitialized, historicalData]);

  // Update model with new data
  const updateWithNewData = useCallback(async (newDataPoint: any) => {
    if (!aiSystem || !isInitialized) return;

    try {
      // Process new data point
      const processed = processMarketData([newDataPoint]);
      if (processed.length > 0) {
        setHistoricalData(prev => [...prev.slice(-999), processed[0]]);
      }
    } catch (error) {
      console.error('Failed to update with new data:', error);
    }
  }, [aiSystem, isInitialized]);

  // Retrain models with new data
  const retrainModels = useCallback(async () => {
    if (!aiSystem || historicalData.length === 0) return;

    setIsTraining(true);
    try {
      console.log('Retraining AI models...');
      await aiSystem.initialize(historicalData);
      console.log('AI models retrained successfully');
    } catch (error) {
      console.error('Failed to retrain models:', error);
    } finally {
      setIsTraining(false);
    }
  }, [aiSystem, historicalData]);

  // Auto-update predictions every 5 minutes
  useEffect(() => {
    if (!isInitialized || isTraining) return;

    const interval = setInterval(async () => {
      await getAISignal();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isInitialized, isTraining, getAISignal]);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized && !isTraining) {
      initializeAI();
    }
  }, [isInitialized, isTraining, initializeAI]);

  return {
    isInitialized,
    isTraining,
    currentPrediction,
    currentSignal,
    lastUpdate,
    initializeAI,
    getAISignal,
    updateWithNewData,
    retrainModels,
    historicalDataLength: historicalData.length,
  };
};