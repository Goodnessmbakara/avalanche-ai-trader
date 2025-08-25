/**
 * Data Collection Module - Main Index
 * Centralized exports for all data collection functionality
 */

// Export types
export * from './types';

// Export API client functionality
export { 
  makeAPIRequest, 
  validateMarketData, 
  detectOutliers,
  PANGOLIN_SUBGRAPH_URL, 
  COINGECKO_API_URL, 
  SNOWTRACE_API_URL, 
  SNOWTRACE_API_KEY 
} from './apiClient';

// Export technical indicators
export { 
  interpolateMissingData, 
  addTechnicalIndicators 
} from './technicalIndicators';

// Export main data collection functions
export { 
  fetchPangolinSwaps, 
  fetchCoinGeckoData, 
  fetchSnowtraceData, 
  preprocessData,
  collectMarketData 
} from './dataCollection';

// Legacy exports for backward compatibility
export const collectHistoricalData = async (...args: any[]) => {
  const { collectMarketData } = await import('./dataCollection');
  return collectMarketData(...args);
};
export const getStreamingServerInstance = () => null; // Placeholder
