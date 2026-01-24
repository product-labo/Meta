/**
 * User Journey Analyzer
 * 
 * Tracks user interaction sequences and identifies feature adoption patterns.
 * Analyzes how users navigate through contract functions and where they drop off.
 */
export class UserJourneyAnalyzer {
  constructor() {
    this.journeys = new Map();
  }

  /**
   * Analyze user journeys from normalized transactions
   * @param {Array<Object>} transactions - Array of normalized transactions
   * @returns {Object} User journey report
   */
  analyzeJourneys(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return this._emptyReport();
    }

    // Group transactions by wallet and sort by timestamp
    const walletJourneys = this._groupByWallet(transactions);
    
    // Analyze patterns
    const entryPoints = this.identifyEntryPoints(transactions);
    const featureAdoption = this.calculateFeatureAdoption(transactions);
    const dropoffPoints = this.detectDropoffPoints(transactions);
    const commonPaths = this._identifyCommonPaths(walletJourneys);

    // Calculate statistics
    const totalUsers = walletJourneys.size;
    const journeyLengths = Array.from(walletJourneys.values()).map(j => j.length);
    const averageJourneyLength = journeyLengths.reduce((sum, len) => sum + len, 0) / totalUsers;

    return {
      totalUsers,
      averageJourneyLength,
      commonPaths,
      entryPoints,
      featureAdoption,
      dropoffPoints,
      journeyDistribution: this._calculateJourneyDistribution(journeyLengths)
    };
  }

  /**
   * Identify the most common entry points (first functions called)
   * @param {Array<Object>} transactions - Array of normalized transactions
   * @returns {Array<Object>} Entry point statistics
   */
  identifyEntryPoints(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }

    // Group by wallet and find first transaction for each
    const walletJourneys = this._groupByWallet(transactions);
    const entryPointCounts = new Map();

    for (const [wallet, journey] of walletJourneys) {
      if (journey.length > 0) {
        const firstFunction = journey[0].functionName;
        entryPointCounts.set(
          firstFunction,
          (entryPointCounts.get(firstFunction) || 0) + 1
        );
      }
    }

    // Convert to array and calculate percentages
    const totalUsers = walletJourneys.size;
    const entryPoints = Array.from(entryPointCounts.entries())
      .map(([functionName, count]) => ({
        functionName,
        userCount: count,
        percentage: (count / totalUsers) * 100
      }))
      .sort((a, b) => b.userCount - a.userCount);

    return entryPoints;
  }

  /**
   * Calculate feature adoption matrix (function A → function B transitions)
   * @param {Array<Object>} transactions - Array of normalized transactions
   * @returns {Object} Feature adoption matrix
   */
  calculateFeatureAdoption(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { transitions: [], adoptionRates: {} };
    }

    const walletJourneys = this._groupByWallet(transactions);
    const transitions = new Map();
    const functionUsers = new Map();

    // Count transitions and function usage
    for (const [wallet, journey] of walletJourneys) {
      const seenFunctions = new Set();
      
      for (let i = 0; i < journey.length; i++) {
        const currentFunc = journey[i].functionName;
        seenFunctions.add(currentFunc);
        
        // Count users who used this function
        functionUsers.set(
          currentFunc,
          (functionUsers.get(currentFunc) || new Set()).add(wallet)
        );

        // Track transitions to next function
        if (i < journey.length - 1) {
          const nextFunc = journey[i + 1].functionName;
          const transitionKey = `${currentFunc} → ${nextFunc}`;
          
          if (!transitions.has(transitionKey)) {
            transitions.set(transitionKey, {
              from: currentFunc,
              to: nextFunc,
              wallets: new Set()
            });
          }
          
          transitions.get(transitionKey).wallets.add(wallet);
        }
      }
    }

    // Calculate adoption rates
    const adoptionRates = {};
    const transitionArray = [];

    for (const [key, data] of transitions) {
      const fromUserCount = functionUsers.get(data.from)?.size || 0;
      const transitionCount = data.wallets.size;
      const adoptionRate = fromUserCount > 0 ? transitionCount / fromUserCount : 0;

      adoptionRates[key] = adoptionRate;
      transitionArray.push({
        from: data.from,
        to: data.to,
        userCount: transitionCount,
        adoptionRate,
        percentage: adoptionRate * 100
      });
    }

    // Sort by adoption rate
    transitionArray.sort((a, b) => b.adoptionRate - a.adoptionRate);

    return {
      transitions: transitionArray,
      adoptionRates,
      functionUsage: this._formatFunctionUsage(functionUsers)
    };
  }

  /**
   * Detect drop-off points (functions after which users stop interacting)
   * @param {Array<Object>} transactions - Array of normalized transactions
   * @returns {Array<Object>} Drop-off point statistics
   */
  detectDropoffPoints(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }

    const walletJourneys = this._groupByWallet(transactions);
    const lastFunctionCounts = new Map();
    const functionAppearances = new Map();

    for (const [wallet, journey] of walletJourneys) {
      if (journey.length > 0) {
        // Track last function in journey
        const lastFunction = journey[journey.length - 1].functionName;
        lastFunctionCounts.set(
          lastFunction,
          (lastFunctionCounts.get(lastFunction) || 0) + 1
        );

        // Track all function appearances
        for (const tx of journey) {
          functionAppearances.set(
            tx.functionName,
            (functionAppearances.get(tx.functionName) || 0) + 1
          );
        }
      }
    }

    // Calculate drop-off rates
    const dropoffPoints = [];
    for (const [functionName, dropoffCount] of lastFunctionCounts) {
      const totalAppearances = functionAppearances.get(functionName) || 0;
      const dropoffRate = totalAppearances > 0 ? dropoffCount / totalAppearances : 0;

      dropoffPoints.push({
        functionName,
        dropoffCount,
        totalAppearances,
        dropoffRate,
        dropoffPercentage: dropoffRate * 100
      });
    }

    // Sort by drop-off rate
    dropoffPoints.sort((a, b) => b.dropoffRate - a.dropoffRate);

    return dropoffPoints;
  }

  /**
   * Group transactions by wallet and sort by timestamp
   * @private
   */
  _groupByWallet(transactions) {
    const walletMap = new Map();

    for (const tx of transactions) {
      // Skip transactions with invalid timestamps
      if (!tx.timestamp || isNaN(tx.timestamp.getTime())) {
        continue;
      }
      
      const wallet = tx.wallet.toLowerCase();
      
      if (!walletMap.has(wallet)) {
        walletMap.set(wallet, []);
      }
      
      walletMap.get(wallet).push(tx);
    }

    // Sort each wallet's transactions by timestamp (with stable secondary sort)
    for (const [wallet, txs] of walletMap) {
      txs.sort((a, b) => {
        const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
        if (timeDiff !== 0) return timeDiff;
        // Secondary sort by blockNumber for stability when timestamps are equal
        const blockDiff = (a.blockNumber || 0) - (b.blockNumber || 0);
        if (blockDiff !== 0) return blockDiff;
        // Tertiary sort by hash for stability
        return (a.hash || '').localeCompare(b.hash || '');
      });
    }

    return walletMap;
  }

  /**
   * Identify common paths through the application
   * @private
   */
  _identifyCommonPaths(walletJourneys) {
    const pathCounts = new Map();
    const pathTimings = new Map();

    for (const [wallet, journey] of walletJourneys) {
      if (journey.length < 2) continue;

      // Create path sequences of different lengths
      for (let length = 2; length <= Math.min(5, journey.length); length++) {
        for (let i = 0; i <= journey.length - length; i++) {
          const pathSlice = journey.slice(i, i + length);
          const pathKey = pathSlice.map(tx => tx.functionName).join(' → ');
          
          // Count path occurrences
          pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);
          
          // Track timing
          const duration = pathSlice[pathSlice.length - 1].timestamp.getTime() - 
                          pathSlice[0].timestamp.getTime();
          
          if (!pathTimings.has(pathKey)) {
            pathTimings.set(pathKey, []);
          }
          pathTimings.get(pathKey).push(duration);
        }
      }
    }

    // Convert to array and calculate statistics
    const paths = Array.from(pathCounts.entries())
      .map(([path, count]) => {
        const timings = pathTimings.get(path) || [];
        const avgTime = timings.length > 0 
          ? timings.reduce((sum, t) => sum + t, 0) / timings.length 
          : 0;

        return {
          sequence: path.split(' → '),
          userCount: count,
          averageCompletionTime: avgTime,
          conversionRate: count / walletJourneys.size
        };
      })
      .filter(p => p.userCount >= 2) // Only include paths used by 2+ users
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 20); // Top 20 paths

    return paths;
  }

  /**
   * Calculate journey length distribution
   * @private
   */
  _calculateJourneyDistribution(journeyLengths) {
    const distribution = {};
    
    for (const length of journeyLengths) {
      distribution[length] = (distribution[length] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Format function usage statistics
   * @private
   */
  _formatFunctionUsage(functionUsers) {
    const usage = [];
    
    for (const [functionName, walletSet] of functionUsers) {
      usage.push({
        functionName,
        uniqueUsers: walletSet.size
      });
    }

    usage.sort((a, b) => b.uniqueUsers - a.uniqueUsers);
    return usage;
  }

  /**
   * Return empty report structure
   * @private
   */
  _emptyReport() {
    return {
      totalUsers: 0,
      averageJourneyLength: 0,
      commonPaths: [],
      entryPoints: [],
      featureAdoption: { transitions: [], adoptionRates: {} },
      dropoffPoints: [],
      journeyDistribution: {}
    };
  }
}

export default UserJourneyAnalyzer;
