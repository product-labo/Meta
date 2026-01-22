/**
 * Performance Configuration
 * 
 * Optimized database connection pooling and caching configuration
 * Requirements: 4.1, 4.2, 8.3, 8.5
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Optimized database connection pool with performance tuning
 */
export const performancePool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'admin',
    database: process.env.DB_NAME || 'broadlypaywall',
    
    // Performance optimizations
    max: 20, // Maximum number of clients in the pool
    min: 5, // Minimum number of clients to keep in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
    maxUses: 7500, // Close and replace a connection after it has been used 7500 times
    
    // Statement timeout to prevent long-running queries
    statement_timeout: 60000, // 60 seconds
    
    // Query timeout
    query_timeout: 30000, // 30 seconds for most queries
    
    // Application name for monitoring
    application_name: 'metagauge-indexer'
});

// Connection event handlers
performancePool.on('connect', (client) => {
    // Set session-level optimizations
    client.query('SET work_mem = "64MB"'); // Increase work memory for complex queries
    client.query('SET maintenance_work_mem = "128MB"'); // For index creation
    client.query('SET effective_cache_size = "4GB"'); // Hint about available cache
});

performancePool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

performancePool.on('remove', (client) => {
    // Client removed from pool
});

/**
 * In-memory cache for frequently accessed data
 */
class PerformanceCache {
    constructor(ttl = 300000) { // Default 5 minutes TTL
        this.cache = new Map();
        this.ttl = ttl;
    }

    /**
     * Get value from cache
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Set value in cache with optional custom TTL
     */
    set(key, value, customTtl = null) {
        const ttl = customTtl || this.ttl;
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }

    /**
     * Delete value from cache
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }

    /**
     * Clean expired entries
     */
    cleanExpired() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Cache instances for different data types
export const abiCache = new PerformanceCache(600000); // 10 minutes for ABI data
export const walletCache = new PerformanceCache(60000); // 1 minute for wallet data
export const projectCache = new PerformanceCache(300000); // 5 minutes for project data
export const indexingStatusCache = new PerformanceCache(5000); // 5 seconds for indexing status

// Periodic cache cleanup
setInterval(() => {
    abiCache.cleanExpired();
    walletCache.cleanExpired();
    projectCache.cleanExpired();
    indexingStatusCache.cleanExpired();
}, 60000); // Clean every minute

/**
 * Batch processor for database operations
 */
export class BatchProcessor {
    constructor(batchSize = 100, flushInterval = 1000) {
        this.batchSize = batchSize;
        this.flushInterval = flushInterval;
        this.batches = new Map(); // key -> array of items
        this.timers = new Map(); // key -> timer
    }

    /**
     * Add item to batch
     */
    add(key, item, processor) {
        if (!this.batches.has(key)) {
            this.batches.set(key, []);
        }

        const batch = this.batches.get(key);
        batch.push(item);

        // Store processor function
        if (!this.processors) {
            this.processors = new Map();
        }
        this.processors.set(key, processor);

        // Flush if batch is full
        if (batch.length >= this.batchSize) {
            this.flush(key);
        } else {
            // Set timer to flush after interval
            this.resetTimer(key);
        }
    }

    /**
     * Reset flush timer for a batch
     */
    resetTimer(key) {
        // Clear existing timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set new timer
        const timer = setTimeout(() => {
            this.flush(key);
        }, this.flushInterval);

        this.timers.set(key, timer);
    }

    /**
     * Flush a specific batch
     */
    async flush(key) {
        const batch = this.batches.get(key);
        if (!batch || batch.length === 0) return;

        // Clear timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }

        // Get processor
        const processor = this.processors?.get(key);
        if (!processor) {
            console.error(`No processor found for batch key: ${key}`);
            return;
        }

        // Process batch
        try {
            await processor(batch);
        } catch (error) {
            console.error(`Error processing batch ${key}:`, error);
        }

        // Clear batch
        this.batches.set(key, []);
    }

    /**
     * Flush all batches
     */
    async flushAll() {
        const keys = Array.from(this.batches.keys());
        await Promise.all(keys.map(key => this.flush(key)));
    }

    /**
     * Get batch size for a key
     */
    getBatchSize(key) {
        return this.batches.get(key)?.length || 0;
    }
}

// Export singleton batch processor
export const transactionBatchProcessor = new BatchProcessor(100, 1000);
export const eventBatchProcessor = new BatchProcessor(100, 1000);

/**
 * Query performance monitoring
 */
export class QueryMonitor {
    constructor() {
        this.queries = [];
        this.slowQueryThreshold = 1000; // 1 second
    }

    /**
     * Log query execution
     */
    logQuery(query, duration, params = null) {
        const queryLog = {
            query,
            duration,
            params,
            timestamp: new Date(),
            isSlow: duration > this.slowQueryThreshold
        };

        this.queries.push(queryLog);

        // Keep only last 1000 queries
        if (this.queries.length > 1000) {
            this.queries.shift();
        }

        // Log slow queries
        if (queryLog.isSlow) {
            console.warn(`Slow query detected (${duration}ms):`, query.substring(0, 100));
        }
    }

    /**
     * Get slow queries
     */
    getSlowQueries() {
        return this.queries.filter(q => q.isSlow);
    }

    /**
     * Get query statistics
     */
    getStats() {
        if (this.queries.length === 0) {
            return {
                totalQueries: 0,
                averageDuration: 0,
                slowQueries: 0,
                fastestQuery: 0,
                slowestQuery: 0
            };
        }

        const durations = this.queries.map(q => q.duration);
        const sum = durations.reduce((a, b) => a + b, 0);

        return {
            totalQueries: this.queries.length,
            averageDuration: sum / this.queries.length,
            slowQueries: this.queries.filter(q => q.isSlow).length,
            fastestQuery: Math.min(...durations),
            slowestQuery: Math.max(...durations)
        };
    }

    /**
     * Clear query logs
     */
    clear() {
        this.queries = [];
    }
}

export const queryMonitor = new QueryMonitor();

/**
 * Monitored query execution
 */
export async function monitoredQuery(text, params) {
    const startTime = Date.now();
    try {
        const result = await performancePool.query(text, params);
        const duration = Date.now() - startTime;
        queryMonitor.logQuery(text, duration, params);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        queryMonitor.logQuery(text, duration, params);
        throw error;
    }
}

export default {
    performancePool,
    abiCache,
    walletCache,
    projectCache,
    indexingStatusCache,
    transactionBatchProcessor,
    eventBatchProcessor,
    queryMonitor,
    monitoredQuery,
    BatchProcessor,
    PerformanceCache,
    QueryMonitor
};
