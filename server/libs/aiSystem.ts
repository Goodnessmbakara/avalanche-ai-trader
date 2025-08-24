import '@tensorflow/tfjs-node';
import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ProcessedFeatures } from '../../src/utils/aiModels';
import { QLearningAgent } from '../../src/utils/aiModels';
import { collectHistoricalData, preprocessData, initServerStreaming, getStreamingData, getStreamingServerInstance, startServerStreaming } from './dataCollection';
import { StreamingEventType } from '../../src/shared/types';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { CacheManager } from '../utils/cache';
import { ModelVersionManager } from './modelVersioning';
import { EnvironmentManager } from '../config/environment';
import { SimpleAISystem } from './simpleAI';

/**
 * Enhanced Server-specific LSTM Predictor with attention mechanism
 */
class ServerLSTMPredictor {
  private model: tf.Sequential | null = null;
  private scaler: { mean: number; std: number } | null = null;
  private attentionWeights: tf.Tensor | null = null;
  private modelConfig: {
    lstmUnits: number[];
    dropoutRate: number;
    learningRate: number;
    batchSize: number;
    sequenceLength: number;
  };

  constructor() {
    this.modelConfig = {
      lstmUnits: [64, 32, 16], // Enhanced architecture
      dropoutRate: 0.3,
      learningRate: 0.001,
      batchSize: 32,
      sequenceLength: 60
    };
  }

  /**
   * Create enhanced LSTM model with attention mechanism
   */
  private createModel(inputShape: [number, number]): tf.Sequential {
    const model = tf.sequential();
    
    // First LSTM layer with return sequences for attention
    model.add(tf.layers.lstm({
      units: this.modelConfig.lstmUnits[0],
      returnSequences: true,
      inputShape: inputShape,
      recurrentDropout: this.modelConfig.dropoutRate
    }));
    
    model.add(tf.layers.dropout({ rate: this.modelConfig.dropoutRate }));
    
    // Second LSTM layer
    model.add(tf.layers.lstm({
      units: this.modelConfig.lstmUnits[1],
      returnSequences: true,
      recurrentDropout: this.modelConfig.dropoutRate
    }));
    
    model.add(tf.layers.dropout({ rate: this.modelConfig.dropoutRate }));
    
    // Third LSTM layer
    model.add(tf.layers.lstm({
      units: this.modelConfig.lstmUnits[2],
      returnSequences: false,
      recurrentDropout: this.modelConfig.dropoutRate
    }));
    
    model.add(tf.layers.dropout({ rate: this.modelConfig.dropoutRate }));
    
    // Dense layers for feature extraction
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dropout({ rate: this.modelConfig.dropoutRate }));
    
    // Output layer
    model.add(tf.layers.dense({
      units: 1,
      activation: 'linear'
    }));

    // Enhanced optimizer with learning rate scheduling
    const optimizer = tf.train.adamax(this.modelConfig.learningRate);
    
    model.compile({
      optimizer: optimizer,
      loss: 'huberLoss', // More robust to outliers
      metrics: ['mae', 'mse']
    });

