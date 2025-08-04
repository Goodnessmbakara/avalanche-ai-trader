import axios from 'axios';

/**
 * Data Collection Utilities for Pangolin DEX
 * Fetches historical AVAX/USDT trading data from The Graph and Snowtrace APIs
 */

// The Graph API endpoint for Pangolin
const PANGOLIN_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/pangolin-exchange/pangolin-v2';

// Snowtrace API configuration
const SNOWTRACE_API_URL = 'https://api.snowtrace.io/api';
const SNOWTRACE_API_KEY = 'YourSnowtraceAPIKey'; // In production, this would be in environment variables

// Pangolin pair address for AVAX/USDT
const AVAX_USDT_PAIR = '0x8f47416cae600bccf9114c3f1c9b24d7ee41ac0b'; // Example address

/**
 * Interface for raw swap data from The Graph
 */
export interface SwapData {
  id: string;
  timestamp: string;
  amount0In: string;
  amount1Out: string;
  amount0Out: string;
  amount1In: string;
  amountUSD: string;
  pair: {
    token0: {
      symbol: string;
      decimals: string;
    };
    token1: {
      symbol: string;
      decimals: string;
    };
  };
}

/**
 * Interface for processed market data
 */
export interface MarketDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  transactionCount: number;
  liquidity: number;
}

/**
 * GraphQL query for fetching swap data from Pangolin
 */
const SWAPS_QUERY = `
  query GetSwaps($pair: String!, $startTime: Int!, $endTime: Int!, $first: Int!, $skip: Int!) {
    swaps(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: asc
      where: {
        pair: $pair
        timestamp_gte: $startTime
        timestamp_lte: $endTime
      }
    ) {
      id
      timestamp
      amount0In
      amount1Out
      amount0Out
      amount1In
      amountUSD
      pair {
        token0 {
          symbol
          decimals
        }
        token1 {
          symbol
          decimals
        }
      }
    }
  }
`;

/**
 * Fetch swap data from Pangolin subgraph
 */
export const fetchPangolinSwaps = async (
  startTimestamp: number,
  endTimestamp: number,
  batchSize: number = 1000
): Promise<SwapData[]> => {
  const allSwaps: SwapData[] = [];
  let skip = 0;
  let hasMore = true;

  console.log('Fetching swap data from Pangolin...');

  while (hasMore) {
    try {
      const response = await axios.post(PANGOLIN_SUBGRAPH_URL, {
        query: SWAPS_QUERY,
        variables: {
          pair: AVAX_USDT_PAIR,
          startTime: startTimestamp,
          endTime: endTimestamp,
          first: batchSize,
          skip: skip,
        },
      });

      const swaps = response.data.data.swaps;
      allSwaps.push(...swaps);

      if (swaps.length < batchSize) {
        hasMore = false;
      } else {
        skip += batchSize;
      }

      console.log(`Fetched ${allSwaps.length} swaps so far...`);
    } catch (error) {
      console.error('Error fetching swap data:', error);
      hasMore = false;
    }
  }

  return allSwaps;
};

/**
 * Fetch token price data from Snowtrace (for verification)
 */
export const fetchSnowtraceData = async (
  contractAddress: string,
  startTimestamp: number,
  endTimestamp: number
): Promise<any[]> => {
  try {
    const response = await axios.get(SNOWTRACE_API_URL, {
      params: {
        module: 'stats',
        action: 'tokenprice',
        contractaddress: contractAddress,
        startdate: new Date(startTimestamp * 1000).toISOString().split('T')[0],
        enddate: new Date(endTimestamp * 1000).toISOString().split('T')[0],
        apikey: SNOWTRACE_API_KEY,
      },
    });

    return response.data.result || [];
  } catch (error) {
    console.error('Error fetching Snowtrace data:', error);
    return [];
  }
};

/**
 * Calculate OHLC data from swap transactions
 */
