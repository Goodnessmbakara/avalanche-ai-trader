/**
 * Mock Raw Data
 * This file contains realistic mock data that would be fetched from:
 * - CoinGecko API (price, market cap, volume data)
 * - Snowtrace (Avalanche blockchain data)
 * - DEX aggregators (Pangolin, TraderJoe)
 * - Social sentiment APIs
 * - Technical analysis data
 */

//  CoinGecko market data
export const mockCoinGeckoData = {
  "avalanche-2": {
    id: "avalanche-2",
    symbol: "avax",
    name: "Avalanche",
    platforms: {
      "avalanche": "0x0000000000000000000000000000000000000000"
    },
    market_data: {
      current_price: {
        usd: 24.88,
        usdt: 24.85,
        btc: 0.00082345
      },
      market_cap: {
        usd: 9200000000,
        usdt: 9185000000,
        btc: 304567.89
      },
      total_volume: {
        usd: 245000000,
        usdt: 244500000,
        btc: 8100.45
      },
      high_24h: {
        usd: 25.67,
        usdt: 25.64,
        btc: 0.00084912
      },
      low_24h: {
        usd: 23.45,
        usdt: 23.42,
        btc: 0.00077523
      },
      price_change_24h: 2.34,
      price_change_percentage_24h: 10.38,
      price_change_percentage_7d: 15.67,
      price_change_percentage_30d: -8.92,
      price_change_percentage_60d: 45.23,
      price_change_percentage_1y: 156.78,
      market_cap_change_24h: 865000000,
      market_cap_change_percentage_24h: 10.38,
      price_change_24h_in_currency: {
        usd: 2.34,
        usdt: 2.31,
        btc: 0.00007654
      },
      price_change_percentage_1h_in_currency: {
        usd: 0.45,
        usdt: 0.44,
        btc: 0.00001489
      },
      price_change_percentage_24h_in_currency: {
        usd: 10.38,
        usdt: 10.25,
        btc: 0.00034567
      },
      price_change_percentage_7d_in_currency: {
        usd: 15.67,
        usdt: 15.45,
        btc: 0.00051890
      },
      price_change_percentage_30d_in_currency: {
        usd: -8.92,
        usdt: -8.95,
        btc: -0.00029543
      },
      price_change_percentage_60d_in_currency: {
        usd: 45.23,
        usdt: 45.01,
        btc: 0.00149678
      },
      price_change_percentage_1y_in_currency: {
        usd: 156.78,
        usdt: 156.45,
        btc: 0.00518901
      }
    },
    community_data: {
      facebook_likes: null,
      twitter_followers: 1250000,
      reddit_average_posts_48h: 45.67,
      reddit_average_comments_48h: 234.56,
      reddit_subscribers: 89000,
      reddit_accounts_active_48h: 1234
    },
    developer_data: {
      forks: 2345,
      stars: 15678,
      subscribers: 8900,
      total_issues: 1234,
      closed_issues: 1189,
      pull_requests_merged: 567,
      pull_request_contributors: 234,
      code_additions_deletions_4_weeks: {
        additions: 12345,
        deletions: 5678
      },
      commit_count_4_weeks: 234
    },
    public_interest_score: 0.234,
    public_interest_score_rank: 15,
    status_updates: [],
    last_updated: "2024-01-15T10:30:00.000Z"
  }
};

// Mock Snowtrace blockchain data
export const mockSnowtraceData = {
  address: "0x0000000000000000000000000000000000000000",
  balance: "1234567890000000000000000",
  balance_usd: 30700.45,
  tx_count: 12345,
  contract_creator: "0x1234567890123456789012345678901234567890",
  contract_creator_tx_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  token_transfers: [
    {
      tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      block_number: 12345678,
      timestamp: 1705312200,
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      value: "1000000000000000000000",
      value_usd: 24.88,
      token_symbol: "AVAX",
      token_name: "Avalanche"
    },
    {
      tx_hash: "0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1",
      block_number: 12345679,
      timestamp: 1705312260,
      from: "0x2222222222222222222222222222222222222222",
      to: "0x3333333333333333333333333333333333333333",
      value: "500000000000000000000",
      value_usd: 12.44,
      token_symbol: "AVAX",
      token_name: "Avalanche"
    }
  ],
  internal_transactions: [
    {
      tx_hash: "0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12",
      block_number: 12345680,
      timestamp: 1705312320,
      from: "0x4444444444444444444444444444444444444444",
      to: "0x5555555555555555555555555555555555555555",
      value: "1000000000000000000",
      value_usd: 0.02488,
      type: "call"
    }
  ],
  gas_used: {
    total: 123456789,
    average: 21000,
    max: 500000,
    min: 21000
  },
  gas_price: {
    current: "25000000000",
    average: "30000000000",
    max: "50000000000",
    min: "20000000000"
  }
};

