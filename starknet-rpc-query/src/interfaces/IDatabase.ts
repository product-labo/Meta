/**
 * Interface for database connection and transaction management
 */
export interface IDatabaseConnection {
  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Check if connection is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Begin a database transaction
   */
  beginTransaction(): Promise<IDatabaseTransaction>;

  /**
   * Execute a raw SQL query
   */
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}

/**
 * Interface for database transaction management
 */
export interface IDatabaseTransaction {
  /**
   * Commit the transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;

  /**
   * Execute a query within the transaction
   */
  query<T>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * Check if transaction is active
   */
  isActive(): boolean;
}

/**
 * Interface for database migration management
 */
export interface IMigrationManager {
  /**
   * Run pending migrations
   */
  runMigrations(): Promise<void>;

  /**
   * Rollback migrations
   */
  rollbackMigrations(steps?: number): Promise<void>;

  /**
   * Get migration status
   */
  getMigrationStatus(): Promise<MigrationStatus[]>;

  /**
   * Create a new migration file
   */
  createMigration(name: string): Promise<string>;
}

/**
 * Migration status information
 */
export interface MigrationStatus {
  id: number;
  name: string;
  appliedAt?: Date;
  isPending: boolean;
}