export const calculateOHLC = (swaps: SwapData[], intervalMinutes: number = 60): MarketDataPoint[] => {
  const intervals = new Map<number, MarketDataPoint>();

  swaps.forEach(swap => {
    const timestamp = parseInt(swap.timestamp);
    const intervalStart = Math.floor(timestamp / (intervalMinutes * 60)) * (intervalMinutes * 60);
    
    // Calculate price from swap amounts
    const amount0 = parseFloat(swap.amount0In) + parseFloat(swap.amount0Out);
    const amount1 = parseFloat(swap.amount1In) + parseFloat(swap.amount1Out);
    const price = amount0 > 0 ? amount1 / amount0 : 0;
    const volume = parseFloat(swap.amountUSD);

    if (!intervals.has(intervalStart)) {
      intervals.set(intervalStart, {
        timestamp: intervalStart,
        price: price,
        volume: 0,
        high: price,
        low: price,
        open: price,
        close: price,
        transactionCount: 0,
        liquidity: 0,
      });
    }

    const interval = intervals.get(intervalStart)!;
    interval.high = Math.max(interval.high, price);
    interval.low = Math.min(interval.low, price);
    interval.close = price;
    interval.volume += volume;
    interval.transactionCount += 1;
  });

  return Array.from(intervals.values()).sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Fetch liquidity data for AVAX/USDT pair
 */
const LIQUIDITY_QUERY = `
  query GetPairData($pair: String!) {
    pair(id: $pair) {
      reserveUSD
      reserve0
      reserve1
      volumeUSD
      txCount
    }
  }
`;

export const fetchLiquidityData = async (): Promise<any> => {
  try {
    const response = await axios.post(PANGOLIN_SUBGRAPH_URL, {
      query: LIQUIDITY_QUERY,
      variables: {
        pair: AVAX_USDT_PAIR,
      },
    });

    return response.data.data.pair;
  } catch (error) {
    console.error('Error fetching liquidity data:', error);
    return null;
  }
};

/**
 * Get on-chain metrics for feature engineering
 */
export const fetchOnChainMetrics = async (
  startTimestamp: number,
  endTimestamp: number
): Promise<{
  activeAddresses: number[];
  transactionVolume: number[];
  liquidityChanges: number[];
}> => {
  // This would typically involve multiple API calls to gather on-chain data
  // For now, we'll return mock data structure
  
  const dayCount = Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60));
  
  return {
    activeAddresses: Array.from({ length: dayCount }, () => 
      Math.floor(Math.random() * 1000) + 500
    ),
    transactionVolume: Array.from({ length: dayCount }, () => 
      Math.random() * 1000000 + 500000
    ),
    liquidityChanges: Array.from({ length: dayCount }, () => 
      (Math.random() - 0.5) * 0.1
    ),
  };
};

/**
 * Main data collection function
 */