// Mock DEX swap data (Pangolin/TraderJoe)
export const mockDEXSwapData = [
  {
    id: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0",
    timestamp: "1705312200",
    amount0In: "0",
    amount1Out: "1000000000000000000000",
    amount0Out: "1000000000000000000000",
    amount1In: "0",
    amountUSD: "24880.00",
    pair: {
      id: "0xabcdef1234567890abcdef1234567890abcdef12",
      token0: {
        id: "0x0000000000000000000000000000000000000000",
        symbol: "AVAX",
        decimals: "18",
        totalSupply: "720000000000000000000000000"
      },
      token1: {
        id: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
        symbol: "USDT",
        decimals: "6",
        totalSupply: "1000000000000"
      },
      reserve0: "5000000000000000000000000",
      reserve1: "124400000000",
      totalSupply: "1000000000000000000000",
      reserveUSD: "124400000000"
    },
    sender: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222222",
    logIndex: 0,
    transaction: {
      id: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      blockNumber: "12345678",
      timestamp: "1705312200",
      gasUsed: "210000",
      gasPrice: "25000000000"
    }
  },
  {
    id: "0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1-0",
    timestamp: "1705312260",
    amount0In: "1000000000000000000000",
    amount1Out: "0",
    amount0Out: "0",
    amount1In: "24880000000",
    amountUSD: "24880.00",
    pair: {
      id: "0xabcdef1234567890abcdef1234567890abcdef12",
      token0: {
        id: "0x0000000000000000000000000000000000000000",
        symbol: "AVAX",
        decimals: "18",
        totalSupply: "720000000000000000000000000"
      },
      token1: {
        id: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
        symbol: "USDT",
        decimals: "6",
        totalSupply: "1000000000000"
      },
      reserve0: "5000000000000000000000000",
      reserve1: "124400000000",
      totalSupply: "1000000000000000000000",
      reserveUSD: "124400000000"
    },
    sender: "0x2222222222222222222222222222222222222222",
    to: "0x3333333333333333333333333333333333333333",
    logIndex: 0,
    transaction: {
      id: "0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1",
      blockNumber: "12345679",
      timestamp: "1705312260",
      gasUsed: "210000",
      gasPrice: "30000000000"
    }
  }
];

// Mock social sentiment data
export const mockSocialSentimentData = {
  twitter: {
    mentions: 1234,
    sentiment_score: 0.67,
    positive_mentions: 823,
    negative_mentions: 156,
    neutral_mentions: 255,
    trending_topics: [
      "Avalanche",
      "AVAX",
      "DeFi",
      "NFTs",
      "Gaming"
    ],
    influential_tweets: [
      {
        id: "1234567890123456789",
        text: "Avalanche is showing strong momentum! The ecosystem is growing rapidly. #AVAX #DeFi",
        sentiment: "positive",
        score: 0.89,
        author_followers: 45678,
        retweets: 234,
        likes: 1234
      },
      {
        id: "1234567890123456790",
        text: "Concerned about the recent volatility in AVAX. Need to see more stability. #Crypto",
        sentiment: "negative",
        score: -0.34,
        author_followers: 23456,
        retweets: 89,
        likes: 456
      }
    ]
  },
  reddit: {
    mentions: 567,
    sentiment_score: 0.72,
    positive_mentions: 408,
    negative_mentions: 89,
    neutral_mentions: 70,
    top_posts: [
      {
        id: "abc123",
        title: "Avalanche ecosystem analysis - Why I'm bullish on AVAX",
        sentiment: "positive",
        score: 0.91,
        upvotes: 1234,
        comments: 234,
        subreddit: "CryptoCurrency"
      },
      {
        id: "def456",
        title: "AVAX price discussion - Technical analysis",
        sentiment: "neutral",
        score: 0.12,
        upvotes: 567,
        comments: 123,
        subreddit: "Avalanche"
      }
    ]
  },
  telegram: {
    mentions: 890,
    sentiment_score: 0.58,
    positive_mentions: 534,
    negative_mentions: 178,
    neutral_mentions: 178,
    active_channels: [
      "AvalancheOfficial",
      "AVAXTraders",
      "DeFiNews"
    ]
  },
  discord: {
    mentions: 345,
    sentiment_score: 0.81,
    positive_mentions: 276,
    negative_mentions: 34,
    neutral_mentions: 35,
    active_servers: [
      "Avalanche Community",
      "DeFi Traders",
      "Crypto Analysis"
    ]
  }
};

