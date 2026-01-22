import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Configuration interface for the application
 */
export interface Config {
  database: DatabaseConfig;
  rpc: RPCConfig;
  ingestion: IngestionConfig;
  app: AppConfig;
}

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  maxConnections: number;
  connectionTimeout: number;
}

export interface RPCConfig {
  url: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  maxConcurrentRequests: number;
}

export interface IngestionConfig {
  batchSize: number;
  checkpointInterval: number;
  maxConcurrentRequests: number;
  startBlock?: bigint | undefined;
}

export interface AppConfig {
  nodeEnv: string;
  logLevel: string;
  port: number;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    database: {
      url: process.env.DATABASE_URL || '',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME || 'starknet_rpc_query',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    },
    rpc: {
      url: process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io',
      timeout: parseInt(process.env.STARKNET_RPC_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.STARKNET_RPC_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.STARKNET_RPC_RETRY_DELAY || '1000'),
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
    },
    ingestion: {
      batchSize: parseInt(process.env.BATCH_SIZE || '100'),
      checkpointInterval: parseInt(process.env.CHECKPOINT_INTERVAL || '1000'),
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
      startBlock: process.env.START_BLOCK ? BigInt(process.env.START_BLOCK) : undefined,
    },
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      port: parseInt(process.env.PORT || '3000'),
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
  if (!config.database.url && (!config.database.host || !config.database.name)) {
    throw new Error('Database configuration is incomplete');
  }

  if (!config.rpc.url) {
    throw new Error('RPC URL is required');
  }

  if (config.rpc.timeout <= 0) {
    throw new Error('RPC timeout must be positive');
  }

  if (config.ingestion.batchSize <= 0) {
    throw new Error('Batch size must be positive');
  }
}