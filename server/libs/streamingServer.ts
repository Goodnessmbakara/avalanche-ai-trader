import WebSocket, { RawData } from 'ws';
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
} from '../../src/utils/streamingTypes';
import type { MarketDataPoint } from '../../src/shared/types';

/**
 * Server-side streaming manager for real-time market data
 */
export class StreamingServer {
  private priceWebSocket: WebSocket | null = null;
  private subgraphClient: ReturnType<typeof createClient> | null = null;
  private subgraphSubscription: any = null;
  private eventEmitter: EventEmitter;
  private config: StreamingConfig;
  private status: StreamingStatus;
  private dataQueue: MarketDataPoint[] = [];
  private reconnectTimers: Record<'price' | 'subgraph', NodeJS.Timeout | null> = { price: null, subgraph: null };
  private lastPriceUpdate: MarketDataPoint | null = null;
  private subgraphPollingInterval: ReturnType<typeof setInterval> | null = null;
  private subgraphErrorCount: number = 0;
  private readonly SUBGRAPH_ERROR_THRESHOLD = 3;

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      enablePriceStream: true,
      enableSubgraphStream: true,
      reconnectDelay: parseInt(process.env.STREAMING_RECONNECT_DELAY || '5000'),
      maxReconnectAttempts: 10,
      dataBufferSize: parseInt(process.env.STREAMING_DATA_BUFFER_SIZE || '1000'),
      updateThrottleMs: 60000, // 60 seconds for server
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

  getDataQueue(): MarketDataPoint[] {
    return [...this.dataQueue];
  }

  isStreamingActive(): boolean {
    return this.status.isConnected;
  }

  getLastPriceUpdate(): MarketDataPoint | null {
    return this.lastPriceUpdate;
  }

  getUpdateThrottleMs(): number {
    return this.config.updateThrottleMs;
  }

  async startPriceStream(): Promise<void> {
    if (!this.config.enablePriceStream || this.priceWebSocket) {
      return;
    }

    const wsUrl = process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443/ws/avaxusdt@trade';
    console.log('🔌 Starting Binance price stream:', wsUrl);

    try {
      this.priceWebSocket = new WebSocket(wsUrl);

      this.priceWebSocket.on('open', () => {
        console.log('✅ Binance price stream connected');
        this.status.priceStreamActive = true;
        this.status.reconnectAttempts = 0;
        this.updateOverallStatus();
        this.emitConnectionStatus('price', 'connected');
      });

      this.priceWebSocket.on('message', (data: RawData) => {
        try {
          const message = JSON.parse(data.toString());
          this.handlePriceUpdate(message);
        } catch (error) {
          console.error('Error parsing price stream data:', error);
          this.emitError('Failed to parse price stream data', error);
        }
      });

      this.priceWebSocket.on('close', () => {
        console.log('❌ Binance price stream disconnected');
        this.status.priceStreamActive = false;
        this.updateOverallStatus();
        this.emitConnectionStatus('price', 'disconnected');
        this.scheduleReconnect('price');
      });

      this.priceWebSocket.on('error', (error) => {
        console.error('❌ Binance price stream error:', error);
        this.status.connectionErrors.push(`Price stream: ${error.message}`);
        // Cap connectionErrors to last 50 entries
        if (this.status.connectionErrors.length > 50) {
          this.status.connectionErrors = this.status.connectionErrors.slice(-50);
        }
        this.emitConnectionStatus('price', 'error', error.message);
      });

    } catch (error) {
      console.error('❌ Failed to start Binance price stream:', error);
      this.emitError('Failed to start price stream', error);
    }
  }