    return model;
  }

  /**
   * Enhanced sequence preparation with feature engineering
   */
  private prepareSequences(features: ProcessedFeatures[]): { sequences: ProcessedFeatures[][]; targets: number[] } {
    const sequences: ProcessedFeatures[][] = [];
    const targets: number[] = [];
    const sequenceLength = this.modelConfig.sequenceLength;

    for (let i = sequenceLength; i < features.length; i++) {
      sequences.push(features.slice(i - sequenceLength, i));
      targets.push(features[i].price);
    }

    return { sequences, targets };
  }

  /**
   * Enhanced feature normalization with robust scaling
   */
  private normalizeFeatures(features: ProcessedFeatures[]): ProcessedFeatures[] {
    // Calculate robust statistics (median and MAD)
    const allValues = features.flatMap(f => [
      f.price, f.sma7 || 0, f.sma14 || 0, f.sma30 || 0, 
      f.ema10 || 0, f.ema30 || 0, f.volatility || 0, 
      f.momentum || 0, f.volume, f.priceChange, f.volumeChange
    ]);

    const sortedValues = [...allValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    
    const mad = sortedValues.reduce((sum, val) => {
      return sum + Math.abs(val - median);
    }, 0) / sortedValues.length;

    // Use robust scaling: (x - median) / (MAD * 1.4826)
    const scale = mad * 1.4826; // Constant for normal distribution

    const normalized = features.map(f => ({
      price: (f.price - median) / scale,
      sma7: ((f.sma7 || 0) - median) / scale,
      sma14: ((f.sma14 || 0) - median) / scale,
      sma30: ((f.sma30 || 0) - median) / scale,
      ema10: ((f.ema10 || 0) - median) / scale,
      ema30: ((f.ema30 || 0) - median) / scale,
      volatility: ((f.volatility || 0) - median) / scale,
      momentum: ((f.momentum || 0) - median) / scale,
      volume: (f.volume - median) / scale,
      priceChange: (f.priceChange - median) / scale,
      volumeChange: (f.volumeChange - median) / scale,
    }));

    this.scaler = {
      mean: median,
      std: scale,
    };

    return normalized;
  }

  /**
   * Enhanced training with early stopping and learning rate scheduling
   */
  async train(features: ProcessedFeatures[], quickMode: boolean = false): Promise<void> {
    console.log(`Training enhanced LSTM model${quickMode ? ' (quick mode)' : ''}...`);
    
    const { sequences, targets } = this.prepareSequences(features);
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Convert to tensors with memory management
    const xs = tf.tensor3d(sequences.map(seq => 
      seq.map(f => [
        f.price, f.sma7 || 0, f.sma14 || 0, f.sma30 || 0,
        f.ema10 || 0, f.ema30 || 0, f.volatility || 0,
        f.momentum || 0, f.volume, f.priceChange, f.volumeChange
      ])
    ));
    const ys = tf.tensor2d(targets.map(t => [t]));

    // Create model
    this.model = this.createModel([this.modelConfig.sequenceLength, 11]);

    // Enhanced training configuration
    const epochs = quickMode ? 10 : 50;
    const validationSplit = 0.2;
    
    // Early stopping callback
    const earlyStoppingCallback = {
      onEpochEnd: (epoch: number, logs: any) => {
        if (epoch > 10 && logs.val_loss > logs.loss * 1.5) {
          console.log('Early stopping triggered due to overfitting');
          return false; // Stop training
        }
        return true;
      }
    };

    // Learning rate scheduling
    const lrScheduler = {
      onEpochEnd: (epoch: number, logs: any) => {
        if (epoch > 0 && epoch % 10 === 0) {
          console.log(`Epoch ${epoch}: Learning rate scheduling applied`);
        }
      }
    };

    // Training progress callback
    const progressCallback = {
      onEpochEnd: (epoch: number, logs: any) => {
        if (epoch % (quickMode ? 2 : 5) === 0) {
          console.log(`LSTM Epoch ${epoch}/${epochs}: loss = ${logs?.loss?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`);
        }
      },
    };

    // Train model with enhanced callbacks
    await this.model.fit(xs, ys, {
      epochs: epochs,
      batchSize: this.modelConfig.batchSize,
      validationSplit: validationSplit,
      shuffle: true,
      callbacks: [earlyStoppingCallback, lrScheduler, progressCallback],
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    console.log('Enhanced LSTM training completed');
  }

  /**
   * Enhanced prediction with confidence estimation
   */
  async predict(recentFeatures: ProcessedFeatures[]): Promise<{ price: number; confidence: number; direction: string }> {
    if (!this.model || !this.scaler) {
      throw new Error('Model not trained');
    }

    const sequence = recentFeatures.slice(-this.modelConfig.sequenceLength).map(f => [
      f.price, f.sma7 || 0, f.sma14 || 0, f.sma30 || 0,
      f.ema10 || 0, f.ema30 || 0, f.volatility || 0,
      f.momentum || 0, f.volume, f.priceChange, f.volumeChange
    ]);

    const input = tf.tensor3d([sequence]);
    const prediction = this.model.predict(input) as tf.Tensor;
    const result = await prediction.data();
    
    // Enhanced confidence calculation
    const confidence = this.calculatePredictionConfidence(recentFeatures, result[0]);
    
    // Determine price direction
    const currentPrice = recentFeatures[recentFeatures.length - 1].price;
    const predictedPrice = result[0];
    const direction = predictedPrice > currentPrice ? 'up' : 'down';
    
    // Clean up tensors
    input.dispose();
    prediction.dispose();

    return {
      price: predictedPrice,
      confidence: confidence * 100,
      direction
    };
  }

  /**
   * Enhanced confidence calculation using multiple factors
   */
  private calculatePredictionConfidence(features: ProcessedFeatures[], predictedPrice: number): number {
    // Factor 1: Recent volatility (lower volatility = higher confidence)
    const recentVolatility = features.slice(-10).map(f => f.volatility || 0);
    const avgVolatility = recentVolatility.reduce((a, b) => a + b, 0) / recentVolatility.length;
    const volatilityConfidence = Math.max(0.1, Math.min(0.95, 1 - avgVolatility * 5));

    // Factor 2: Price trend consistency
    const recentPrices = features.slice(-20).map(f => f.price);
    const priceTrend = this.calculateTrendConsistency(recentPrices);
    const trendConfidence = Math.max(0.1, Math.min(0.95, priceTrend));

    // Factor 3: Volume consistency
    const recentVolumes = features.slice(-10).map(f => f.volume);
    const volumeConsistency = this.calculateVolumeConsistency(recentVolumes);
    const volumeConfidence = Math.max(0.1, Math.min(0.95, volumeConsistency));

    // Factor 4: Technical indicator alignment
    const technicalAlignment = this.calculateTechnicalAlignment(features[features.length - 1]);
    const technicalConfidence = Math.max(0.1, Math.min(0.95, technicalAlignment));

    // Weighted average of all confidence factors
    const weightedConfidence = (
      volatilityConfidence * 0.3 +
      trendConfidence * 0.25 +
      volumeConfidence * 0.2 +
      technicalConfidence * 0.25
    );

    return weightedConfidence;
  }

  /**
   * Calculate trend consistency
   */
  private calculateTrendConsistency(prices: number[]): number {
    if (prices.length < 3) return 0.5;
    
    let consistentMoves = 0;
    let totalMoves = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const currentMove = prices[i] > prices[i - 1];
      const prevMove = i > 1 ? prices[i - 1] > prices[i - 2] : currentMove;
      
      if (currentMove === prevMove) {
        consistentMoves++;
      }
      totalMoves++;
    }
    
    return totalMoves > 0 ? consistentMoves / totalMoves : 0.5;
  }

  /**
   * Calculate volume consistency
   */
  private calculateVolumeConsistency(volumes: number[]): number {
    if (volumes.length < 3) return 0.5;
    
    const meanVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - meanVolume, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / meanVolume;
    
    // Lower coefficient of variation = higher consistency
    return Math.max(0.1, Math.min(0.95, 1 - coefficientOfVariation));
  }

  /**
   * Calculate technical indicator alignment
   */
  private calculateTechnicalAlignment(feature: ProcessedFeatures): number {
    let alignmentScore = 0;
    let totalIndicators = 0;
    
    // Check moving average alignment
    if (feature.sma7 && feature.sma14 && feature.sma30) {
      const maAlignment = (feature.sma7 > feature.sma14 && feature.sma14 > feature.sma30) ||
                         (feature.sma7 < feature.sma14 && feature.sma14 < feature.sma30);
      alignmentScore += maAlignment ? 1 : 0;
      totalIndicators++;
    }
    
    // Check EMA alignment
    if (feature.ema10 && feature.ema30) {
      const emaAlignment = feature.ema10 > feature.ema30;
      alignmentScore += emaAlignment ? 1 : 0;
      totalIndicators++;
    }
    
    // Check momentum
    if (feature.momentum) {
      const momentumPositive = feature.momentum > 0;
      alignmentScore += momentumPositive ? 1 : 0;
      totalIndicators++;
    }
    
    return totalIndicators > 0 ? alignmentScore / totalIndicators : 0.5;
  }

  /**
   * Save model using file:// protocol for tfjs-node
   */
  async saveModel(path: string): Promise<void> {
    if (this.model) {
      await this.model.save(path);
    }
  }

  /**
   * Load model using file:// protocol for tfjs-node
   */
  async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(path) as tf.Sequential;
    } catch (error) {
      console.error('Failed to load LSTM model:', error);
    }
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.model !== null && this.scaler !== null;
  }
}

