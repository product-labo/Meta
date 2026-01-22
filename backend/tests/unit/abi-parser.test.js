/**
 * Unit tests for ABI Parser Service
 * Requirements: 8.1, 8.2
 */

import { ABIParserService } from '../../src/services/abiParserService.js';
import { pool } from '../../src/config/appConfig.js';

describe('ABI Parser Service', () => {
  let abiParser;
  const testContractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
  const testChain = 'ethereum';

  beforeAll(async () => {
    abiParser = new ABIParserService();
    
    // Test database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await pool.query(
        'DELETE FROM contract_abi_features WHERE contract_address = $1 AND chain = $2',
        [testContractAddress, testChain]
      );
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('parseABI', () => {
    test('should parse standard ERC20 ABI', async () => {
      const erc20ABI = [
        {
          "type": "function",
          "name": "transfer",
          "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
          ],
          "outputs": [{"name": "", "type": "bool"}],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "balanceOf",
          "inputs": [{"name": "account", "type": "address"}],
          "outputs": [{"name": "", "type": "uint256"}],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "approve",
          "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
          ],
          "outputs": [{"name": "", "type": "bool"}],
          "stateMutability": "nonpayable"
        },
        {
          "type": "event",
          "name": "Transfer",
          "inputs": [
            {"name": "from", "type": "address", "indexed": true},
            {"name": "to", "type": "address", "indexed": true},
            {"name": "value", "type": "uint256", "indexed": false}
          ]
        },
        {
          "type": "event",
          "name": "Approval",
          "inputs": [
            {"name": "owner", "type": "address", "indexed": true},
            {"name": "spender", "type": "address", "indexed": true},
            {"name": "value", "type": "uint256", "indexed": false}
          ]
        }
      ];

      const features = await abiParser.parseABI(erc20ABI);

      // Verify functions
      expect(features.functions).toHaveLength(3);
      
      const transferFunc = features.functions.find(f => f.name === 'transfer');
      expect(transferFunc).toBeDefined();
      expect(transferFunc.selector).toBe('0xa9059cbb'); // Known ERC20 transfer selector
      expect(transferFunc.category).toBe('transfer');
      expect(transferFunc.stateMutability).toBe('nonpayable');
      expect(transferFunc.inputs).toHaveLength(2);
      expect(transferFunc.outputs).toHaveLength(1);

      const balanceOfFunc = features.functions.find(f => f.name === 'balanceOf');
      expect(balanceOfFunc).toBeDefined();
      expect(balanceOfFunc.selector).toBe('0x70a08231'); // Known ERC20 balanceOf selector
      expect(balanceOfFunc.category).toBe('custom');
      expect(balanceOfFunc.stateMutability).toBe('view');

      // Verify events
      expect(features.events).toHaveLength(2);
      
      const transferEvent = features.events.find(e => e.name === 'Transfer');
      expect(transferEvent).toBeDefined();
      expect(transferEvent.topic).toBe('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'); // Known Transfer event topic
      expect(transferEvent.inputs).toHaveLength(3);
    });

    test('should parse standard ERC721 ABI', async () => {
      const erc721ABI = [
        {
          "type": "function",
          "name": "transferFrom",
          "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "tokenId", "type": "uint256"}
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "ownerOf",
          "inputs": [{"name": "tokenId", "type": "uint256"}],
          "outputs": [{"name": "", "type": "address"}],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "mint",
          "inputs": [
            {"name": "to", "type": "address"},
            {"name": "tokenId", "type": "uint256"}
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "event",
          "name": "Transfer",
          "inputs": [
            {"name": "from", "type": "address", "indexed": true},
            {"name": "to", "type": "address", "indexed": true},
            {"name": "tokenId", "type": "uint256", "indexed": true}
          ]
        }
      ];

      const features = await abiParser.parseABI(erc721ABI);

      // Verify functions
      expect(features.functions).toHaveLength(3);
      
      const transferFromFunc = features.functions.find(f => f.name === 'transferFrom');
      expect(transferFromFunc).toBeDefined();
      expect(transferFromFunc.category).toBe('transfer');
      expect(transferFromFunc.inputs).toHaveLength(3);

      const mintFunc = features.functions.find(f => f.name === 'mint');
      expect(mintFunc).toBeDefined();
      expect(mintFunc.category).toBe('transfer'); // mint should be categorized as transfer

      // Verify events
      expect(features.events).toHaveLength(1);
      expect(features.events[0].name).toBe('Transfer');
    });

    test('should parse custom contract ABI with swap functions', async () => {
      const customABI = [
        {
          "type": "function",
          "name": "swapExactTokensForTokens",
          "inputs": [
            {"name": "amountIn", "type": "uint256"},
            {"name": "amountOutMin", "type": "uint256"},
            {"name": "path", "type": "address[]"},
            {"name": "to", "type": "address"},
            {"name": "deadline", "type": "uint256"}
          ],
          "outputs": [{"name": "amounts", "type": "uint256[]"}],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "bridgeTokens",
          "inputs": [
            {"name": "token", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "destinationChain", "type": "uint256"}
          ],
          "outputs": [],
          "stateMutability": "payable"
        },
        {
          "type": "event",
          "name": "TokensSwapped",
          "inputs": [
            {"name": "user", "type": "address", "indexed": true},
            {"name": "amountIn", "type": "uint256", "indexed": false},
            {"name": "amountOut", "type": "uint256", "indexed": false}
          ]
        }
      ];

      const features = await abiParser.parseABI(customABI);

      // Verify function categorization
      const swapFunc = features.functions.find(f => f.name === 'swapExactTokensForTokens');
      expect(swapFunc).toBeDefined();
      expect(swapFunc.category).toBe('swap');

      const bridgeFunc = features.functions.find(f => f.name === 'bridgeTokens');
      expect(bridgeFunc).toBeDefined();
      expect(bridgeFunc.category).toBe('bridge');

      // Verify events
      expect(features.events).toHaveLength(1);
      expect(features.events[0].name).toBe('TokensSwapped');
    });

    test('should handle JSON string input', async () => {
      const abiString = JSON.stringify([
        {
          "type": "function",
          "name": "testFunction",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ]);

      const features = await abiParser.parseABI(abiString);
      expect(features.functions).toHaveLength(1);
      expect(features.functions[0].name).toBe('testFunction');
    });

    test('should handle human-readable ABI format', async () => {
      const humanReadableABI = [
        "function swapTokens(uint256 amountIn, address tokenOut) external returns (uint256)",
        "function getPrice(address token) external view returns (uint256)",
        "event Swap(address indexed user, uint256 amountIn, uint256 amountOut)"
      ];

      const features = await abiParser.parseABI(humanReadableABI);

      expect(features.functions).toHaveLength(2);
      expect(features.events).toHaveLength(1);

      const swapFunc = features.functions.find(f => f.name === 'swapTokens');
      expect(swapFunc).toBeDefined();
      expect(swapFunc.category).toBe('swap');
    });

    test('should handle error for invalid ABI format', async () => {
      await expect(abiParser.parseABI('invalid json')).rejects.toThrow('Failed to parse ABI');
      await expect(abiParser.parseABI(null)).rejects.toThrow('Invalid ABI format');
      await expect(abiParser.parseABI(123)).rejects.toThrow('Invalid ABI format');
    });
  });

  describe('function categorization logic', () => {
    test('should categorize swap functions correctly', async () => {
      const swapABI = [
        {
          "type": "function",
          "name": "swap",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "exchangeTokens",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "tradeAssets",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ];

      const features = await abiParser.parseABI(swapABI);
      features.functions.forEach(func => {
        expect(func.category).toBe('swap');
      });
    });

    test('should categorize bridge functions correctly', async () => {
      const bridgeABI = [
        {
          "type": "function",
          "name": "bridge",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "lockTokens",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "deposit",
          "inputs": [],
          "outputs": [],
          "stateMutability": "payable"
        },
        {
          "type": "function",
          "name": "withdraw",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ];

      const features = await abiParser.parseABI(bridgeABI);
      features.functions.forEach(func => {
        expect(func.category).toBe('bridge');
      });
    });

    test('should categorize transfer functions correctly', async () => {
      const transferABI = [
        {
          "type": "function",
          "name": "transfer",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "send",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "mint",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "burn",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ];

      const features = await abiParser.parseABI(transferABI);
      features.functions.forEach(func => {
        expect(func.category).toBe('transfer');
      });
    });

    test('should categorize unknown functions as custom', async () => {
      const customABI = [
        {
          "type": "function",
          "name": "calculateRewards",
          "inputs": [],
          "outputs": [],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "updateSettings",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ];

      const features = await abiParser.parseABI(customABI);
      features.functions.forEach(func => {
        expect(func.category).toBe('custom');
      });
    });
  });

  describe('storeABIFeatures and getABIFeatures', () => {
    test('should store and retrieve ABI features', async () => {
      const testABI = [
        {
          "type": "function",
          "name": "testFunction",
          "inputs": [{"name": "param1", "type": "uint256"}],
          "outputs": [{"name": "", "type": "bool"}],
          "stateMutability": "nonpayable"
        },
        {
          "type": "event",
          "name": "TestEvent",
          "inputs": [{"name": "value", "type": "uint256", "indexed": false}]
        }
      ];

      const features = await abiParser.parseABI(testABI);
      
      // Store features
      await abiParser.storeABIFeatures(testContractAddress, testChain, features);

      // Retrieve features
      const retrievedFeatures = await abiParser.getABIFeatures(testContractAddress, testChain);

      expect(retrievedFeatures.functions).toHaveLength(1);
      expect(retrievedFeatures.functions[0].name).toBe('testFunction');
      expect(retrievedFeatures.functions[0].category).toBe('custom');

      expect(retrievedFeatures.events).toHaveLength(1);
      expect(retrievedFeatures.events[0].name).toBe('TestEvent');
    });

    test('should handle upsert on duplicate contract/chain/selector', async () => {
      const testABI = [
        {
          "type": "function",
          "name": "duplicateFunction",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ];

      const features = await abiParser.parseABI(testABI);
      
      // Store features twice - should not throw error
      await abiParser.storeABIFeatures(testContractAddress, testChain, features);
      await abiParser.storeABIFeatures(testContractAddress, testChain, features);

      // Should still have only one function
      const retrievedFeatures = await abiParser.getABIFeatures(testContractAddress, testChain);
      const duplicateFunctions = retrievedFeatures.functions.filter(f => f.name === 'duplicateFunction');
      expect(duplicateFunctions).toHaveLength(1);
    });
  });

  describe('error handling for invalid ABI', () => {
    test('should handle malformed function definitions', async () => {
      const malformedABI = [
        {
          "type": "function",
          // Missing name
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        }
      ];

      // Should not throw, but should skip malformed functions
      const features = await abiParser.parseABI(malformedABI);
      expect(features.functions).toHaveLength(0);
    });

    test('should handle malformed event definitions', async () => {
      const malformedABI = [
        {
          "type": "event",
          // Missing name
          "inputs": []
        }
      ];

      // Should not throw, but should skip malformed events
      const features = await abiParser.parseABI(malformedABI);
      expect(features.events).toHaveLength(0);
    });

    test('should handle empty ABI', async () => {
      const features = await abiParser.parseABI([]);
      expect(features.functions).toHaveLength(0);
      expect(features.events).toHaveLength(0);
    });

    test('should handle ABI with only constructor and fallback', async () => {
      const constructorABI = [
        {
          "type": "constructor",
          "inputs": [{"name": "initialValue", "type": "uint256"}],
          "stateMutability": "nonpayable"
        },
        {
          "type": "fallback",
          "stateMutability": "payable"
        }
      ];

      const features = await abiParser.parseABI(constructorABI);
      expect(features.functions).toHaveLength(0);
      expect(features.events).toHaveLength(0);
    });
  });
});