// Mock technical analysis data
export const mockTechnicalAnalysisData = {
  symbol: "AVAX",
  timeframe: "1h",
  timestamp: 1705312200,
  indicators: {
    rsi: {
      value: 65.4,
      signal: "neutral",
      overbought: false,
      oversold: false
    },
    macd: {
      macd: 0.234,
      signal: 0.156,
      histogram: 0.078,
      signal_type: "bullish",
      crossover: "bullish"
    },
    bollinger_bands: {
      upper: 25.67,
      middle: 24.88,
      lower: 24.09,
      bandwidth: 0.063,
      percent_b: 0.78,
      squeeze: false
    },
    moving_averages: {
      sma_20: 24.45,
      sma_50: 23.89,
      sma_200: 22.34,
      ema_12: 24.67,
      ema_26: 24.23,
      golden_cross: false,
      death_cross: false,
      trend: "bullish"
    },
    stochastic: {
      k: 72.3,
      d: 68.9,
      signal: "neutral",
      overbought: false,
      oversold: false
    },
    williams_r: {
      value: -28.9,
      signal: "neutral",
      overbought: false,
      oversold: false
    },
    cci: {
      value: 45.6,
      signal: "neutral",
      overbought: false,
      oversold: false
    },
    adx: {
      value: 28.7,
      trend_strength: "moderate",
      direction: "bullish"
    },
    obv: {
      value: 1234567890123456789,
      trend: "bullish",
      divergence: "none"
    },
    vwap: {
      value: 24.76,
      position: "above"
    },
    atr: {
      value: 0.89,
      volatility: "medium"
    }
  },
  support_resistance: {
    support_levels: [24.50, 24.00, 23.50, 23.00],
    resistance_levels: [25.00, 25.50, 26.00, 26.50],
    pivot_point: 24.88,
    fibonacci_levels: {
      "0.236": 25.67,
      "0.382": 25.23,
      "0.500": 24.88,
      "0.618": 24.53,
      "0.786": 24.09
    }
  },
  patterns: [
    {
      type: "bullish_flag",
      confidence: 0.78,
      target: 26.50,
      stop_loss: 24.00
    },
    {
      type: "ascending_triangle",
      confidence: 0.65,
      target: 27.00,
      stop_loss: 23.50
    }
  ]
};

// Mock order book data
export const mockOrderBookData = {
  symbol: "AVAX/USDT",
  timestamp: 1705312200,
  bids: [
    ["24.87", "1234.56"],
    ["24.86", "2345.67"],
    ["24.85", "3456.78"],
    ["24.84", "4567.89"],
    ["24.83", "5678.90"],
    ["24.82", "6789.01"],
    ["24.81", "7890.12"],
    ["24.80", "8901.23"],
    ["24.79", "9012.34"],
    ["24.78", "10123.45"]
  ],
  asks: [
    ["24.89", "987.65"],
    ["24.90", "1876.54"],
    ["24.91", "2765.43"],
    ["24.92", "3654.32"],
    ["24.93", "4543.21"],
    ["24.94", "5432.10"],
    ["24.95", "6321.09"],
    ["24.96", "7210.98"],
    ["24.97", "8109.87"],
    ["24.98", "9008.76"]
  ],
  spread: 0.02,
  spread_percentage: 0.08,
  total_bid_volume: 45678.90,
  total_ask_volume: 43210.98,
  last_update_id: 123456789
};

// Mock gas price data
export const mockGasPriceData = {
  timestamp: 1705312200,
  gas_price: "25000000000",
  gas_limit: "210000",
  max_fee_per_gas: "30000000000",
  max_priority_fee_per_gas: "2000000000",
  base_fee: "23000000000",
  priority_fee: "2000000000",
  estimated_cost: "5250000000000000",
  network: "avalanche",
  block_number: 12345678,
  historical: [
    {
      timestamp: 1705311900,
      gas_price: "24000000000",
      base_fee: "22000000000"
    },
    {
      timestamp: 1705311600,
      gas_price: "26000000000",
      base_fee: "24000000000"
    },
    {
      timestamp: 1705311300,
      gas_price: "28000000000",
      base_fee: "26000000000"
    }
  ]
};

// Mock liquidity pool data
export const mockLiquidityPoolData = [
  {
    pair_address: "0xabcdef1234567890abcdef1234567890abcdef12",
    token0: "0x0000000000000000000000000000000000000000",
    token1: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    reserve0: "5000000000000000000000000",
    reserve1: "124400000000",
    total_supply: "1000000000000000000000",
    reserve_usd: "124400000000",
    volume_usd: "245000000",
    fee: "0.003",
    timestamp: 1705312200,
    block_number: 12345678
  },
  {
    pair_address: "0xbcdef1234567890abcdef1234567890abcdef123",
    token0: "0x0000000000000000000000000000000000000000",
    token1: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    reserve0: "3000000000000000000000000",
    reserve1: "75000000000",
    total_supply: "600000000000000000000000",
    reserve_usd: "75000000000",
    volume_usd: "123000000",
    fee: "0.003",
    timestamp: 1705312200,
    block_number: 12345678
  }
];

