/**
 * Onboarding routes
 * Handles user onboarding process with default contract setup
 */

import express from 'express';
import { UserStorage, ContractStorage, AnalysisStorage } from '../database/fileStorage.js';
import { AnalyticsEngine } from '../../index.js';

console.log('🔍 Checking AnalyticsEngine import:', typeof AnalyticsEngine);

const router = express.Router();

/**
 * @swagger
 * /api/onboarding/status:
 *   get:
 *     summary: Get user onboarding status
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status retrieved successfully
 */
router.get('/status', async (req, res) => {
  try {
    const user = await UserStorage.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    res.json({
      completed: user.onboarding?.completed || false,
      hasDefaultContract: !!(user.onboarding?.defaultContract?.address),
      isIndexed: user.onboarding?.defaultContract?.isIndexed || false,
      indexingProgress: user.onboarding?.defaultContract?.indexingProgress || 0
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get onboarding status',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/complete:
 *   post:
 *     summary: Complete user onboarding with default contract
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractAddress
 *               - chain
 *               - contractName
 *               - purpose
 *               - category
 *               - startDate
 *             properties:
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   website:
 *                     type: string
 *                   twitter:
 *                     type: string
 *                   discord:
 *                     type: string
 *                   telegram:
 *                     type: string
 *               logo:
 *                 type: string
 *               contractAddress:
 *                 type: string
 *               chain:
 *                 type: string
 *               contractName:
 *                 type: string
 *               abi:
 *                 type: string
 *               purpose:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [defi, nft, gaming, dao, infrastructure, other]
 *               startDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/complete', async (req, res) => {
  console.log('🎯 Onboarding complete endpoint called');
  try {
    const {
      socialLinks = {},
      logo,
      contractAddress,
      chain,
      contractName,
      abi,
      purpose,
      category,
      startDate
    } = req.body;

    // Validation
    if (!contractAddress || !chain || !contractName || !purpose || !category || !startDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Contract address, chain, name, purpose, category, and start date are required'
      });
    }

    const validCategories = ['defi', 'nft', 'gaming', 'dao', 'infrastructure', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // Update user with onboarding data
    const onboardingData = {
      completed: true,
      socialLinks: {
        website: socialLinks.website || null,
        twitter: socialLinks.twitter || null,
        discord: socialLinks.discord || null,
        telegram: socialLinks.telegram || null
      },
      logo: logo || null,
      defaultContract: {
        address: contractAddress,
        chain,
        abi: abi || null,
        name: contractName,
        purpose,
        category,
        startDate: new Date(startDate).toISOString(),
        isIndexed: false,
        indexingProgress: 0,
        lastAnalysisId: null
      }
    };

    const updatedUser = await UserStorage.update(req.user.id, {
      onboarding: onboardingData
    });

    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Create default contract configuration
    const contractConfig = {
      userId: req.user.id,
      name: contractName,
      description: `Default contract for ${contractName} - ${purpose}`,
      targetContract: {
        address: contractAddress,
        chain,
        name: contractName,
        abi: abi || null
      },
      competitors: [],
      rpcConfig: getDefaultRpcConfig(),
      analysisParams: getDefaultAnalysisParams(),
      tags: ['default', category],
      isActive: true,
      isDefault: true
    };

    const savedConfig = await ContractStorage.create(contractConfig);
    console.log(`📋 Created contract config: ${savedConfig.id}`);

    // Start initial indexing/analysis
    console.log(`🚀 Starting initial indexing for user ${req.user.id}`);
    try {
      startDefaultContractIndexing(req.user.id, savedConfig.id, contractConfig);
      console.log(`✅ Indexing started successfully`);
    } catch (error) {
      console.error(`❌ Failed to start indexing:`, error);
    }

    res.json({
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        onboarding: updatedUser.onboarding
      },
      defaultContractId: savedConfig.id,
      indexingStarted: true
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to complete onboarding',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/default-contract:
 *   get:
 *     summary: Get default contract information and metrics
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default contract data retrieved successfully
 */
router.get('/default-contract', async (req, res) => {
  try {
    const user = await UserStorage.findById(req.user.id);
    if (!user || !user.onboarding?.defaultContract?.address) {
      return res.status(404).json({
        error: 'No default contract found',
        message: 'User has not completed onboarding or has no default contract'
      });
    }

    const defaultContract = user.onboarding.defaultContract;
    
    // Get all analyses for this default contract
    const allAnalyses = await AnalysisStorage.findByUserId(req.user.id);
    const defaultContractAnalyses = allAnalyses.filter(analysis => 
      analysis.results?.target?.contract?.address?.toLowerCase() === defaultContract.address.toLowerCase() ||
      analysis.metadata?.isDefaultContract === true
    );

    // Get the most recent completed analysis (prioritize lastAnalysisId if available)
    let latestAnalysis = null;
    if (defaultContract.lastAnalysisId) {
      latestAnalysis = await AnalysisStorage.findById(defaultContract.lastAnalysisId);
    }
    
    // If no lastAnalysisId or analysis not found, get the most recent completed analysis
    if (!latestAnalysis) {
      const completedAnalyses = defaultContractAnalyses
        .filter(a => a.status === 'completed')
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      
      if (completedAnalyses.length > 0) {
        latestAnalysis = completedAnalyses[0];
        // Update the lastAnalysisId to the most recent completed analysis
        const userToUpdate = await UserStorage.findById(req.user.id);
        const updatedOnboardingData = {
          ...userToUpdate.onboarding,
          defaultContract: {
            ...userToUpdate.onboarding.defaultContract,
            lastAnalysisId: latestAnalysis.id
          }
        };
        await UserStorage.update(req.user.id, { onboarding: updatedOnboardingData });
      }
    }

    res.json({
      contract: defaultContract,
      metrics: latestAnalysis?.results?.target?.metrics && !latestAnalysis.results.target.metrics.error 
        ? latestAnalysis.results.target.metrics 
        : null,
      // Include full analysis results for detailed metrics display
      fullResults: latestAnalysis?.results?.target || null,
      indexingStatus: {
        isIndexed: defaultContract.isIndexed,
        progress: defaultContract.indexingProgress
      },
      analysisHistory: {
        total: defaultContractAnalyses.length,
        completed: defaultContractAnalyses.filter(a => a.status === 'completed').length,
        latest: latestAnalysis ? {
          id: latestAnalysis.id,
          status: latestAnalysis.status,
          createdAt: latestAnalysis.createdAt,
          completedAt: latestAnalysis.completedAt,
          hasError: !!(latestAnalysis.results?.target?.metrics?.error)
        } : null
      },
      // Include error information if analysis failed
      analysisError: latestAnalysis?.results?.target?.metrics?.error || null
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get default contract data',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/user-metrics:
 *   get:
 *     summary: Get overall user analysis metrics
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User metrics retrieved successfully
 */
router.get('/user-metrics', async (req, res) => {
  try {
    const user = await UserStorage.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Get all user's analyses
    const allAnalyses = await AnalysisStorage.findByUserId(req.user.id);
    const completedAnalyses = allAnalyses.filter(a => a.status === 'completed');

    // Get all user's contracts
    const allContracts = await ContractStorage.findByUserId(req.user.id);

    // Calculate metrics
    const totalContracts = allContracts.length;
    const totalAnalyses = allAnalyses.length;
    const completedAnalysesCount = completedAnalyses.length;
    const failedAnalyses = allAnalyses.filter(a => a.status === 'failed').length;
    const runningAnalyses = allAnalyses.filter(a => a.status === 'running' || a.status === 'pending').length;

    // Calculate average execution time
    const completedWithTime = completedAnalyses.filter(a => a.metadata?.executionTimeMs);
    const avgExecutionTime = completedWithTime.length > 0 
      ? completedWithTime.reduce((sum, a) => sum + a.metadata.executionTimeMs, 0) / completedWithTime.length
      : 0;

    // Get unique chains analyzed
    const chainsAnalyzed = new Set();
    completedAnalyses.forEach(analysis => {
      if (analysis.results?.target?.contract?.chain) {
        chainsAnalyzed.add(analysis.results.target.contract.chain);
      }
    });

    // Monthly analysis count
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyAnalyses = allAnalyses.filter(analysis => {
      const analysisDate = new Date(analysis.createdAt);
      return analysisDate.getMonth() === currentMonth && analysisDate.getFullYear() === currentYear;
    }).length;

    res.json({
      overview: {
        totalContracts,
        totalAnalyses,
        completedAnalyses: completedAnalysesCount,
        failedAnalyses,
        runningAnalyses,
        monthlyAnalyses,
        chainsAnalyzed: Array.from(chainsAnalyzed),
        avgExecutionTimeMs: Math.round(avgExecutionTime)
      },
      usage: user.usage,
      limits: {
        monthly: user.tier === 'free' ? 10 : user.tier === 'pro' ? 100 : -1,
        remaining: user.tier === 'free' ? Math.max(0, 10 - (user.usage?.monthlyAnalysisCount || 0)) :
                   user.tier === 'pro' ? Math.max(0, 100 - (user.usage?.monthlyAnalysisCount || 0)) : -1
      },
      recentAnalyses: allAnalyses
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(analysis => ({
          id: analysis.id,
          status: analysis.status,
          analysisType: analysis.analysisType,
          contractAddress: analysis.results?.target?.contract?.address,
          contractName: analysis.results?.target?.contract?.name,
          chain: analysis.results?.target?.contract?.chain,
          createdAt: analysis.createdAt,
          completedAt: analysis.completedAt
        }))
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get user metrics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/test-refresh:
 *   post:
 *     summary: Test refresh endpoint
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test successful
 */
router.post('/test-refresh', async (req, res) => {
  res.json({ message: 'Test refresh endpoint works', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /api/onboarding/refresh-default-contract:
 *   post:
 *     summary: Refresh default contract data by running a new analysis
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default contract refresh started successfully
 *       404:
 *         description: No default contract found
 */
router.post('/refresh-default-contract', async (req, res) => {
  try {
    const user = await UserStorage.findById(req.user.id);
    if (!user || !user.onboarding?.defaultContract?.address) {
      return res.status(404).json({
        error: 'No default contract found',
        message: 'User has not completed onboarding or has no default contract'
      });
    }

    const defaultContract = user.onboarding.defaultContract;
    
    // Check if there's already a running analysis for this user
    const allAnalyses = await AnalysisStorage.findByUserId(req.user.id);
    const runningAnalysis = allAnalyses.find(analysis => 
      (analysis.status === 'running' || analysis.status === 'pending') &&
      analysis.metadata?.isDefaultContract === true
    );

    if (runningAnalysis) {
      return res.json({
        message: 'Default contract refresh already in progress',
        analysisId: runningAnalysis.id,
        status: runningAnalysis.status,
        progress: runningAnalysis.progress || 10
      });
    }
    
    // Find the default contract configuration
    const allContracts = await ContractStorage.findByUserId(req.user.id);
    const defaultConfig = allContracts.find(c => c.isDefault && c.isActive);
    
    if (!defaultConfig) {
      return res.status(404).json({
        error: 'Default contract configuration not found',
        message: 'Default contract configuration is missing or inactive'
      });
    }

    // Find existing analysis to update instead of creating new one
    let existingAnalysis = null;
    if (defaultContract.lastAnalysisId) {
      existingAnalysis = await AnalysisStorage.findById(defaultContract.lastAnalysisId);
    }
    
    // If no existing analysis found, find the most recent completed one for this default contract
    if (!existingAnalysis) {
      const defaultContractAnalyses = allAnalyses.filter(analysis => 
        analysis.metadata?.isDefaultContract === true
      );
      const completedAnalyses = defaultContractAnalyses
        .filter(a => a.status === 'completed')
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      
      if (completedAnalyses.length > 0) {
        existingAnalysis = completedAnalyses[0];
      }
    }

    let analysisId;
    
    if (existingAnalysis) {
      // Update existing analysis instead of creating new one
      console.log(`🔄 Updating existing analysis ${existingAnalysis.id} for refresh`);
      
      await AnalysisStorage.update(existingAnalysis.id, {
        status: 'running',
        progress: 10,
        results: null, // Clear old results
        metadata: {
          ...existingAnalysis.metadata,
          isDefaultContract: true,
          isRefresh: true,
          refreshStarted: new Date().toISOString(),
          originalCreatedAt: existingAnalysis.createdAt // Preserve original creation time
        },
        errorMessage: null,
        logs: ['Starting default contract data refresh...'],
        completedAt: null
      });
      
      analysisId = existingAnalysis.id;
    } else {
      // Create new analysis only if no existing one found
      console.log(`📝 Creating new analysis for default contract refresh`);
      
      const analysisData = {
        userId: req.user.id,
        configId: defaultConfig.id,
        analysisType: 'single',
        status: 'running',
        progress: 10,
        results: null,
        metadata: {
          isDefaultContract: true,
          isRefresh: true,
          refreshStarted: new Date().toISOString()
        },
        errorMessage: null,
        logs: ['Starting default contract data refresh...'],
        completedAt: null
      };

      const analysisResult = await AnalysisStorage.create(analysisData);
      analysisId = analysisResult.id;
    }

    // Update user's default contract with analysis ID and reset indexing status
    const refreshUser = await UserStorage.findById(req.user.id);
    const refreshOnboarding = {
      ...refreshUser.onboarding,
      defaultContract: {
        ...refreshUser.onboarding.defaultContract,
        lastAnalysisId: analysisId,
        isIndexed: false,
        indexingProgress: 10
      }
    };
    await UserStorage.update(req.user.id, { onboarding: refreshOnboarding });

    // Start analysis asynchronously
    performDefaultContractRefresh(analysisId, defaultConfig, req.user.id)
      .catch(error => {
        console.error('Default contract refresh error:', error);
        AnalysisStorage.update(analysisId, {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date().toISOString()
        });
        
        // Update user status on error (async)
        (async () => {
          try {
            const errorUser = await UserStorage.findById(req.user.id);
            const errorOnboarding = {
              ...errorUser.onboarding,
              defaultContract: {
                ...errorUser.onboarding.defaultContract,
                indexingProgress: 0,
                isIndexed: false
              }
            };
            await UserStorage.update(req.user.id, { onboarding: errorOnboarding });
          } catch (updateError) {
            console.error('Failed to update user on error:', updateError);
          }
        })();
      });

    res.json({
      message: 'Default contract refresh started successfully',
      analysisId: analysisId,
      status: 'running',
      progress: 10,
      isUpdate: !!existingAnalysis
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to refresh default contract',
      message: error.message
    });
  }
});

// Helper functions
function getDefaultRpcConfig() {
  return {
    ethereum: [
      process.env.ETHEREUM_RPC_URL,
      process.env.ETHEREUM_RPC_URL_FALLBACK
    ].filter(Boolean),
    lisk: [
      process.env.LISK_RPC_URL1,
      process.env.LISK_RPC_URL2,
      process.env.LISK_RPC_URL3,
      process.env.LISK_RPC_URL4
    ].filter(Boolean),
    starknet: [
      process.env.STARKNET_RPC_URL1,
      process.env.STARKNET_RPC_URL2,
      process.env.STARKNET_RPC_URL3
    ].filter(Boolean)
  };
}

function getDefaultAnalysisParams() {
  return {
    blockRange: parseInt(process.env.ANALYSIS_BLOCK_RANGE) || 1000,
    whaleThreshold: parseFloat(process.env.WHALE_THRESHOLD_ETH) || 10,
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 5,
    failoverTimeout: parseInt(process.env.FAILOVER_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
    outputFormats: (process.env.OUTPUT_FORMATS || 'json,csv,markdown').split(',')
  };
}

// Start indexing process for default contract
async function startDefaultContractIndexing(userId, configId, config) {
  try {
    console.log(`🚀 Starting default contract indexing for user ${userId}`);
    console.log(`📋 Config:`, {
      address: config.targetContract.address,
      chain: config.targetContract.chain,
      name: config.targetContract.name
    });
    
    // Update indexing progress
    const user1 = await UserStorage.findById(userId);
    const onboarding1 = {
      ...user1.onboarding,
      defaultContract: {
        ...user1.onboarding.defaultContract,
        indexingProgress: 10
      }
    };
    await UserStorage.update(userId, { onboarding: onboarding1 });

    // Create analysis result record
    const analysisData = {
      userId,
      configId,
      analysisType: 'single',
      status: 'running',
      progress: 10,
      results: null,
      metadata: {
        isDefaultContract: true,
        indexingStarted: new Date().toISOString()
      },
      errorMessage: null,
      logs: ['Starting default contract indexing...'],
      completedAt: null
    };

    const analysisResult = await AnalysisStorage.create(analysisData);
    console.log(`📝 Created analysis record: ${analysisResult.id}`);

    // Update user with analysis ID
    const user2 = await UserStorage.findById(userId);
    const onboarding2 = {
      ...user2.onboarding,
      defaultContract: {
        ...user2.onboarding.defaultContract,
        lastAnalysisId: analysisResult.id
      }
    };
    await UserStorage.update(userId, { onboarding: onboarding2 });

    // Start analysis asynchronously
    console.log(`🔄 Starting async analysis...`);
    performDefaultContractAnalysis(analysisResult.id, config, userId)
      .then(() => {
        console.log(`✅ Analysis completed successfully for user ${userId}`);
      })
      .catch(error => {
        console.error('Default contract indexing error:', error);
        AnalysisStorage.update(analysisResult.id, {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date().toISOString()
        });
        
        // Update user status on error (async)
        (async () => {
          try {
            const errorUser2 = await UserStorage.findById(userId);
            const errorOnboarding2 = {
              ...errorUser2.onboarding,
              defaultContract: {
                ...errorUser2.onboarding.defaultContract,
                indexingProgress: 0,
                isIndexed: false
              }
            };
            await UserStorage.update(userId, { onboarding: errorOnboarding2 });
          } catch (updateError) {
            console.error('Failed to update user on error:', updateError);
          }
        })();
      });

  } catch (error) {
    console.error('Failed to start default contract indexing:', error);
  }
}

// Perform analysis for default contract
async function performDefaultContractAnalysis(analysisId, config, userId) {
  try {
    console.log(`🔍 Starting analysis for ${analysisId}`);
    const engine = new AnalyticsEngine(config.rpcConfig);
    console.log(`⚙️  AnalyticsEngine created`);
    
    // Update progress
    await AnalysisStorage.update(analysisId, { progress: 30 });
    
    // Get current user data and update nested properties
    const currentUser = await UserStorage.findById(userId);
    const updatedOnboarding = {
      ...currentUser.onboarding,
      defaultContract: {
        ...currentUser.onboarding.defaultContract,
        indexingProgress: 30
      }
    };
    await UserStorage.update(userId, { onboarding: updatedOnboarding });
    console.log(`📊 Progress updated to 30%`);

    // Analyze target contract
    console.log(`🎯 Analyzing contract: ${config.targetContract.address} on ${config.targetContract.chain}`);
    const targetResults = await engine.analyzeContract(
      config.targetContract.address,
      config.targetContract.chain,
      config.targetContract.name,
      config.analysisParams.blockRange
    );
    console.log(`✅ Contract analysis completed`);

    // Update progress
    await AnalysisStorage.update(analysisId, { progress: 80 });
    
    // Get current user data and update nested properties
    const currentUser2 = await UserStorage.findById(userId);
    const updatedOnboarding2 = {
      ...currentUser2.onboarding,
      defaultContract: {
        ...currentUser2.onboarding.defaultContract,
        indexingProgress: 80
      }
    };
    await UserStorage.update(userId, { onboarding: updatedOnboarding2 });
    console.log(`📊 Progress updated to 80%`);

    // Prepare final results
    const results = {
      target: targetResults,
      competitors: [],
      comparative: null,
      metadata: {
        blockRange: config.analysisParams.blockRange,
        chainsAnalyzed: [config.targetContract.chain],
        totalTransactions: targetResults.transactions || 0,
        executionTimeMs: Date.now() - new Date(analysisId).getTime(),
        isDefaultContract: true
      }
    };

    console.log(`📋 Results prepared, transactions: ${targetResults.transactions || 0}`);

    // Complete analysis
    await AnalysisStorage.update(analysisId, {
      status: 'completed',
      progress: 100,
      results,
      completedAt: new Date().toISOString()
    });

    // Mark as indexed and update lastAnalysisId
    const finalUser = await UserStorage.findById(userId);
    const finalOnboarding = {
      ...finalUser.onboarding,
      defaultContract: {
        ...finalUser.onboarding.defaultContract,
        isIndexed: true,
        indexingProgress: 100,
        lastAnalysisId: analysisId
      }
    };
    await UserStorage.update(userId, { onboarding: finalOnboarding });

    console.log(`✅ Default contract indexing completed for user ${userId}`);

  } catch (error) {
    console.error('Default contract analysis failed:', error);
    throw error;
  }
}

// Perform refresh analysis for default contract
async function performDefaultContractRefresh(analysisId, config, userId) {
  try {
    console.log(`🔄 Starting default contract refresh for user ${userId}`);
    
    const engine = new AnalyticsEngine(config.rpcConfig);
    
    // Update progress
    await AnalysisStorage.update(analysisId, { progress: 30 });
    
    const refreshUser1 = await UserStorage.findById(userId);
    const refreshOnboarding1 = {
      ...refreshUser1.onboarding,
      defaultContract: {
        ...refreshUser1.onboarding.defaultContract,
        indexingProgress: 30
      }
    };
    await UserStorage.update(userId, { onboarding: refreshOnboarding1 });

    // Analyze target contract with fresh data
    const targetResults = await engine.analyzeContract(
      config.targetContract.address,
      config.targetContract.chain,
      config.targetContract.name,
      config.analysisParams.blockRange
    );

    // Update progress
    await AnalysisStorage.update(analysisId, { progress: 80 });
    
    const refreshUser2 = await UserStorage.findById(userId);
    const refreshOnboarding2 = {
      ...refreshUser2.onboarding,
      defaultContract: {
        ...refreshUser2.onboarding.defaultContract,
        indexingProgress: 80
      }
    };
    await UserStorage.update(userId, { onboarding: refreshOnboarding2 });

    // Prepare final results
    const results = {
      target: targetResults,
      competitors: [],
      comparative: null,
      metadata: {
        blockRange: config.analysisParams.blockRange,
        chainsAnalyzed: [config.targetContract.chain],
        totalTransactions: targetResults.transactions || 0,
        executionTimeMs: Date.now() - new Date().getTime(),
        isDefaultContract: true,
        isRefresh: true,
        refreshedAt: new Date().toISOString()
      }
    };

    // Complete analysis
    await AnalysisStorage.update(analysisId, {
      status: 'completed',
      progress: 100,
      results,
      completedAt: new Date().toISOString()
    });

    // Mark as indexed with fresh data and update lastAnalysisId
    const refreshFinalUser = await UserStorage.findById(userId);
    const refreshFinalOnboarding = {
      ...refreshFinalUser.onboarding,
      defaultContract: {
        ...refreshFinalUser.onboarding.defaultContract,
        isIndexed: true,
        indexingProgress: 100,
        lastAnalysisId: analysisId
      }
    };
    await UserStorage.update(userId, { onboarding: refreshFinalOnboarding });

    console.log(`✅ Default contract refresh completed for user ${userId}`);

  } catch (error) {
    console.error('Default contract refresh failed:', error);
    throw error;
  }
}

export default router;