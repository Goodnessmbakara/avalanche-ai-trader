import { EnvironmentManager } from '../server/config/environment';

interface ProductionConfig {
  environment: string;
  server: {
    port: number;
    host: string;
    cors: {
      origins: string[];
      credentials: boolean;
    };
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  ai: {
    models: {
      lstm: {
        units: number[];
        dropout: number;
        learningRate: number;
        batchSize: number;
        epochs: number;
      };
      qlearning: {
        learningRate: number;
        discountFactor: number;
        epsilon: number;
        epsilonDecay: number;
      };
    };
    performance: {
      memoryLimit: number;
      gcInterval: number;
      predictionTimeout: number;
      batchSize: number;
    };
    versioning: {
      strategy: 'ab_test' | 'blue_green' | 'canary';
      trafficSplit: number;
      performanceThreshold: number;
      evaluationPeriod: number;
    };
  };
  cache: {
    redis: {
      url: string;
      password?: string;
      db: number;
      ttl: number;
      maxRetries: number;
      retryDelay: number;
    };
    strategies: {
      aiPredictions: {
        ttl: number;
        prefix: string;
      };
      marketData: {
        ttl: number;
        prefix: string;
      };
      userSessions: {
        ttl: number;
        prefix: string;
      };
    };
  };
  monitoring: {
    metrics: {
      port: number;
      enabled: boolean;
      collectionInterval: number;
    };
    logging: {
      level: string;
      dir: string;
      maxFiles: number;
      maxSize: string;
      sentryDsn?: string;
    };
    health: {
      checkInterval: number;
      timeout: number;
      retries: number;
    };
  };
  security: {
    encryption: {
      algorithm: string;
      keyLength: number;
    };
    authentication: {
      adminApiKey?: string;
      jwtSecret: string;
      jwtExpiry: string;
    };
    rateLimiting: {
      api: number;
      auth: number;
      admin: number;
    };
  };
  blockchain: {
    avalanche: {
      rpcUrl: string;
      networkId: number;
      gasLimit: number;
      gasPrice: string;
    };
    contracts: {
      aiTrader: string;
      priceOracle: string;
    };
  };
  external: {
    apis: {
      openai: {
        baseUrl: string;
        timeout: number;
        retries: number;
      };
      coingecko: {
        baseUrl: string;
        timeout: number;
        retries: number;
      };
      tradingview: {
        baseUrl: string;
        timeout: number;
        retries: number;
      };
    };
  };
  optimization: {
    compression: boolean;
    caching: boolean;
    streaming: boolean;
    memory: {
      limit: number;
      warningThreshold: number;
      criticalThreshold: number;
    };
  };
}

class ProductionConfigManager {
  private static instance: ProductionConfigManager;
  private envManager: EnvironmentManager;
  private config: ProductionConfig;

  private constructor() {
    this.envManager = EnvironmentManager.getInstance();
    this.config = this.loadConfig();
  }

  public static getInstance(): ProductionConfigManager {
    if (!ProductionConfigManager.instance) {
      ProductionConfigManager.instance = new ProductionConfigManager();
    }
    return ProductionConfigManager.instance;
  }