  async startSubgraphStream(): Promise<void> {
    if (!this.config.enableSubgraphStream || this.subgraphClient) {
      return;
    }

    const wsUrl = process.env.PANGOLIN_SUBGRAPH_WS || 'wss://api.thegraph.com/subgraphs/name/pangolin-exchange/pangolin-v2';
    console.log('🔌 Starting Pangolin subgraph stream:', wsUrl);

    try {
      this.subgraphClient = createClient({ 
        url: wsUrl,
        webSocketImpl: WebSocket
      });

      // Subscribe to swap events using GraphQL subscription with pair filtering
      const pairId = process.env.PANGOLIN_PAIR_ID || '0x8f47416cae600bccf9114c3f1c9b24d7ee41ac0b'; // AVAX/USDT pair
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.status.connectionErrors.push(`Subgraph stream: ${errorMessage}`);
            // Cap connectionErrors to last 50 entries
            if (this.status.connectionErrors.length > 50) {
              this.status.connectionErrors = this.status.connectionErrors.slice(-50);
            }
            this.emitConnectionStatus('subgraph', 'error', errorMessage);
            
            // Start polling fallback on repeated errors
            this.subgraphErrorCount++;
            if (this.subgraphErrorCount >= this.SUBGRAPH_ERROR_THRESHOLD) {
              console.log('🔄 Subgraph WebSocket failing, starting polling fallback...');
              this.startSubgraphPolling();
            }
          },
          complete: () => {
            console.log('❌ Pangolin subgraph stream disconnected');
            this.status.subgraphStreamActive = false;
            this.updateOverallStatus();
            this.emitConnectionStatus('subgraph', 'disconnected');
            
            // Start polling fallback when WebSocket completes/disconnects
            console.log('🔄 Subgraph WebSocket disconnected, starting polling fallback...');
            this.startSubgraphPolling();
            
            this.scheduleReconnect('subgraph');
          }
        }
      );

      this.status.subgraphStreamActive = true;
      this.status.reconnectAttempts = 0;
      this.subgraphErrorCount = 0; // Reset error count on successful connection
      this.updateOverallStatus();
      this.emitConnectionStatus('subgraph', 'connected');
      
      // Stop polling fallback when WebSocket reconnects
      this.stopSubgraphPolling();
      
      console.log('✅ Pangolin subgraph stream connected');

    } catch (error) {
      console.error('❌ Failed to start Pangolin subgraph stream:', error);
      this.emitError('Failed to start subgraph stream', error);
    }
  }

  stop(): void {
    console.log('🔌 Stopping all streams...');

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

    // Stop subgraph polling fallback
    this.stopSubgraphPolling();

    // Clear all reconnect timers
    Object.values(this.reconnectTimers).forEach(timer => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    this.reconnectTimers = { price: null, subgraph: null };

    this.status.isConnected = false;
    this.status.priceStreamActive = false;
    this.status.subgraphStreamActive = false;

    console.log('✅ All streams stopped');
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
      source: 'streaming-server',
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
    this.addToDataQueue(marketDataPoint);

    const event: PriceUpdateEvent = {
      type: StreamingEventType.PRICE_UPDATE,
      timestamp: Date.now(),
      source: 'binance',
      data: marketDataPoint
    };

    this.eventEmitter.emit(StreamingEventType.PRICE_UPDATE, event);
    if (process.env.NODE_ENV === 'development') {
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

  private addToDataQueue(dataPoint: MarketDataPoint): void {
    this.dataQueue.push(dataPoint);
    
    if (this.dataQueue.length > this.config.dataBufferSize) {
      this.dataQueue = this.dataQueue.slice(-this.config.dataBufferSize);
    }
  }

  private scheduleReconnect(source: 'price' | 'subgraph'): void {
    // Clear existing timer for this source
    if (this.reconnectTimers[source]) {
      clearTimeout(this.reconnectTimers[source]!);
    }

    this.status.reconnectAttempts++;
    if (this.status.reconnectAttempts <= this.config.maxReconnectAttempts) {
      console.log(`🔄 Scheduling ${source} stream reconnection in ${this.config.reconnectDelay}ms (attempt ${this.status.reconnectAttempts})`);
      
      this.reconnectTimers[source] = setTimeout(() => {
        if (source === 'price') {
          this.startPriceStream();
        } else if (source === 'subgraph') {
          this.startSubgraphStream();
        }
        this.reconnectTimers[source] = null;
      }, this.config.reconnectDelay);
    } else {
      console.error(`❌ Max reconnection attempts reached for ${source} stream`);
    }
  }

  /**
   * Start subgraph polling fallback when WebSocket fails
   */
  private startSubgraphPolling(): void {
    if (this.subgraphPollingInterval) {
      return; // Already polling
    }

    console.log('🔄 Starting subgraph polling fallback...');
    
    const pollInterval = parseInt(process.env.SUBGRAPH_POLL_INTERVAL_MS || '30000'); // 30s default
    const lookbackSeconds = parseInt(process.env.SUBGRAPH_POLL_LOOKBACK_S || '300'); // 5min default
    
    this.subgraphPollingInterval = setInterval(async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const startTime = now - lookbackSeconds;
        
        // Import fetchPangolinSwaps dynamically to avoid circular dependencies
        const { fetchPangolinSwaps } = await import('./dataCollection');
        const swaps = await fetchPangolinSwaps(startTime, now, 10); // Limit to 10 recent swaps
        
        if (swaps.length > 0) {
          // Emit swap events for new swaps
          swaps.forEach(swap => {
            const swapEvent = {
              type: StreamingEventType.SWAP_EVENT,
              timestamp: Date.now(),
              source: 'pangolin-polling',
              data: swap
            };
            
            this.eventEmitter.emit(StreamingEventType.SWAP_EVENT, swapEvent);
            console.log(`🔄 Polling fallback: fetched swap $${parseFloat(swap.amountUSD).toFixed(2)}`);
          });
          
          // Reset error count on successful polling
          this.subgraphErrorCount = 0;
        }
      } catch (error) {
        console.error('❌ Subgraph polling fallback failed:', error);
        this.subgraphErrorCount++;
        
        if (this.subgraphErrorCount >= this.SUBGRAPH_ERROR_THRESHOLD) {
          console.warn('⚠️ Too many subgraph polling errors, stopping fallback');
          this.stopSubgraphPolling();
        }
      }
    }, pollInterval);
  }

  /**
   * Stop subgraph polling fallback
   */
  private stopSubgraphPolling(): void {
    if (this.subgraphPollingInterval) {
      clearInterval(this.subgraphPollingInterval);
      this.subgraphPollingInterval = null;
      console.log('✅ Subgraph polling fallback stopped');
    }
  }



  clearDataQueue(): void {
    this.dataQueue = [];
  }
}
