import * as fc from 'fast-check';
import { StarknetRPCClient } from '../../services/rpc/StarknetRPCClient';

describe('RPC Connection Validation Properties', () => {
  
  // Property 1: Connection validation consistency
  test('should consistently validate endpoint availability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          validUrl: fc.constant('https://rpc.starknet.lava.build'),
          invalidUrls: fc.array(
            fc.oneof(
              fc.constant('https://invalid-endpoint.example.com'),
              fc.constant('http://localhost:9999'),
              fc.constant('https://timeout-endpoint.test'),
              fc.webUrl().filter(url => !url.includes('starknet') && !url.includes('lava'))
            ),
            { minLength: 1, maxLength: 3 }
          ),
          timeout: fc.integer({ min: 1000, max: 10000 })
        }),
        async (testData) => {
          // Test valid endpoint
          const validClient = new StarknetRPCClient(testData.validUrl, testData.timeout);
          const validResult = await validClient.validateEndpoint();
          
          expect(validResult).toBe(true);
          expect(validClient.isEndpointHealthy()).toBe(true);
          expect(validClient.getUrl()).toBe(testData.validUrl);

          // Test invalid endpoints
          for (const invalidUrl of testData.invalidUrls) {
            const invalidClient = new StarknetRPCClient(invalidUrl, 2000); // Short timeout for invalid
            const invalidResult = await invalidClient.validateEndpoint();
            
            expect(invalidResult).toBe(false);
            expect(invalidClient.isEndpointHealthy()).toBe(false);
            expect(invalidClient.getUrl()).toBe(invalidUrl);
          }

          // Test consistency - multiple validations should return same result
          const consistencyResults = await Promise.all([
            validClient.validateEndpoint(),
            validClient.validateEndpoint(),
            validClient.validateEndpoint()
          ]);

          expect(consistencyResults.every(result => result === true)).toBe(true);
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });

  test('should maintain health status consistency across operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operations: fc.array(
            fc.constantFrom('getBlockNumber', 'healthCheck', 'validateEndpoint'),
            { minLength: 3, maxLength: 8 }
          )
        }),
        async (testData) => {
          const client = new StarknetRPCClient('https://rpc.starknet.lava.build', 10000);
          
          let lastHealthStatus = false;
          
          for (const operation of testData.operations) {
            try {
              switch (operation) {
                case 'getBlockNumber':
                  await client.getBlockNumber();
                  break;
                case 'healthCheck':
                  await client.healthCheck();
                  break;
                case 'validateEndpoint':
                  await client.validateEndpoint();
                  break;
              }
              
              // After successful operation, health should be true
              expect(client.isEndpointHealthy()).toBe(true);
              lastHealthStatus = true;
              
            } catch (error) {
              // After failed operation, health should be false
              expect(client.isEndpointHealthy()).toBe(false);
              lastHealthStatus = false;
            }
          }

          // Final health check should be consistent with last operation result
          const finalHealth = await client.healthCheck();
          expect(finalHealth).toBe(client.isEndpointHealthy());
        }
      ),
      { numRuns: 10, timeout: 60000 }
    );
  });
});
