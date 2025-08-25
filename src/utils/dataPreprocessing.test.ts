/**
 * Tests for Data Preprocessing Module
 * Verifies that all decoupled preprocessing functions work correctly
 */

import {
  calculateSMA,
  calculateEMA,
  calculateVolatility,
  calculateVolatilityPercentage,
  calculateRSI,
  calculateBollingerBands,
  removeOutliers,
  interpolateMissing,
  validateMarketData,
  processMarketData,
  createTechnicalFeatures,
  normalizeMinMax,
  normalizeZScore,
  createScaler,
  preprocessData,
  prepareDataForTraining,
  generateMockData,
  calculateDataQuality
} from './dataPreprocessing';

// Mock data for testing
const mockPrices = [10, 12, 11, 13, 15, 14, 16, 18, 17, 19, 20, 22, 21, 23, 25];
const mockMarketData = [
  { timestamp: 1000, price: 10, volume: 1000, high: 11, low: 9, open: 10, close: 10 },
  { timestamp: 2000, price: 12, volume: 1200, high: 13, low: 11, open: 12, close: 12 },
  { timestamp: 3000, price: 11, volume: 1100, high: 12, low: 10, open: 11, close: 11 },
  { timestamp: 4000, price: 13, volume: 1300, high: 14, low: 12, open: 13, close: 13 },
  { timestamp: 5000, price: 15, volume: 1500, high: 16, low: 14, open: 15, close: 15 },
];

