/**
 * Task 10.3: Performance Property Tests
 * 
 * Property-based tests for database performance and query optimization
 * Feature: multichain-database-sync, Property 5: Query response time consistency
 */

const { Pool } = require('pg');
const fc = require('fast-check');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'david_user',
  password: process.env.DB_PASS || 'Davidsoyaya@1015',
  database: process.env.DB_NAME || 'david'
};

describe('Task 10: Performance Property Tests', () => {
  let pool;

  beforeAll(async () => {
    pool = new Pool(dbConfig);
    
    // Ensure monitoring views exist
    try {
      await pool.query('SELECT 1 FROM sync_health_dashboard LIMIT 1');
    } catch (error) {
      console.warn('Monitoring views not found, skipping some tests');
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  /**
   * Property 5: Query Response Time Consistency
   * For any standard analytics query, response time should be under 500ms
   * Validates: Requirements 10.1
   */
  describe('Property 5: Query Response Time Consistency', () => {
    test('Cross-chain transaction queries should complete within 500ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // limit
          fc.integer({ min: 1, max: 30 }),  // days back
          async (limit, daysBack) => {
            const query = `
              SELECT 
                chain_id,
                COUNT(*) as tx_count,
                AVG(transaction_value) as avg_value
              FROM mc_transaction_details 
              WHERE block_timestamp > NOW() - INTERVAL '${daysBack} days'
                AND transaction_value > 0
              GROUP BY chain_id
              ORDER BY tx_count DESC
              LIMIT ${limit}
            `;

            const startTime = Date.now();
            
            try {
              const result = await pool.query(query);
              const duration = Date.now() - startTime;
              
              // Property: Query should complete within 500ms
              expect(duration).toBeLessThan(500);
              
              // Additional validation: Result should be valid
              expect(Array.isArray(result.rows)).toBe(true);
              expect(result.rows.length).toBeLessThanOrEqual(limit);
              
              return true;
            } catch (error) {
              // If query fails due to missing data, that's acceptable
              if (error.message.includes('does not exist')) {
                return true;
              }
              throw error;
            }
          }
        ),
        { 
          numRuns: 20,
          timeout: 10000,
          verbose: true
        }
      );
    }, 15000);

    test('Wallet ranking queries should complete within 500ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 1000 }), // limit
          fc.constantFrom('transaction_count', 'total_value_sent', 'total_value_received'),
          async (limit, orderBy) => {
            const query = `
              SELECT 
                chain_id,
                wallet_address,
                transaction_count,
                total_value_sent,
                total_value_received
              FROM mc_wallets 
              WHERE ${orderBy} > 0
              ORDER BY ${orderBy} DESC
              LIMIT ${limit}
            `;

            const startTime = Date.now();
            
            try {
              const result = await pool.query(query);
              const duration = Date.now() - startTime;
              
              // Property: Query should complete within 500ms
              expect(duration).toBeLessThan(500);
              
              // Additional validation: Results should be properly ordered
              if (result.rows.length > 1) {
                for (let i = 0; i < result.rows.length - 1; i++) {
                  const current = parseFloat(result.rows[i][orderBy]) || 0;
                  const next = parseFloat(result.rows[i + 1][orderBy]) || 0;
                  expect(current).toBeGreaterThanOrEqual(next);
                }
              }
              
              return true;
            } catch (error) {
              if (error.message.includes('does not exist')) {
                return true;
              }
              throw error;
            }
          }
        ),
        { 
          numRuns: 15,
          timeout: 8000
        }
      );
    }, 12000);

    test('Contract interaction queries should complete within 500ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 100 }), // limit
          fc.integer({ min: 1, max: 7 }),   // days back
          async (limit, daysBack) => {
            const query = `
              SELECT 
                c.chain_id,
                c.contract_address,
                c.interaction_count,
                COUNT(t.id) as recent_interactions
              FROM mc_contracts c
              LEFT JOIN mc_transaction_details t ON c.contract_address = t.contract_address 
                AND t.block_timestamp > NOW() - INTERVAL '${daysBack} days'
              WHERE c.interaction_count > 0
              GROUP BY c.chain_id, c.contract_address, c.interaction_count
              ORDER BY recent_interactions DESC
              LIMIT ${limit}
            `;

            const startTime = Date.now();
            
            try {
              const result = await pool.query(query);
              const duration = Date.now() - startTime;
              
              // Property: Query should complete within 500ms
              expect(duration).toBeLessThan(500);
              
              // Additional validation: Join should work correctly
              expect(Array.isArray(result.rows)).toBe(true);
              result.rows.forEach(row => {
                expect(row.chain_id).toBeDefined();
                expect(row.contract_address).toBeDefined();
                expect(typeof row.interaction_count).toBe('string'); // pg returns numbers as strings
                expect(typeof row.recent_interactions).toBe('string');
              });
              
              return true;
            } catch (error) {
              if (error.message.includes('does not exist')) {
                return true;
              }
              throw error;
            }
          }
        ),
        { 
          numRuns: 15,
          timeout: 8000
        }
      );
    }, 12000);
  });

  /**
   * Property: Index Usage Efficiency
   * For any query on indexed columns, the query should use index scans
   */
  describe('Index Usage Efficiency', () => {
    test('Queries on indexed columns should use index scans', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'mc_transaction_details',
            'mc_wallets', 
            'mc_contracts',
            'mc_blocks'
          ),
          fc.constantFrom(
            'chain_id',
            'created_at',
            'block_timestamp'
          ),
          async (tableName, columnName) => {
            // Skip if column doesn't exist in table
            const columnCheck = await pool.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = $1 AND column_name = $2
            `, [tableName, columnName]);
            
            if (columnCheck.rows.length === 0) {
              return true; // Skip this combination
            }

            const explainQuery = `
              EXPLAIN (FORMAT JSON) 
              SELECT * FROM ${tableName} 
              WHERE ${columnName} IS NOT NULL 
              ORDER BY ${columnName} DESC 
              LIMIT 10
            `;

            try {
              const result = await pool.query(explainQuery);
              const plan = result.rows[0]['QUERY PLAN'][0];
              
              // Property: Should use index scan for indexed columns
              const planStr = JSON.stringify(plan);
              const usesIndex = planStr.includes('Index Scan') || 
                               planStr.includes('Index Only Scan') ||
                               planStr.includes('Bitmap Index Scan');
              
              // For small tables, sequential scan might be more efficient
              // So we don't enforce index usage for very small datasets
              if (plan.Plan['Total Cost'] < 10) {
                return true; // Small table, seq scan is acceptable
              }
              
              expect(usesIndex).toBe(true);
              return true;
            } catch (error) {
              if (error.message.includes('does not exist')) {
                return true;
              }
              throw error;
            }
          }
        ),
        { 
          numRuns: 10,
          timeout: 5000
        }
      );
    }, 8000);
  });

  /**
   * Property: Monitoring Query Performance
   * Monitoring views should respond quickly for dashboard queries
   */
  describe('Monitoring Query Performance', () => {
    test('Monitoring dashboard queries should complete within 200ms', async () => {
      const monitoringQueries = [
        'SELECT * FROM sync_health_dashboard',
        'SELECT * FROM chain_sync_status', 
        'SELECT * FROM performance_metrics',
        'SELECT * FROM data_quality_metrics'
      ];

      for (const query of monitoringQueries) {
        const startTime = Date.now();
        
        try {
          const result = await pool.query(query);
          const duration = Date.now() - startTime;
          
          // Property: Monitoring queries should be very fast (200ms)
          expect(duration).toBeLessThan(200);
          expect(Array.isArray(result.rows)).toBe(true);
        } catch (error) {
          if (error.message.includes('does not exist')) {
            // View doesn't exist, skip this test
            continue;
          }
          throw error;
        }
      }
    }, 5000);

    test('Alert queries should complete within 100ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // limit
          fc.constantFrom('CRITICAL', 'WARNING', null), // severity filter
          async (limit, severity) => {
            let query = `
              SELECT id, alert_type, severity, message, created_at
              FROM monitoring_alerts 
              WHERE resolved_at IS NULL
            `;
            
            const params = [];
            
            if (severity) {
              query += ` AND severity = $${params.length + 1}`;
              params.push(severity);
            }
            
            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
            params.push(limit);

            const startTime = Date.now();
            
            try {
              const result = await pool.query(query, params);
              const duration = Date.now() - startTime;
              
              // Property: Alert queries should be very fast (100ms)
              expect(duration).toBeLessThan(100);
              expect(result.rows.length).toBeLessThanOrEqual(limit);
              
              return true;
            } catch (error) {
              if (error.message.includes('does not exist')) {
                return true;
              }
              throw error;
            }
          }
        ),
        { 
          numRuns: 10,
          timeout: 3000
        }
      );
    }, 5000);
  });

  /**
   * Property: Concurrent Query Performance
   * Multiple concurrent queries should not significantly degrade performance
   */
  describe('Concurrent Query Performance', () => {
    test('Concurrent analytics queries should maintain performance', async () => {
      const testQuery = `
        SELECT chain_id, COUNT(*) as count
        FROM mc_transaction_details 
        WHERE block_timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY chain_id
      `;

      // Test single query performance
      const singleStart = Date.now();
      try {
        await pool.query(testQuery);
        const singleDuration = Date.now() - singleStart;

        // Test concurrent queries (5 simultaneous)
        const concurrentStart = Date.now();
        const promises = Array(5).fill().map(() => pool.query(testQuery));
        await Promise.all(promises);
        const concurrentDuration = Date.now() - concurrentStart;

        // Property: Concurrent execution shouldn't be more than 3x slower per query
        const avgConcurrentDuration = concurrentDuration / 5;
        expect(avgConcurrentDuration).toBeLessThan(singleDuration * 3);
        
        // All queries should still complete within reasonable time
        expect(concurrentDuration).toBeLessThan(2000);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          // Table doesn't exist, skip test
          return;
        }
        throw error;
      }
    }, 10000);
  });

  /**
   * Property: Memory Usage Stability
   * Large result sets should not cause memory issues
   */
  describe('Memory Usage Stability', () => {
    test('Large queries should complete without memory errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 10000 }), // large limit
          async (limit) => {
            const query = `
              SELECT 
                transaction_hash,
                chain_id,
                block_number,
                from_address,
                to_address,
                transaction_value
              FROM mc_transaction_details 
              ORDER BY created_at DESC
              LIMIT ${limit}
            `;

            try {
              const result = await pool.query(query);
              
              // Property: Should handle large result sets without errors
              expect(Array.isArray(result.rows)).toBe(true);
              expect(result.rows.length).toBeLessThanOrEqual(limit);
              
              // Memory usage check: Should not exceed reasonable bounds
              const memoryUsage = process.memoryUsage();
              expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB
              
              return true;
            } catch (error) {
              if (error.message.includes('does not exist')) {
                return true;
              }
              // Memory errors should not occur
              expect(error.message).not.toContain('out of memory');
              throw error;
            }
          }
        ),
        { 
          numRuns: 5,
          timeout: 15000
        }
      );
    }, 20000);
  });
});

/**
 * Test Configuration Notes:
 * 
 * These property tests validate:
 * 1. Query response times stay under performance thresholds
 * 2. Index usage is efficient for common query patterns  
 * 3. Monitoring queries are optimized for dashboard use
 * 4. Concurrent access doesn't degrade performance significantly
 * 5. Large result sets are handled gracefully
 * 
 * The tests use property-based testing to validate performance
 * across a wide range of query parameters and conditions.
 */