export const collectHistoricalData = async (
  startDate: Date = new Date('2022-01-01'),
  endDate: Date = new Date('2024-12-31')
): Promise<MarketDataPoint[]> => {
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  console.log(`Collecting data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  try {
    // Fetch swap data
    const swaps = await fetchPangolinSwaps(startTimestamp, endTimestamp);
    
    // Calculate OHLC data (1-hour intervals)
    const marketData = calculateOHLC(swaps, 60);
    
    // Fetch additional on-chain metrics
    const onChainMetrics = await fetchOnChainMetrics(startTimestamp, endTimestamp);
    
    // Enhance market data with on-chain metrics
    marketData.forEach((dataPoint, index) => {
      if (index < onChainMetrics.activeAddresses.length) {
        // Add on-chain metrics to market data
        dataPoint.liquidity = onChainMetrics.liquidityChanges[index] || 0;
      }
    });

    console.log(`Collected ${marketData.length} data points`);
    return marketData;

  } catch (error) {
    console.error('Error collecting historical data:', error);
    
    // Return mock data if real data fetching fails
    return generateMockData(startTimestamp, endTimestamp);
  }
};

/**
 * Generate mock historical data for development/testing
 */
export const generateMockData = (
  startTimestamp: number,
  endTimestamp: number
): MarketDataPoint[] => {
  const data: MarketDataPoint[] = [];
  const hourlyInterval = 60 * 60; // 1 hour in seconds
  
  let currentPrice = 40; // Starting AVAX price around $40
  
  for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += hourlyInterval) {
    // Simulate price movement with some randomness
    const volatility = 0.02; // 2% volatility
    const priceChange = (Math.random() - 0.5) * volatility * currentPrice;
    currentPrice = Math.max(1, currentPrice + priceChange);
    
    const volume = Math.random() * 100000 + 50000;
    const high = currentPrice * (1 + Math.random() * 0.01);
    const low = currentPrice * (1 - Math.random() * 0.01);
    
    data.push({
      timestamp,
      price: currentPrice,
      volume,
      high,
      low,
      open: data.length > 0 ? data[data.length - 1].close : currentPrice,
      close: currentPrice,
      transactionCount: Math.floor(Math.random() * 100) + 20,
      liquidity: Math.random() * 1000000 + 5000000,
    });
  }
  
  return data;
};

/**
 * Data preprocessing utilities
 */
export const preprocessData = (rawData: MarketDataPoint[]): MarketDataPoint[] => {
  // Remove outliers using Z-score method
  const removeOutliers = (data: MarketDataPoint[], field: keyof MarketDataPoint): MarketDataPoint[] => {
    const values = data.map(d => d[field] as number);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    
    return data.filter(d => {
      const zScore = Math.abs(((d[field] as number) - mean) / std);
      return zScore < 3; // Keep data within 3 standard deviations
    });
  };

  // Handle missing values with linear interpolation
  const interpolateMissing = (data: MarketDataPoint[]): MarketDataPoint[] => {
    const interpolated = [...data];
    
    for (let i = 1; i < interpolated.length - 1; i++) {
      if (interpolated[i].price === 0 || isNaN(interpolated[i].price)) {
        interpolated[i].price = (interpolated[i - 1].price + interpolated[i + 1].price) / 2;
      }
    }
    
    return interpolated;
  };

  // Apply preprocessing steps
  let processedData = removeOutliers(rawData, 'price');
  processedData = removeOutliers(processedData, 'volume');
  processedData = interpolateMissing(processedData);

  return processedData.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Save data to localStorage (in a real app, this would be a proper database)
 */
export const saveDataToStorage = (data: MarketDataPoint[], key: string = 'avax_usdt_data'): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Saved ${data.length} data points to storage`);
  } catch (error) {
    console.error('Error saving data to storage:', error);
  }
};

/**
 * Load data from localStorage
 */
export const loadDataFromStorage = (key: string = 'avax_usdt_data'): MarketDataPoint[] => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      console.log(`Loaded ${data.length} data points from storage`);
      return data;
    }
  } catch (error) {
    console.error('Error loading data from storage:', error);
  }
  return [];
};

/**
 * Data validation utility
 */
export const validateData = (data: MarketDataPoint[]): boolean => {
  if (!data || data.length === 0) {
    console.error('No data provided');
    return false;
  }

  const requiredFields = ['timestamp', 'price', 'volume', 'high', 'low', 'open', 'close'];
  
  for (const point of data.slice(0, 10)) { // Check first 10 points
    for (const field of requiredFields) {
      if (!(field in point) || isNaN(point[field as keyof MarketDataPoint] as number)) {
        console.error(`Invalid data: missing or invalid ${field}`);
        return false;
      }
    }
  }

  console.log('Data validation passed');
  return true;
};

/**
 * Export data for analysis
 */
export const exportDataAsCSV = (data: MarketDataPoint[]): string => {
  const headers = ['timestamp', 'price', 'volume', 'high', 'low', 'open', 'close', 'transactionCount', 'liquidity'];
  const rows = data.map(point => 
    headers.map(header => point[header as keyof MarketDataPoint]).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
};