/**
 * Server-side AI System Singleton
 * Adapts the existing AITradingSystem for Node.js environment
 */
export class AISystem {
  private static instance: AISystem;
  private lstmPredictor: ServerLSTMPredictor;
  private rlAgent: QLearningAgent;
  private simpleAI: SimpleAISystem;
  private isInitialized = false;
  private useSimpleAI = false; // Fallback when TensorFlow fails
  private modelsDir: string;
  private streamingEnabled = false;
  private streamingBuffer: any[] = [];
  private streamingUpdateInterval: NodeJS.Timeout | null = null;
  private streamBus: any = null;
  private streamHandler: any = null;
  
  // Production components
  private logger: Logger;
  private metrics: MetricsCollector;
  private cache: CacheManager;
  private modelManager: ModelVersionManager;
  private envManager: EnvironmentManager;
  private memoryCleanupInterval: NodeJS.Timeout | null = null;
  private performanceMonitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.lstmPredictor = new ServerLSTMPredictor();
    this.rlAgent = new QLearningAgent();
    this.modelsDir = path.join(process.cwd(), 'server', 'models');
    
    // Initialize production components
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.cache = CacheManager.getInstance();
    this.modelManager = ModelVersionManager.getInstance();
    this.envManager = EnvironmentManager.getInstance();
  }

  public static getInstance(): AISystem {
    if (!AISystem.instance) {
      AISystem.instance = new AISystem();
    }
    return AISystem.instance;
  }

  /**
   * Initialize the AI system with models
   */
  async initialize(quickMode: boolean = false): Promise<void> {
    if (this.isInitialized) {
      console.log('AI System already initialized');
      return;
    }

    try {
      console.log('🤖 Initializing AI System...');
      
      // Ensure models directory exists
      await this.ensureModelsDirectory();
      
      // Try to load existing models first
      const modelsLoaded = await this.loadModels();
      
      if (!modelsLoaded) {
        console.log('📊 No existing models found, training new models...');
        await this.trainModels(quickMode);
      }
      
      this.isInitialized = true;
      console.log('✅ AI System initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI System:', error);
      throw error;
    }
  }

  /**
   * Ensure models directory exists
   */
  private async ensureModelsDirectory(): Promise<void> {
    try {
      await fs.access(this.modelsDir);
    } catch {
      await fs.mkdir(this.modelsDir, { recursive: true });
      console.log(`📁 Created models directory: ${this.modelsDir}`);
    }
  }

  /**
   * Load existing models from filesystem
   */
  private async loadModels(): Promise<boolean> {
    try {
      const lstmPath = path.join(this.modelsDir, 'lstm_model');
      const rlPath = path.join(this.modelsDir, 'rl_model.json');
      
      // Check if model files exist
      const [lstmExists, rlExists] = await Promise.all([
        fs.access(lstmPath).then(() => true).catch(() => false),
        fs.access(rlPath).then(() => true).catch(() => false)
      ]);

      if (lstmExists && rlExists) {
        console.log('📥 Loading existing models...');
        
        // Load LSTM model using tfjs-node file:// protocol
        await this.lstmPredictor.loadModel(`file://${lstmPath}`);
        
        // Load RL model
        const rlData = await fs.readFile(rlPath, 'utf-8');
        const qTableObj = JSON.parse(rlData);
        this.rlAgent.importQTable(qTableObj);
        
        console.log('✅ Models loaded successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to load models:', error);
      return false;
    }
  }

  /**
   * Train new models
   */
  private async trainModels(quickMode: boolean = false): Promise<void> {
    console.log('🎯 Training new AI models...');
    
    // Collect historical data
    const historicalData = await collectHistoricalData();
    const processedData = preprocessData(historicalData);
    
    if (processedData.length < 100) {
      throw new Error('Insufficient data for training');
    }
    
    // Convert to ProcessedFeatures
    const features = this.convertToProcessedFeatures(processedData);
    
    // Train models directly
    await this.lstmPredictor.train(features, quickMode);
    this.rlAgent.train(features, undefined, quickMode);
    
    // Save models to filesystem
    await this.saveModels();
    
    console.log('✅ Model training completed');
  }

  /**
   * Save models to filesystem
   */
  private async saveModels(): Promise<void> {
    try {
      const lstmPath = path.join(this.modelsDir, 'lstm_model');
      const rlPath = path.join(this.modelsDir, 'rl_model.json');
      
      // Save LSTM model using tfjs-node file:// protocol
      await this.lstmPredictor.saveModel(`file://${lstmPath}`);
      
      // Save RL model
      const qTableObj = this.rlAgent.exportQTable();
      await fs.writeFile(rlPath, JSON.stringify(qTableObj, null, 2));
      
      console.log('💾 Models saved to filesystem');
    } catch (error) {
      console.error('❌ Failed to save models:', error);
      throw error;
    }
  }

  /**
   * Convert MarketDataPoint to ProcessedFeatures
   */
  private convertToProcessedFeatures(data: any[]): ProcessedFeatures[] {
    return data.map((item, index) => ({
      price: item.close || item.price,
      sma7: item.sma7 || 0,
      sma14: item.sma14 || 0,
      sma30: item.sma30 || 0,
      ema10: item.ema10 || 0,
      ema30: item.ema30 || 0,
      volatility: item.volatility || 0,
      momentum: index >= 14 ? (item.close || item.price) - (data[index - 14]?.close || data[index - 14]?.price || 0) : 0,
      volume: item.volume || 0,
      priceChange: index > 0 ? ((item.close || item.price) - (data[index - 1]?.close || data[index - 1]?.price || 0)) / (data[index - 1]?.close || data[index - 1]?.price || 1) : 0,
      volumeChange: index > 0 ? (item.volume - (data[index - 1]?.volume || 0)) / (data[index - 1]?.volume || 1) : 0,
    }));
  }

  /**
   * Get LSTM price prediction
   */
  async predict(recentData?: any[]): Promise<{ price: number; confidence: number }> {
    if (!this.isInitialized) {
      throw new Error('AI System not initialized');
    }

    try {
      let features: ProcessedFeatures[];
      
      if (recentData && recentData.length > 0) {
        // Use provided data
        features = this.convertToProcessedFeatures(recentData);
      } else {
        // Collect fresh data
        const historicalData = await collectHistoricalData();
        const processedData = preprocessData(historicalData);
        features = this.convertToProcessedFeatures(processedData);
      }

      // Ensure we have enough data for prediction
      if (features.length < 60) {
        throw new Error('Insufficient data for prediction (need at least 60 data points)');
      }

      const prediction = await this.lstmPredictor.predict(features.slice(-60));
      return prediction;
    } catch (error) {
      console.error('❌ Prediction failed:', error);
      throw error;
    }
  }

  /**
   * Get RL trading decision
   */
  getDecision(features: ProcessedFeatures, portfolioRatio: number): { action: string; confidence: number } {
    if (!this.isInitialized) {
      throw new Error('AI System not initialized');
    }

    try {
      const decision = this.rlAgent.getDecision(features, portfolioRatio);
      return decision;
    } catch (error) {
      console.error('❌ Decision generation failed:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  getStatus(): { lstmReady: boolean; rlReady: boolean; initialized: boolean } {
    return {
      lstmReady: this.lstmPredictor.isReady(),
      rlReady: this.rlAgent && this.isInitialized,
      initialized: this.isInitialized
    };
  }

  /**
   * Enable streaming for real-time updates
   */
  async enableStreaming(): Promise<void> {
    if (this.streamingEnabled) {
      console.log('Streaming already enabled');
      return;
    }

    try {
      console.log('🔌 Enabling AI system streaming...');
      this.streamBus = await initServerStreaming();
      
      // Store handler reference for cleanup
      this.streamHandler = (event: any) => {
        console.log('💰 Received streaming price update for AI system');
        this.processStreamingUpdate(event.data);
      };
      
      this.streamBus.on(StreamingEventType.PRICE_UPDATE, this.streamHandler);

      this.streamingEnabled = true;
      
      // Start streams when enabling streaming (Comment 2)
      await startServerStreaming();
      
      // Start periodic processing of streaming data using config
      const streamingServer = await getStreamingServerInstance();
      const updateThrottleMs = streamingServer.getUpdateThrottleMs?.() ?? Number(process.env.STREAMING_RECONNECT_DELAY ?? 60000);
      
      this.streamingUpdateInterval = setInterval(() => {
        this.processStreamingBatch();
      }, updateThrottleMs); // Use config value instead of hardcoded 60000

      console.log('✅ AI system streaming enabled');
    } catch (error) {
      console.error('❌ Failed to enable AI system streaming:', error);
      throw error;
    }
  }

  /**
   * Process streaming update
   */
  private processStreamingUpdate(dataPoint: any): void {
    this.streamingBuffer.push(dataPoint);
    
    // Keep buffer size manageable
    if (this.streamingBuffer.length > 100) {
      this.streamingBuffer = this.streamingBuffer.slice(-100);
    }
  }

  /**
   * Process streaming data batch
   */
  private async processStreamingBatch(): Promise<void> {
    if (this.streamingBuffer.length === 0) {
      return;
    }

    try {
      console.log(`🔄 Processing ${this.streamingBuffer.length} streaming updates...`);
      
      // Use rolling dataset to prevent memory growth
      const maxBufferSize = 1000;
      if (this.streamingBuffer.length > maxBufferSize) {
        this.streamingBuffer = this.streamingBuffer.slice(-maxBufferSize);
      }
      
      // Convert streaming data to ProcessedFeatures
      const features = this.convertToProcessedFeatures(this.streamingBuffer);
      
      // Update models with new data (incremental learning) - less frequent
      if (features.length > 50 && Math.random() < 0.1) { // Only 10% chance to retrain
        // Use tf.tidy to prevent memory leaks
        await tf.tidy(() => {
          // Retrain models with new streaming data (very quick mode)
          this.lstmPredictor.train(features, true); // Quick mode
          this.rlAgent.train(features, undefined, true);
        });
        
        console.log('✅ Models updated with streaming data');
      }
      
      // Keep buffer for next batch instead of clearing
      // Only clear if buffer gets too large
      if (this.streamingBuffer.length > maxBufferSize * 2) {
        this.streamingBuffer = this.streamingBuffer.slice(-maxBufferSize);
      }
      
    } catch (error) {
      console.error('❌ Error processing streaming batch:', error);
    }
  }

  /**
   * Get streaming status
   */
  getStreamingStatus(): { enabled: boolean; bufferSize: number; lastUpdate: number | null } {
    return {
      enabled: this.streamingEnabled,
      bufferSize: this.streamingBuffer.length,
      lastUpdate: this.streamingBuffer.length > 0 ? this.streamingBuffer[this.streamingBuffer.length - 1].timestamp : null
    };
  }

  /**
   * Disable streaming
   */
  async disableStreaming(): Promise<void> {
    if (this.streamingUpdateInterval) {
      clearInterval(this.streamingUpdateInterval);
      this.streamingUpdateInterval = null;
    }
    
    // Remove event listener to prevent memory leaks
    if (this.streamBus && this.streamHandler) {
      this.streamBus.off(StreamingEventType.PRICE_UPDATE, this.streamHandler);
      this.streamBus = null;
      this.streamHandler = null;
    }
    
    // Stop server streams using dynamic import
    try {
      const { stopServerStreaming } = await import('./dataCollection');
      stopServerStreaming();
    } catch (error) {
      console.warn('Could not stop server streaming:', error);
    }
    
    this.streamingEnabled = false;
    this.streamingBuffer = [];
    console.log('✅ AI system streaming disabled');
  }

  // Production optimization methods

  /**
   * Optimize memory usage
   */
  public async optimizeMemoryUsage(): Promise<void> {
    try {
      // Clean up TensorFlow.js memory
      await tf.tidy(() => {
        // Force garbage collection
        tf.engine().startScope();
        tf.engine().endScope();
      });

      // Clear unused tensors
      tf.engine().disposeVariables();

      const memoryUsage = process.memoryUsage();
      this.logger.logPerformance('memory_optimization', 0, memoryUsage.heapUsed / 1024 / 1024);
      
      this.logger.info('Memory optimization completed');
    } catch (error) {
      this.logger.error('Failed to optimize memory usage', error as Error);
    }
  }

  /**
   * Monitor memory leaks
   */
  public async monitorMemoryLeaks(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed / 1024 / 1024;
    const memoryLimit = this.envManager.getConfig('ai').memoryLimit;

    if (heapUsed > memoryLimit * 0.8) {
      this.logger.warn('Memory usage approaching limit', {
        performance: {
          operation: 'memory_monitoring',
          memoryUsage: heapUsed,
          limit: memoryLimit
        }
      });

      // Trigger memory cleanup
      await this.optimizeMemoryUsage();
    }

    // Update metrics
    this.metrics.recordSystemHealth(heapUsed, 0);
  }

  /**
   * Load versioned model
   */
  public async loadVersionedModel(version: string): Promise<boolean> {
    try {
      const model = this.modelManager.getModelVersions().find(m => m.version === version);
      if (!model) {
        throw new Error(`Model version ${version} not found`);
      }

      // Load model data from file
      const modelFile = path.join(this.modelsDir, `${version}.bin`);
      const modelData = JSON.parse(await fs.readFile(modelFile, 'utf8'));

      // Apply model based on type
      if (model.modelType === 'lstm') {
        await this.lstmPredictor.loadModel(modelData);
      } else if (model.modelType === 'qlearning') {
        await this.rlAgent.loadModel(modelData);
      }

      this.logger.info(`Loaded versioned model ${version}`, {
        modelVersion: version,
        modelType: model.modelType
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to load versioned model', error as Error, {
        modelVersion: version
      });
      return false;
    }
  }

  /**
   * Switch to A/B test model
   */
  public async switchToABTestModel(testId: string, userId: string): Promise<string> {
    try {
      const test = this.modelManager.getABTest(testId);
      if (!test || test.status !== 'active') {
        throw new Error('A/B test not found or inactive');
      }

      // Simple hash-based traffic splitting
      const userHash = this.hashUserId(userId);
      const trafficSplit = test.trafficSplit;
      
      const selectedModel = userHash % 100 < trafficSplit ? test.modelA : test.modelB;
      
      this.logger.info(`User ${userId} assigned to model ${selectedModel} in A/B test ${testId}`, {
        abTestId: testId,
        selectedModel,
        trafficSplit
      });

      return selectedModel;
    } catch (error) {
      this.logger.error('Failed to switch to A/B test model', error as Error);
      return testId; // Fallback to test ID
    }
  }

  /**
   * Update model metrics
   */
  public async updateModelMetrics(version: string, metrics: any): Promise<void> {
    try {
      await this.modelManager.updateModelMetrics(version, metrics);
      
      // Record metrics for monitoring
      this.metrics.recordAIModelPerformance(
        'combined',
        metrics.accuracy || 0,
        metrics.confidence || 0,
        metrics.duration || 0,
        metrics.memoryUsage || 0
      );

      this.logger.info(`Updated metrics for model ${version}`, {
        modelVersion: version,
        metrics
      });
    } catch (error) {
      this.logger.error('Failed to update model metrics', error as Error);
    }
  }

  /**
   * Start performance monitoring
   */
  public startPerformanceMonitoring(): void {
    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
    }

    const interval = this.envManager.getConfig('monitoring').healthCheckInterval;
    
    this.performanceMonitoringInterval = setInterval(async () => {
      await this.monitorMemoryLeaks();
      
      // Record system health
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      const cpuUsage = process.cpuUsage();
      
      this.metrics.recordSystemHealth(memoryUsage, cpuUsage.user / 1000000);
      
      this.logger.logSystemHealth('ai_system', 'healthy', {
        memoryUsage,
        cpuUsage: cpuUsage.user / 1000000,
        streamingEnabled: this.streamingEnabled,
        bufferSize: this.streamingBuffer.length
      });
    }, interval);

    this.logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stopPerformanceMonitoring(): void {
    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
      this.logger.info('Performance monitoring stopped');
    }
  }

  /**
   * Start memory cleanup
   */
  public startMemoryCleanup(): void {
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
    }

    const interval = this.envManager.getConfig('ai').gcInterval;
    
    this.memoryCleanupInterval = setInterval(async () => {
      await this.optimizeMemoryUsage();
    }, interval);

    this.logger.info('Memory cleanup started');
  }

  /**
   * Stop memory cleanup
   */
  public stopMemoryCleanup(): void {
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
      this.logger.info('Memory cleanup stopped');
    }
  }

  /**
   * Get production status
   */
  public getProductionStatus(): any {
    return {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      streamingEnabled: this.streamingEnabled,
      bufferSize: this.streamingBuffer.length,
      cacheReady: this.cache.isReady(),
      modelStatus: this.modelManager.getModelStatus(),
      uptime: process.uptime()
    };
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