// Mock news sentiment data
export const mockNewsSentimentData = {
  timestamp: 1705312200,
  articles: [
    {
      id: "news_001",
      title: "Avalanche Foundation Announces New DeFi Partnership",
      summary: "The Avalanche Foundation has announced a strategic partnership with a major DeFi protocol, expected to boost ecosystem growth.",
      sentiment: "positive",
      score: 0.85,
      source: "CoinDesk",
      url: "https://www.coindesk.com/avalanche-defi-partnership",
      published_at: "2024-01-15T09:00:00Z",
      relevance_score: 0.92
    },
    {
      id: "news_002",
      title: "AVAX Price Surges 15% Following Network Upgrade",
      summary: "Avalanche's native token AVAX has seen a significant price increase following the successful implementation of network improvements.",
      sentiment: "positive",
      score: 0.78,
      source: "CryptoNews",
      url: "https://cryptonews.com/avax-price-surge",
      published_at: "2024-01-15T08:30:00Z",
      relevance_score: 0.89
    },
    {
      id: "news_003",
      title: "Regulatory Concerns Impact Crypto Markets",
      summary: "Recent regulatory announcements have caused uncertainty in the broader cryptocurrency market, affecting multiple tokens including AVAX.",
      sentiment: "negative",
      score: -0.45,
      source: "Bloomberg",
      url: "https://www.bloomberg.com/crypto-regulation",
      published_at: "2024-01-15T07:15:00Z",
      relevance_score: 0.76
    }
  ],
  overall_sentiment: {
    positive: 0.67,
    negative: 0.15,
    neutral: 0.18,
    score: 0.52
  },
  trending_topics: [
    "Avalanche Foundation",
    "DeFi Partnership",
    "Network Upgrade",
    "Regulatory Concerns",
    "Market Volatility"
  ]
};

// Mock on-chain metrics data
export const mockOnChainMetricsData = {
  timestamp: 1705312200,
  network_stats: {
    total_transactions: 123456789,
    daily_transactions: 234567,
    active_addresses: 45678,
    new_addresses: 1234,
    total_value_locked: "5678900000000000000000000",
    total_value_locked_usd: 141234.56
  },
  defi_metrics: {
    total_protocols: 234,
    total_users: 123456,
    total_volume_24h: "1234567890000000000000000",
    total_volume_24h_usd: 30700.45,
    total_fees_24h: "12345678900000000000000",
    total_fees_24h_usd: 307.00
  },
  staking_metrics: {
    total_staked: "432100000000000000000000000",
    total_staked_usd: 10750000.00,
    staking_ratio: 0.60,
    average_apy: 0.089,
    validators: 1234,
    delegators: 56789
  },
  governance: {
    total_proposals: 45,
    active_proposals: 3,
    total_votes: 123456,
    participation_rate: 0.78
  }
};

// Export all mock raw data
export const mockRawData = {
  coinGecko: mockCoinGeckoData,
  snowtrace: mockSnowtraceData,
  dexSwaps: mockDEXSwapData,
  socialSentiment: mockSocialSentimentData,
  technicalAnalysis: mockTechnicalAnalysisData,
  orderBook: mockOrderBookData,
  gasPrice: mockGasPriceData,
  liquidityPools: mockLiquidityPoolData,
  newsSentiment: mockNewsSentimentData,
  onChainMetrics: mockOnChainMetricsData
};

// Utility function to generate timestamp-based mock data
export const generateTimeSeriesMockData = (symbol: string, days: number = 30) => {
  const data = [];
  const basePrice = 24.88;
  const baseVolume = 245000000;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = Date.now() - (i * 24 * 60 * 60 * 1000);
    const randomChange = (Math.random() - 0.5) * 0.1; // ±5% daily change
    const price = basePrice * (1 + randomChange);
    const volume = baseVolume * (0.8 + Math.random() * 0.4); // ±20% volume variation
    
    data.push({
      timestamp,
      symbol,
      price,
      volume,
      high: price * (1 + Math.random() * 0.05),
      low: price * (1 - Math.random() * 0.05),
      open: price * (1 + (Math.random() - 0.5) * 0.02),
      close: price,
      market_cap: price * 369000000, // Approximate circulating supply
      price_change_24h: randomChange * 100,
      volume_change_24h: (Math.random() - 0.5) * 40
    });
  }
  
  return data;
};

// Export time series data
export const mockTimeSeriesData = {
  AVAX: generateTimeSeriesMockData("AVAX", 30),
  USDT: generateTimeSeriesMockData("USDT", 30),
  BTC: generateTimeSeriesMockData("BTC", 30)
};