describe('Data Preprocessing Module', () => {
  describe('Technical Indicators', () => {
    test('calculateSMA should calculate simple moving average correctly', () => {
      const sma3 = calculateSMA(mockPrices, 3);
      expect(sma3).toHaveLength(mockPrices.length);
      expect(sma3[0]).toBe(0); // First two values should be 0
      expect(sma3[1]).toBe(0);
      expect(sma3[2]).toBeCloseTo(11, 2); // (10+12+11)/3
      expect(sma3[3]).toBeCloseTo(12, 2); // (12+11+13)/3
    });

    test('calculateEMA should calculate exponential moving average correctly', () => {
      const ema3 = calculateEMA(mockPrices, 3);
      expect(ema3).toHaveLength(mockPrices.length);
      expect(ema3[0]).toBe(mockPrices[0]); // First value should be the first price
      expect(ema3[1]).toBeGreaterThan(0);
    });

    test('calculateVolatility should calculate volatility correctly', () => {
      const volatility = calculateVolatility(mockPrices, 5);
      expect(volatility).toHaveLength(mockPrices.length);
      expect(volatility[0]).toBe(0); // First 4 values should be 0
      expect(volatility[4]).toBeGreaterThan(0); // Should have volatility value
    });

    test('calculateVolatilityPercentage should return percentage value', () => {
      const volatility = calculateVolatilityPercentage(mockPrices);
      expect(volatility).toBeGreaterThan(0);
      expect(typeof volatility).toBe('number');
    });

    test('calculateRSI should calculate RSI correctly', () => {
      const rsi = calculateRSI(mockPrices, 5);
      expect(rsi).toHaveLength(mockPrices.length);
      expect(rsi[0]).toBe(50); // Neutral RSI for insufficient data
      expect(rsi[4]).toBeGreaterThan(0);
      expect(rsi[4]).toBeLessThanOrEqual(100);
    });

    test('calculateBollingerBands should calculate bands correctly', () => {
      const bands = calculateBollingerBands(mockPrices, 5, 2);
      expect(bands.upper).toHaveLength(mockPrices.length);
      expect(bands.middle).toHaveLength(mockPrices.length);
      expect(bands.lower).toHaveLength(mockPrices.length);
      expect(bands.upper[4]).toBeGreaterThan(bands.middle[4]);
      expect(bands.middle[4]).toBeGreaterThan(bands.lower[4]);
    });
  });

  describe('Data Cleaning and Validation', () => {
    test('removeOutliers should remove outliers correctly', () => {
      const dataWithOutliers = [
        { price: 10, volume: 1000 },
        { price: 12, volume: 1200 },
        { price: 1000, volume: 1100 }, // Outlier
        { price: 13, volume: 1300 },
        { price: 15, volume: 1500 },
      ];
      
      const cleaned = removeOutliers(dataWithOutliers, 'price');
      expect(cleaned).toHaveLength(4); // Should remove the outlier
      expect(cleaned.find(d => d.price === 1000)).toBeUndefined();
    });

    test('interpolateMissing should interpolate missing values', () => {
      const dataWithMissing = [
        { timestamp: 1000, price: 10, volume: 1000, high: 11, low: 9, open: 10, close: 10 },
        { timestamp: 2000, price: 0, volume: 1200, high: 13, low: 11, open: 12, close: 12 }, // Missing price
        { timestamp: 3000, price: 11, volume: 1100, high: 12, low: 10, open: 11, close: 11 },
      ];
      
      const interpolated = interpolateMissing(dataWithMissing);
      expect(interpolated[1].price).toBe(10.5); // Should be interpolated to (10+11)/2
    });

    test('validateMarketData should validate data structure', () => {
      const validData = [
        { timestamp: 1000, price: 10, volume: 1000, high: 11, low: 9, open: 10, close: 10 },
        { timestamp: 2000, price: 12, volume: 1200, high: 13, low: 11, open: 12, close: 12 },
      ];
      
      const validation = validateMarketData(validData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('validateMarketData should detect invalid data', () => {
      const invalidData = [
        { timestamp: 1000, price: NaN, volume: 1000, high: 11, low: 9, open: 10, close: 10 },
        { timestamp: 2000, price: 12, volume: 1200, high: 13, low: 11, open: 12, close: 12 },
      ];
      
      const validation = validateMarketData(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Feature Engineering', () => {
    test('processMarketData should create features correctly', () => {
      const features = processMarketData(mockMarketData);
      expect(features).toHaveLength(mockMarketData.length);
      expect(features[0]).toHaveProperty('price');
      expect(features[0]).toHaveProperty('sma7');
      expect(features[0]).toHaveProperty('ema10');
      expect(features[0]).toHaveProperty('volatility');
      expect(features[0]).toHaveProperty('rsi');
    });

    test('createTechnicalFeatures should create additional features', () => {
      const features = createTechnicalFeatures(mockMarketData);
      expect(features).toHaveProperty('bollingerBands');
      expect(features).toHaveProperty('rsi');
      expect(features).toHaveProperty('macd');
      expect(features.bollingerBands).toHaveProperty('upper');
      expect(features.bollingerBands).toHaveProperty('middle');
      expect(features.bollingerBands).toHaveProperty('lower');
    });
  });

  describe('Data Normalization', () => {
    test('normalizeMinMax should normalize data to 0-1 range', () => {
      const normalized = normalizeMinMax(mockPrices);
      expect(normalized).toHaveLength(mockPrices.length);
      expect(Math.min(...normalized)).toBe(0);
      expect(Math.max(...normalized)).toBe(1);
    });

    test('normalizeZScore should standardize data', () => {
      const standardized = normalizeZScore(mockPrices);
      expect(standardized).toHaveLength(mockPrices.length);
      // Mean should be close to 0
      const mean = standardized.reduce((a, b) => a + b, 0) / standardized.length;
      expect(Math.abs(mean)).toBeLessThan(0.1);
    });

    test('createScaler should create reusable scaler', () => {
      const scaler = createScaler(mockPrices);
      expect(scaler).toHaveProperty('mean');
      expect(scaler).toHaveProperty('std');
      expect(scaler).toHaveProperty('transform');
      expect(scaler).toHaveProperty('inverseTransform');
      
      const transformed = scaler.transform([15]);
      const inverseTransformed = scaler.inverseTransform(transformed);
      expect(inverseTransformed[0]).toBeCloseTo(15, 2);
    });
  });

  describe('Main Preprocessing Pipeline', () => {
    test('preprocessData should process data through complete pipeline', () => {
      const rawData = [
        { timestamp: 1000, price: 10, volume: 1000, high: 11, low: 9, open: 10, close: 10 },
        { timestamp: 2000, price: 12, volume: 1200, high: 13, low: 11, open: 12, close: 12 },
        { timestamp: 3000, price: 11, volume: 1100, high: 12, low: 10, open: 11, close: 11 },
      ];
      
      const processed = preprocessData(rawData);
      expect(processed).toHaveLength(3);
      expect(processed[0].timestamp).toBeLessThan(processed[1].timestamp);
      expect(processed[1].timestamp).toBeLessThan(processed[2].timestamp);
    });

    test('prepareDataForTraining should prepare data for ML models', () => {
      const features = prepareDataForTraining(mockMarketData);
      expect(features).toHaveLength(mockMarketData.length);
      expect(features[0]).toHaveProperty('price');
      expect(features[0]).toHaveProperty('sma7');
      expect(features[0]).toHaveProperty('ema10');
    });
  });

  describe('Utility Functions', () => {
    test('generateMockData should generate mock data', () => {
      const mockData = generateMockData(1000, 5000, 1000);
      expect(mockData).toHaveLength(5); // (5000-1000)/1000 + 1
      expect(mockData[0].timestamp).toBe(1000);
      expect(mockData[4].timestamp).toBe(5000);
      expect(mockData[0].price).toBeGreaterThan(0);
    });

    test('calculateDataQuality should calculate quality metrics', () => {
      const quality = calculateDataQuality(mockMarketData);
      expect(quality).toHaveProperty('totalPoints');
      expect(quality).toHaveProperty('missingValues');
      expect(quality).toHaveProperty('outliers');
      expect(quality).toHaveProperty('timeGaps');
      expect(quality).toHaveProperty('qualityScore');
      expect(quality.totalPoints).toBe(5);
      expect(quality.qualityScore).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty arrays', () => {
      expect(calculateSMA([], 5)).toHaveLength(0);
      expect(calculateEMA([], 5)).toHaveLength(0);
      expect(calculateVolatility([], 5)).toHaveLength(0);
      expect(calculateVolatilityPercentage([])).toBe(0);
      expect(processMarketData([])).toHaveLength(0);
      expect(preprocessData([])).toHaveLength(0);
    });

    test('should handle single element arrays', () => {
      expect(calculateSMA([10], 5)).toEqual([0]);
      expect(calculateEMA([10], 5)).toEqual([10]);
      expect(calculateVolatility([10], 5)).toEqual([0]);
      expect(calculateVolatilityPercentage([10])).toBe(0);
    });

    test('should handle arrays with all same values', () => {
      const sameValues = [10, 10, 10, 10, 10];
      expect(calculateVolatilityPercentage(sameValues)).toBe(0);
      const normalized = normalizeMinMax(sameValues);
      expect(normalized.every(v => v === 0.5)).toBe(true);
    });
  });
});
