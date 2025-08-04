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
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Initialize AI system
  const initializeAI = useCallback(async () => {
    console.log('🚀 Starting AI initialization...');
    setIsTraining(true);
    setInitializationError(null);
    
    try {
      // First, try to load existing models
      console.log('📂 Step 1: Attempting to load existing AI models...');
      const system = new AITradingSystem();
      
      try {
        await system.loadModels();
        console.log('✅ Successfully loaded existing AI models!');
        
        // Get some recent data for predictions (but don't retrain)
        console.log('📊 Step 2: Collecting recent data for predictions...');
        const rawData = await collectHistoricalData();
        const processedData = preprocessData(rawData);
        const features = processMarketData(processedData);
        
        setHistoricalData(features);
        setAISystem(system);
        setIsInitialized(true);
        setLastUpdate(new Date());
        
        // Get initial prediction with loaded models
        console.log('🔮 Getting initial AI prediction with loaded models...');
        const initialSignal = await system.getTradeSignal(features.slice(-60), 0.5);
        setCurrentPrediction(initialSignal.prediction);
        setCurrentSignal(initialSignal.decision);
        console.log('✅ Initial prediction received:', initialSignal);
        
        return; // Successfully loaded, no need to train
        
      } catch (loadError: any) {
        console.log('⚠️ Could not load existing models:', loadError.message);
        console.log('🔄 Proceeding with training new models...');
      }
      
      // If loading failed, train new models
      console.log('📊 Step 2: Collecting historical data for training...');
      const rawData = await collectHistoricalData();
      console.log(`📊 Collected ${rawData.length} raw data points`);
      
      console.log('🔧 Step 3: Preprocessing data...');
      const processedData = preprocessData(rawData);
      console.log(`🔧 Preprocessed ${processedData.length} data points`);
      
      console.log('⚙️ Step 4: Processing market features...');
      const features = processMarketData(processedData);
      console.log(`⚙️ Generated ${features.length} feature sets`);
      
      setHistoricalData(features);
      
      console.log('🤖 Step 5: Training new AI models...');
      await system.initialize(features);
      
      setAISystem(system);
      setIsInitialized(true);
      setLastUpdate(new Date());
      
      console.log('✅ AI Trading System trained and initialized successfully!');
      
      // Get initial prediction
      console.log('🔮 Getting initial AI prediction...');
      const initialSignal = await system.getTradeSignal(features.slice(-60), 0.5);
      setCurrentPrediction(initialSignal.prediction);
      setCurrentSignal(initialSignal.decision);
      console.log('✅ Initial prediction received:', initialSignal);
      
    } catch (error: any) {
      console.error('❌ Failed to initialize AI system:', error);
      setInitializationError(error.message || 'Unknown error during initialization');
    } finally {
      setIsTraining(false);
    }
  }, []);

  // Manual initialization trigger for testing
  const manualInitialize = useCallback(async () => {
    console.log('🔧 Manual AI initialization triggered');
    await initializeAI();
  }, [initializeAI]);

  // Check if models exist in localStorage
  const checkModelsExist = useCallback(() => {
    const lstmExists = localStorage.getItem('lstm_model') !== null;
    const rlExists = localStorage.getItem('rl_model') !== null;
    console.log('📂 Model existence check:', { lstmExists, rlExists });
    return lstmExists && rlExists;
  }, []);

  // Force retrain models (useful for updating with new data)
  const forceRetrain = useCallback(async () => {
    console.log('🔄 Force retraining AI models...');
    setIsTraining(true);
    setInitializationError(null);
    
    try {
      console.log('📊 Collecting fresh data for retraining...');
      const rawData = await collectHistoricalData();
      const processedData = preprocessData(rawData);
      const features = processMarketData(processedData);
      
      setHistoricalData(features);
      
      console.log('🤖 Training new AI models...');
      const system = new AITradingSystem();
      await system.initialize(features);
      
      setAISystem(system);
      setIsInitialized(true);
      setLastUpdate(new Date());
      
      console.log('✅ AI models retrained successfully!');
      
      // Get initial prediction
      const initialSignal = await system.getTradeSignal(features.slice(-60), 0.5);
      setCurrentPrediction(initialSignal.prediction);
      setCurrentSignal(initialSignal.decision);
      
    } catch (error: any) {
      console.error('❌ Failed to retrain models:', error);
      setInitializationError(error.message || 'Failed to retrain models');
    } finally {
      setIsTraining(false);
    }
  }, []);

  // Get AI prediction and trading signal
  const getAISignal = useCallback(async (portfolioRatio: number = 0.5) => {
    if (!aiSystem || !isInitialized || historicalData.length === 0) {
      console.log('⚠️ Cannot get AI signal - system not ready:', {
        hasSystem: !!aiSystem,
        isInitialized,
        dataLength: historicalData.length
      });
      return null;
    }

    try {
      console.log('🔮 Getting AI signal...');
      // Use recent data for prediction
      const recentData = historicalData.slice(-60); // Last 60 data points
      const signal = await aiSystem.getTradeSignal(recentData, portfolioRatio);
      
      setCurrentPrediction(signal.prediction);
      setCurrentSignal(signal.decision);
      setLastUpdate(new Date());
      
      console.log('✅ AI signal received:', signal);
      return signal;
    } catch (error) {
      console.error('❌ Failed to get AI signal:', error);
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
      console.log('🔄 Retraining AI models...');
      await aiSystem.initialize(historicalData);
      console.log('✅ AI models retrained successfully');
    } catch (error) {
      console.error('❌ Failed to retrain models:', error);
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
      console.log('🚀 Auto-initializing AI system...');
      initializeAI();
    }
  }, [isInitialized, isTraining, initializeAI]);

  return {
    isInitialized,
    isTraining,
    currentPrediction,
    currentSignal,
    lastUpdate,
    initializationError,
    historicalDataLength: historicalData.length,
    initializeAI: manualInitialize, // Expose manual trigger
    getAISignal,
    updateWithNewData,
    retrainModels,
    checkModelsExist,
    forceRetrain,
  };
};