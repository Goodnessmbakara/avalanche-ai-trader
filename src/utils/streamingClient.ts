import ReconnectingWebSocket from 'reconnecting-websocket';
import EventEmitter from 'eventemitter3';
import { createClient } from 'graphql-ws';
import { 
  StreamingEvent, 
  StreamingEventType, 
  PriceStreamData, 
  SubgraphStreamData,
  PriceUpdateEvent,
  SwapEvent,
  ConnectionStatusEvent,
  ErrorEvent,
  StreamingStatus,
  StreamingConfig,
  ValidationResult
} from './streamingTypes';
import type { MarketDataPoint } from '../shared/types';

/**
 * Client-side streaming manager for real-time market data
 */
export class StreamingClient {
  private priceWebSocket: ReconnectingWebSocket | null = null;
  private subgraphClient: ReturnType<typeof createClient> | null = null;
  private subgraphSubscription: any = null;
  private eventEmitter: EventEmitter;
  private config: StreamingConfig;
  private status: StreamingStatus;
  private lastPriceUpdate: MarketDataPoint | null = null;
  private priceErrorCount: number = 0;
  private subgraphErrorCount: number = 0;
  private readonly ERROR_THRESHOLD = 5;
  private fallbackPollingInterval: ReturnType<typeof setInterval> | null = null;
  private subgraphPollingInterval: ReturnType<typeof setInterval> | null = null;
  private isInFallbackMode: boolean = false;
  private lastSubgraphPoll: number = 0;

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      enablePriceStream: true,
      enableSubgraphStream: true,
      reconnectDelay: parseInt(import.meta.env.VITE_STREAMING_RECONNECT_DELAY || '5000'),
      maxReconnectAttempts: 10,
      dataBufferSize: parseInt(import.meta.env.VITE_STREAMING_DATA_BUFFER_SIZE || '1000'),
      updateThrottleMs: 30000,
      ...config
    };

    this.eventEmitter = new EventEmitter();
    this.status = {
      isConnected: false,
      priceStreamActive: false,
      subgraphStreamActive: false,
      lastPriceUpdate: null,
      lastSwapUpdate: null,
      connectionErrors: [],
      reconnectAttempts: 0,
      priceErrorCount: 0,
      subgraphErrorCount: 0,
      isInFallbackMode: false
    };
  }

  getStreamBus(): EventEmitter {
    return this.eventEmitter;
  }

  getStatus(): StreamingStatus {
    return { ...this.status };
  }

  isStreamingActive(): boolean {
    return this.status.isConnected;
  }

  getLastPriceUpdate(): MarketDataPoint | null {
    return this.lastPriceUpdate;
  }

  async connectPriceStream(): Promise<void> {
    if (!this.config.enablePriceStream || this.priceWebSocket) {
      return;
    }

    const wsUrl = import.meta.env.VITE_BINANCE_WS_URL || 'wss://stream.binance.com:9443/ws/avaxusdt@trade';
    console.log('🔌 Connecting to Binance price stream:', wsUrl);

    try {
      this.priceWebSocket = new ReconnectingWebSocket(wsUrl, [], {
        maxRetries: this.config.maxReconnectAttempts,
        reconnectionDelayGrowFactor: 1.3,
        maxReconnectionDelay: 30000,
        minReconnectionDelay: 1000,
      });

      this.priceWebSocket.onopen = () => {
        console.log('✅ Binance price stream connected');
        this.status.priceStreamActive = true;
        this.priceErrorCount = 0; // Reset error count on successful connection
        this.status.priceErrorCount = 0;
        this.updateOverallStatus();
        this.emitConnectionStatus('price', 'connected');
        
        // Exit fallback mode when stream reconnects
        if (this.isInFallbackMode) {
          this.stopFallbackPolling();
        }
      };

              this.priceWebSocket.onmessage = (event) => {
          try {
            const data: PriceStreamData = JSON.parse(event.data);
            this.handlePriceUpdate(data);
            
            // Reset error count on successful message processing
            this.priceErrorCount = 0;
            this.status.priceErrorCount = 0;
            
            // Exit fallback mode when stream is healthy
            if (this.isInFallbackMode) {
              this.stopFallbackPolling();
            }
          } catch (error) {
            console.error('Error parsing price stream data:', error);
            this.emitError('Failed to parse price stream data', error);
          }
        };

      this.priceWebSocket.onclose = () => {
        console.log('❌ Binance price stream disconnected');
        this.status.priceStreamActive = false;
        this.updateOverallStatus();
        this.emitConnectionStatus('price', 'disconnected');
      };

      this.priceWebSocket.onerror = (error) => {
        console.error('❌ Binance price stream error:', error);
        this.priceErrorCount++;
        this.status.priceErrorCount = this.priceErrorCount;
        this.status.connectionErrors.push(`Price stream: ${error}`);
        // Cap connectionErrors to last 50 entries
        if (this.status.connectionErrors.length > 50) {
          this.status.connectionErrors = this.status.connectionErrors.slice(-50);
        }
        this.emitConnectionStatus('price', 'error', error.toString());
        
        // Check if we should start fallback polling
        if (this.priceErrorCount >= this.ERROR_THRESHOLD) {
          this.emitConnectionStatus('price', 'disconnected');
          this.startFallbackPolling();
        }
      };

    } catch (error) {
      console.error('❌ Failed to connect to Binance price stream:', error);
      this.emitError('Failed to connect to price stream', error);
    }
  }

  async connectSubgraphStream(): Promise<void> {
    if (!this.config.enableSubgraphStream || this.subgraphClient) {
      return;
    }

    const wsUrl = import.meta.env.VITE_PANGOLIN_SUBGRAPH_WS || 'wss://api.thegraph.com/subgraphs/name/pangolin-exchange/pangolin-v2';
    console.log('🔌 Connecting to Pangolin subgraph stream:', wsUrl);

    try {
      this.subgraphClient = createClient({ url: wsUrl });

      // Subscribe to swap events using GraphQL subscription with pair filtering
      const pairId = import.meta.env.VITE_PANGOLIN_PAIR_ID || '0x8f47416cae600bccf9114c3f1c9b24d7ee41ac0b'; // AVAX/USDT pair
      this.subgraphSubscription = this.subgraphClient.subscribe(
        {
          query: `subscription($pair: String!) {
            swaps(first: 1, orderBy: timestamp, orderDirection: desc, where: { pair: $pair }) {
              id
              timestamp
              amountUSD
              pair {
                token0 { symbol decimals }
                token1 { symbol decimals }
              }
            }
          }`,
          variables: { pair: pairId }
        },
        {
          next: (msg) => {
            if (msg.data?.swaps?.[0]) {
              this.handleSubgraphUpdate({ type: 'data', data: { swaps: [msg.data.swaps[0]] } });
            }
          },
          error: (error) => {
            console.error('❌ Pangolin subgraph stream error:', error);
            this.subgraphErrorCount++;
            this.status.subgraphErrorCount = this.subgraphErrorCount;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.status.connectionErrors.push(`Subgraph stream: ${errorMessage}`);
            // Cap connectionErrors to last 50 entries
            if (this.status.connectionErrors.length > 50) {
              this.status.connectionErrors = this.status.connectionErrors.slice(-50);
            }
            this.emitConnectionStatus('subgraph', 'error', errorMessage);
            
            // Check if we should emit offline status and start fallback polling
            if (this.subgraphErrorCount >= this.ERROR_THRESHOLD) {
              this.emitConnectionStatus('subgraph', 'disconnected');
              this.startSubgraphPolling(); // Use subgraph-specific polling
            }
          },
          complete: () => {
            console.log('❌ Pangolin subgraph stream disconnected');
            this.status.subgraphStreamActive = false;
            this.updateOverallStatus();
            this.emitConnectionStatus('subgraph', 'disconnected');
          }
        }
      );

      this.status.subgraphStreamActive = true;
      this.subgraphErrorCount = 0; // Reset error count on successful connection
      this.status.subgraphErrorCount = 0;
      this.updateOverallStatus();
      this.emitConnectionStatus('subgraph', 'connected');
      
      // Exit fallback mode when stream reconnects
      if (this.isInFallbackMode) {
        this.stopFallbackPolling();
      }
      
      console.log('✅ Pangolin subgraph stream connected');

    } catch (error) {
      console.error('❌ Failed to connect to Pangolin subgraph stream:', error);
      this.emitError('Failed to connect to subgraph stream', error);
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting all streams...');

    if (this.priceWebSocket) {
      this.priceWebSocket.close();
      this.priceWebSocket = null;
    }

    if (this.subgraphSubscription) {
      this.subgraphSubscription.unsubscribe();
      this.subgraphSubscription = null;
    }

    if (this.subgraphClient) {
      this.subgraphClient.dispose();
      this.subgraphClient = null;
    }

    // Stop fallback polling
    this.stopFallbackPolling();

    this.status.isConnected = false;
    this.status.priceStreamActive = false;
    this.status.subgraphStreamActive = false;

    console.log('✅ All streams disconnected');
  }

  /**
   * Start fallback polling when streaming fails (Comment 11)
   */
  private startFallbackPolling(): void {
    if (this.isInFallbackMode) return;
    
    console.log('🔄 Starting fallback polling mode due to streaming failures');
    this.isInFallbackMode = true;
    
    // Emit offline status
    this.emitConnectionStatus('streaming', 'disconnected', 'Fallback to polling mode');
    
    // Start polling every 5 minutes with reduced lookback window (Comment 10)
    this.fallbackPollingInterval = setInterval(async () => {
      try {
        // Use existing data fetchers from dataCollection with reduced lookback
        const { collectHistoricalData } = await import('./dataCollection');
        const recentData = await collectHistoricalData(
          new Date(Date.now() - 60 * 60 * 1000), // Last 60 minutes instead of 24 hours
          new Date()
        );
        
        if (recentData.length > 0) {
          const latestData = recentData[recentData.length - 1];
          this.lastPriceUpdate = latestData;
          this.status.lastPriceUpdate = latestData.timestamp;
          
          // Emit price update event
          const event = {
            type: StreamingEventType.PRICE_UPDATE,
            timestamp: Date.now(),
            source: 'fallback-polling',
            data: latestData
          };
          
          this.eventEmitter.emit(StreamingEventType.PRICE_UPDATE, event);
          console.log('📡 Fallback polling: fetched latest price data');
        }
      } catch (error) {
        console.error('❌ Fallback polling failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Start subgraph-specific polling fallback (Comment 7)
   */
  private startSubgraphPolling(): void {
    if (this.subgraphPollingInterval) {
      return; // Already polling
    }
    
    console.log('🔄 Starting subgraph polling fallback...');
    
    // Poll every 30-60 seconds with limited lookback
    const pollInterval = 45 * 1000; // 45 seconds
    const lookbackMinutes = 5; // 5 minutes lookback
    
    this.subgraphPollingInterval = setInterval(async () => {
      try {
        const now = Date.now();
        const startTime = Math.floor((now - lookbackMinutes * 60 * 1000) / 1000);
        const endTime = Math.floor(now / 1000);
        
        // HTTP POST to subgraph endpoint for recent swaps
        const httpUrl = import.meta.env.VITE_PANGOLIN_SUBGRAPH_HTTP || '/api/graph';
        const response = await fetch(httpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetRecentSwaps($first: Int!) {
                swaps(first: $first, orderBy: timestamp, orderDirection: desc) {
                  id
                  timestamp
                  amountUSD
                  pair {
                    token0 { symbol decimals }
                    token1 { symbol decimals }
                  }
                }
              }
            `,
            variables: { first: 10 } // Limit to 10 recent swaps
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const swaps = data.data?.swaps || [];
          
          // Emit only new swaps (dedupe by timestamp)
          swaps.forEach((swap: any) => {
            const swapTimestamp = parseInt(swap.timestamp);
            if (swapTimestamp > this.lastSubgraphPoll) {
              const swapEvent = {
                type: StreamingEventType.SWAP_EVENT,
                timestamp: Date.now(),
                source: 'subgraph-polling',
                data: swap
              };
              
              this.eventEmitter.emit(StreamingEventType.SWAP_EVENT, swapEvent);
              console.log(`🔄 Subgraph polling: new swap $${parseFloat(swap.amountUSD).toFixed(2)}`);
            }
          });
          
          if (swaps.length > 0) {
            this.lastSubgraphPoll = Math.max(...swaps.map((s: any) => parseInt(s.timestamp)));
          }
        }
      } catch (error) {
        console.error('❌ Subgraph polling failed:', error);
      }
    }, pollInterval);
  }

  /**
   * Stop fallback polling
   */
  private stopFallbackPolling(): void {
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
      this.fallbackPollingInterval = null;
    }
    if (this.subgraphPollingInterval) {
      clearInterval(this.subgraphPollingInterval);
      this.subgraphPollingInterval = null;
    }
    this.isInFallbackMode = false;
  }

  private updateOverallStatus(): void {
    this.status.isConnected = this.status.priceStreamActive || this.status.subgraphStreamActive;
  }

  private emitConnectionStatus(source: string, status: 'connected' | 'disconnected' | 'connecting' | 'error', error?: string): void {
    const event: ConnectionStatusEvent = {
      type: StreamingEventType.CONNECTION_STATUS,
      timestamp: Date.now(),
      source,
      status,
      error
    };

    this.eventEmitter.emit(StreamingEventType.CONNECTION_STATUS, event);
  }

  private emitError(message: string, details?: any): void {
    const event: ErrorEvent = {
      type: StreamingEventType.ERROR,
      timestamp: Date.now(),
      source: 'streaming-client',
      error: message,
      details
    };

    this.eventEmitter.emit(StreamingEventType.ERROR, event);
  }

  private handlePriceUpdate(data: PriceStreamData): void {
    // Validate incoming data
    const price = parseFloat(data.p);
    const quantity = parseFloat(data.q);
    const timestamp = Math.floor(data.T / 1000);

    // Sanity validation - drop invalid ticks
    if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0 || isNaN(timestamp) || timestamp <= 0) {
      console.warn('❌ Invalid price update data received, dropping tick:', data);
      this.emitError('Invalid price update data', { price, quantity, timestamp, originalData: data });
      return;
    }

    // Check for out-of-order ticks (timestamp should be recent)
    const now = Math.floor(Date.now() / 1000);
    if (timestamp < now - 3600 || timestamp > now + 60) { // Allow 1 hour past, 1 minute future
      console.warn('❌ Out-of-order price tick received, dropping:', { timestamp, now });
      this.emitError('Out-of-order price tick', { timestamp, now, originalData: data });
      return;
    }

    const marketDataPoint: MarketDataPoint = {
      timestamp,
      price,
      volume: quantity * price,
      high: price,
      low: price,
      open: price,
      close: price,
      transactionCount: 1,
      liquidity: 0,
    };

    this.lastPriceUpdate = marketDataPoint;
    this.status.lastPriceUpdate = timestamp;

    const event: PriceUpdateEvent = {
      type: StreamingEventType.PRICE_UPDATE,
      timestamp: Date.now(),
      source: 'binance',
      data: marketDataPoint
    };

    this.eventEmitter.emit(StreamingEventType.PRICE_UPDATE, event);
    if (import.meta.env.DEV) {
      console.log(`💰 Price update: $${price.toFixed(2)}`);
    }
  }

  private handleSubgraphUpdate(data: any): void {
    if (data.type === 'data' && data.data && data.data.swaps) {
      const swapData: SubgraphStreamData = data.data.swaps[0];
      
      // Validate swap data as mentioned in Comment 7
      const amountUSD = parseFloat(swapData.amountUSD);
      const timestamp = parseInt(swapData.timestamp);
      
      // Validate amountUSD is positive
      if (isNaN(amountUSD) || amountUSD <= 0) {
        console.warn('❌ Invalid swap amountUSD:', swapData.amountUSD);
        this.emitError('Invalid swap amountUSD', { amountUSD, originalData: swapData });
        return;
      }
      
      // Validate timestamp is within reasonable bounds
      const now = Math.floor(Date.now() / 1000);
      if (isNaN(timestamp) || timestamp <= 0 || timestamp < now - 86400 || timestamp > now + 3600) {
        console.warn('❌ Invalid swap timestamp:', swapData.timestamp);
        this.emitError('Invalid swap timestamp', { timestamp, now, originalData: swapData });
        return;
      }
      
      this.status.lastSwapUpdate = Date.now();

      const event: SwapEvent = {
        type: StreamingEventType.SWAP_EVENT,
        timestamp: Date.now(),
        source: 'pangolin',
        data: swapData
      };

      this.eventEmitter.emit(StreamingEventType.SWAP_EVENT, event);
      console.log(`🔄 Swap event: $${amountUSD.toFixed(2)}`);
    }
  }


}
