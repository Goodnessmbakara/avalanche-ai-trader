import * as crypto from 'crypto';
import Joi from 'joi';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentConfig {
  database: {
    url: string;
    poolSize: number;
  };
  redis: {
    url: string;
    password?: string;
    db: number;
    ttl: number;
  };
  logging: {
    level: string;
    dir: string;
    sentryDsn?: string;
  };
  monitoring: {
    metricsPort: number;
    prometheusEnabled: boolean;
    healthCheckInterval: number;
  };
  ai: {
    modelVersionStrategy: string;
    abTestTrafficSplit: number;
    modelPerformanceThreshold: number;
    memoryLimit: number;
    gcInterval: number;
  };
  blockchain: {
    avalancheRpcUrl: string;
    privateKey?: string;
    gasLimit: number;
  };
  external: {
    openaiApiKey?: string;
    coingeckoApiKey?: string;
    tradingViewApiKey?: string;
  };
  security: {
    apiRateLimit: number;
    adminApiKey?: string;
    encryptionKey: string;
    jwtSecret: string;
  };
  optimization: {
    cacheEnabled: boolean;
    compressionEnabled: boolean;
    corsOrigins: string[];
  };
}

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.config = this.loadConfig();
    this.validateEnvironment();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private loadConfig(): EnvironmentConfig {
    return {
      database: {
        url: process.env.DATABASE_URL || 'sqlite:./data/trading.db',
        poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        ttl: parseInt(process.env.CACHE_TTL || '3600'),
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || './logs',
        sentryDsn: process.env.SENTRY_DSN,
      },
      monitoring: {
        metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
        prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      },
      ai: {
        modelVersionStrategy: process.env.MODEL_VERSION_STRATEGY || 'ab_test',
        abTestTrafficSplit: parseInt(process.env.AB_TEST_TRAFFIC_SPLIT || '50'),
        modelPerformanceThreshold: parseFloat(process.env.MODEL_PERFORMANCE_THRESHOLD || '0.85'),
        memoryLimit: parseInt(process.env.MEMORY_LIMIT || '2048'),
        gcInterval: parseInt(process.env.GC_INTERVAL || '300000'),
      },
      blockchain: {
        avalancheRpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
        privateKey: process.env.PRIVATE_KEY,
        gasLimit: parseInt(process.env.GAS_LIMIT || '300000'),
      },
      external: {
        openaiApiKey: this.getEncryptedApiKey('OPENAI_API_KEY'),
        coingeckoApiKey: this.getEncryptedApiKey('COINGECKO_API_KEY'),
        tradingViewApiKey: this.getEncryptedApiKey('TRADINGVIEW_API_KEY'),
      },
      security: {
        apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
        adminApiKey: process.env.ADMIN_API_KEY,
        encryptionKey: this.encryptionKey,
        jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
      },
      optimization: {
        cacheEnabled: process.env.CACHE_ENABLED === 'true',
        compressionEnabled: process.env.COMPRESSION_ENABLED === 'true',
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080').split(','),
      },
    };
  }

  private validateEnvironment(): void {
    const schema = Joi.object({
      database: Joi.object({
        url: Joi.string().required(),
        poolSize: Joi.number().min(1).max(50).default(10),
      }),
      redis: Joi.object({
        url: Joi.string().uri().required(),
        password: Joi.string().allow('').optional(),
        db: Joi.number().min(0).max(15).default(0),
        ttl: Joi.number().min(60).max(86400).default(3600),
      }),
      logging: Joi.object({
        level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
        dir: Joi.string().required(),
        sentryDsn: Joi.alternatives().try(
          Joi.string().uri(),
          Joi.string().allow('')
        ).optional(),
      }),
      monitoring: Joi.object({
        metricsPort: Joi.number().port().default(9090),
        prometheusEnabled: Joi.boolean().default(false),
        healthCheckInterval: Joi.number().min(5000).max(300000).default(30000),
      }),
      ai: Joi.object({
        modelVersionStrategy: Joi.string().valid('ab_test', 'blue_green', 'canary').default('ab_test'),
        abTestTrafficSplit: Joi.number().min(0).max(100).default(50),
        modelPerformanceThreshold: Joi.number().min(0).max(1).default(0.85),
        memoryLimit: Joi.number().min(512).max(8192).default(2048),
        gcInterval: Joi.number().min(60000).max(900000).default(300000),
      }),
      blockchain: Joi.object({
        avalancheRpcUrl: Joi.string().uri().required(),
        privateKey: Joi.string().optional(),
        gasLimit: Joi.number().min(21000).max(1000000).default(300000),
      }),
      external: Joi.object({
        openaiApiKey: Joi.string().optional(),
        coingeckoApiKey: Joi.string().optional(),
        tradingViewApiKey: Joi.string().optional(),
      }),
      security: Joi.object({
        apiRateLimit: Joi.number().min(10).max(1000).default(100),
        adminApiKey: Joi.string().optional(),
        encryptionKey: Joi.string().length(64).required(),
        jwtSecret: Joi.string().min(32).required(),
      }),
      optimization: Joi.object({
        cacheEnabled: Joi.boolean().default(true),
        compressionEnabled: Joi.boolean().default(true),
        corsOrigins: Joi.array().items(Joi.string().uri()).min(1).required(),
      }),
    });

    const { error } = schema.validate(this.config);
    if (error) {
      throw new Error(`Environment validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }
  }

  public getEncryptedApiKey(keyName: string): string | undefined {
    const encryptedKey = process.env[`${keyName}_ENCRYPTED`];
    const plainKey = process.env[keyName];
    
    if (encryptedKey) {
      return this.decryptApiKey(encryptedKey, keyName);
    }
    
    if (plainKey) {
      // Encrypt and store for future use
      const encrypted = this.encryptApiKey(plainKey, keyName);
      console.log(`Encrypted ${keyName} for secure storage. Use ${keyName}_ENCRYPTED=${encrypted} in production.`);
      return plainKey;
    }
    
    return undefined;
  }

  public encryptApiKey(key: string, keyName: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(this.encryptionKey, 'salt', 32), iv);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptApiKey(encryptedKey: string, keyName: string): string {
    try {
      const [ivHex, encrypted] = encryptedKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(this.encryptionKey, 'salt', 32), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt ${keyName}: ${error}`);
    }
  }

  public getConfig(section?: keyof EnvironmentConfig): any {
    if (section) {
      return this.config[section];
    }
    return this.config;
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  public getNodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  public getBackendPort(): number {
    return parseInt(process.env.BACKEND_PORT || '5001');
  }

  public getEnableStreaming(): boolean {
    return process.env.ENABLE_STREAMING === 'true';
  }
}







