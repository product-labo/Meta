import * as fc from 'fast-check';
import { StarknetRPCClient } from '../../services/rpc/StarknetRPCClient';

describe('RPC Retry Logic Properties', () => {
  
  // Property 5: Retry logic exponential backoff
  test('should implement exponential backoff for failed requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retryAttempts: fc.integer({ min: 1, max: 5 }),
          baseDelay: fc.integer({ min: 100, max: 2000 }),
          timeout: fc.integer({ min: 1000, max: 5000 })
        }),
        async (retryConfig) => {
          // Use an invalid endpoint to force retries
          const client = new StarknetRPCClient(
            'https://invalid-endpoint-for-retry-test.example.com',
            retryConfig.timeout,
            retryConfig.retryAttempts,
            retryConfig.baseDelay
          );

          const startTime = Date.now();
          
          try {
            await client.getBlockNumber();
            // Should not reach here with invalid endpoint
            expect(false).toBe(true);
          } catch (error) {
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Calculate expected minimum time based on exponential backoff
            // Delays: baseDelay * 1, baseDelay * 2, baseDelay * 4, etc.
            let expectedMinTime = 0;
            for (let i = 1; i < retryConfig.retryAttempts; i++) {
              expectedMinTime += retryConfig.baseDelay * Math.pow(2, i - 1);
            }
            
            // Account for network timeout on each attempt
            expectedMinTime += retryConfig.timeout * retryConfig.retryAttempts;
            
            // Total time should be at least the expected minimum (with some tolerance)
            expect(totalTime).toBeGreaterThanOrEqual(expectedMinTime * 0.8);
            
            // Should not be excessively longer (max 3x expected for network variance)
            expect(totalTime).toBeLessThan(expectedMinTime * 3);
            
            // Verify client is marked as unhealthy after retries
            expect(client.isEndpointHealthy()).toBe(false);
          }
        }
      ),
      { numRuns: 8, timeout: 120000 }
    );
  });

  test('should respect retry attempt limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRetries: fc.integer({ min: 1, max: 4 }),
          baseDelay: fc.integer({ min: 50, max: 500 })
        }),
        async (config) => {
          const client = new StarknetRPCClient(
            'https://definitely-invalid-endpoint.test',
            1000, // Short timeout
            config.maxRetries,
            config.baseDelay
          );

          let attemptCount = 0;
          const originalPost = client['client'].post;
          
          // Mock the axios post method to count attempts
          client['client'].post = jest.fn().mockImplementation(async () => {
            attemptCount++;
            throw new Error('Network error');
          });

          try {
            await client.call('starknet_blockNumber');
            expect(false).toBe(true); // Should not succeed
          } catch (error) {
            // Verify exact number of attempts
            expect(attemptCount).toBe(config.maxRetries);
            expect(error.message).toContain('Network error');
          }

          // Restore original method
          client['client'].post = originalPost;
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  test('should succeed immediately on first attempt when endpoint is healthy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retryAttempts: fc.integer({ min: 2, max: 5 }),
          baseDelay: fc.integer({ min: 1000, max: 5000 })
        }),
        async (config) => {
          const client = new StarknetRPCClient(
            'https://rpc.starknet.lava.build',
            10000,
            config.retryAttempts,
            config.baseDelay
          );

          const startTime = Date.now();
          
          try {
            const blockNumber = await client.getBlockNumber();
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Should succeed quickly without retries
            expect(totalTime).toBeLessThan(config.baseDelay); // Much faster than first retry delay
            expect(typeof blockNumber).toBe('bigint');
            expect(blockNumber).toBeGreaterThan(0n);
            expect(client.isEndpointHealthy()).toBe(true);
            
          } catch (error) {
            // If network issues, that's acceptable for this test
            // The important thing is it didn't wait for retry delays
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            expect(totalTime).toBeLessThan(config.baseDelay * 2);
          }
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });
});