  private loadConfig(): ProductionConfig {
    const env = this.envManager.getNodeEnv();
    const envConfig = this.envManager.getConfig();

    return {
      environment: env,
      server: {
        port: this.envManager.getBackendPort(),
        host: '0.0.0.0',
        cors: {
          origins: envConfig.optimization.corsOrigins,
          credentials: true
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: envConfig.security.apiRateLimit
        }
      },
      ai: {
        models: {
          lstm: {
            units: [50, 30],
            dropout: 0.2,
            learningRate: 0.001,
            batchSize: 32,
            epochs: 100
          },
          qlearning: {
            learningRate: 0.1,
            discountFactor: 0.95,
            epsilon: 0.1,
            epsilonDecay: 0.995
          }
        },
        performance: {
          memoryLimit: envConfig.ai.memoryLimit,
          gcInterval: envConfig.ai.gcInterval,
          predictionTimeout: 30000,
          batchSize: 64
        },
        versioning: {
          strategy: envConfig.ai.modelVersionStrategy as any,
          trafficSplit: envConfig.ai.abTestTrafficSplit,
          performanceThreshold: envConfig.ai.modelPerformanceThreshold,
          evaluationPeriod: 24 * 60 * 60 * 1000 // 24 hours
        }
      },
      cache: {
        redis: {
          url: envConfig.redis.url,
          password: envConfig.redis.password,
          db: envConfig.redis.db,
          ttl: envConfig.redis.ttl,
          maxRetries: 3,
          retryDelay: 1000
        },
        strategies: {
          aiPredictions: {
            ttl: 3600, // 1 hour
            prefix: 'ai_prediction'
          },
          marketData: {
            ttl: 300, // 5 minutes
            prefix: 'market_data'
          },
          userSessions: {
            ttl: 86400, // 24 hours
            prefix: 'user_session'
          }
        }
      },
      monitoring: {
        metrics: {
          port: envConfig.monitoring.metricsPort,
          enabled: envConfig.monitoring.prometheusEnabled,
          collectionInterval: envConfig.monitoring.healthCheckInterval
        },
        logging: {
          level: envConfig.logging.level,
          dir: envConfig.logging.dir,
          maxFiles: 14,
          maxSize: '20m',
          sentryDsn: envConfig.logging.sentryDsn
        },
        health: {
          checkInterval: envConfig.monitoring.healthCheckInterval,
          timeout: 5000,
          retries: 3
        }
      },
      security: {
        encryption: {
          algorithm: 'aes-256-cbc',
          keyLength: 32
        },
        authentication: {
          adminApiKey: envConfig.security.adminApiKey,
          jwtSecret: envConfig.security.jwtSecret,
          jwtExpiry: '24h'
        },
        rateLimiting: {
          api: envConfig.security.apiRateLimit,
          auth: 10,
          admin: 1000
        }
      },
      blockchain: {
        avalanche: {
          rpcUrl: envConfig.blockchain.avalancheRpcUrl,
          networkId: 43114,
          gasLimit: envConfig.blockchain.gasLimit,
          gasPrice: '25000000000' // 25 gwei
        },
        contracts: {
          aiTrader: process.env.AI_TRADER_CONTRACT || '',
          priceOracle: process.env.PRICE_ORACLE_CONTRACT || ''
        }
      },
      external: {
        apis: {
          openai: {
            baseUrl: 'https://api.openai.com/v1',
            timeout: 30000,
            retries: 3
          },
          coingecko: {
            baseUrl: 'https://api.coingecko.com/api/v3',
            timeout: 10000,
            retries: 3
          },
          tradingview: {
            baseUrl: 'https://scanner.tradingview.com',
            timeout: 15000,
            retries: 2
          }
        }
      },
      optimization: {
        compression: envConfig.optimization.compressionEnabled,
        caching: envConfig.optimization.cacheEnabled,
        streaming: this.envManager.getEnableStreaming(),
        memory: {
          limit: envConfig.ai.memoryLimit,
          warningThreshold: 0.8,
          criticalThreshold: 0.95
        }
      }
    };
  }

  public getConfig(): ProductionConfig {
    return this.config;
  }

  public getConfigSection<T extends keyof ProductionConfig>(section: T): ProductionConfig[T] {
    return this.config[section];
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  public validateConfig(): void {
    const errors: string[] = [];

    // Validate required fields
    if (!this.config.server.port) {
      errors.push('Server port is required');
    }

    if (!this.config.cache.redis.url) {
      errors.push('Redis URL is required');
    }

    if (!this.config.security.authentication.jwtSecret) {
      errors.push('JWT secret is required');
    }

    if (this.config.ai.performance.memoryLimit <= 0) {
      errors.push('Memory limit must be positive');
    }

    if (this.config.monitoring.metrics.port <= 0) {
      errors.push('Metrics port must be positive');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  public getEnvironmentOverrides(): Record<string, any> {
    const overrides: Record<string, any> = {};

    if (this.isProduction()) {
      overrides.logging = {
        level: 'info',
        maxFiles: 30,
        maxSize: '50m'
      };
      overrides.monitoring = {
        metrics: {
          enabled: true,
          collectionInterval: 15000
        }
      };
      overrides.optimization = {
        compression: true,
        caching: true,
        streaming: true
      };
    } else if (this.isDevelopment()) {
      overrides.logging = {
        level: 'debug',
        maxFiles: 7,
        maxSize: '10m'
      };
      overrides.monitoring = {
        metrics: {
          enabled: false,
          collectionInterval: 60000
        }
      };
      overrides.optimization = {
        compression: false,
        caching: false,
        streaming: false
      };
    }

    return overrides;
  }
}

export { ProductionConfigManager, ProductionConfig };














