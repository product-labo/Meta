/**
 * ETH Price Service
 * Provides ETH to USD conversion functionality
 */

class EthPriceService {
    constructor() {
        this.cachedPrice = 3000; // Default fallback price
        this.lastUpdate = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get current ETH price in USD
     * Uses cached price with fallback to default
     * @returns {number} ETH price in USD
     */
    async getEthPriceUSD() {
        try {
            // Check if we have a recent cached price
            if (this.lastUpdate && (Date.now() - this.lastUpdate) < this.cacheTimeout) {
                return this.cachedPrice;
            }

            // Try to fetch from CoinGecko API
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
                timeout: 5000 // 5 second timeout
            });

            if (response.ok) {
                const data = await response.json();
                if (data.ethereum && data.ethereum.usd) {
                    this.cachedPrice = data.ethereum.usd;
                    this.lastUpdate = Date.now();
                    console.log(`✅ ETH price updated: $${this.cachedPrice}`);
                }
            }
        } catch (error) {
            console.warn('⚠️  Failed to fetch ETH price, using cached/default:', error.message);
        }

        return this.cachedPrice;
    }

    /**
     * Convert ETH amount to USD
     * @param {number} ethAmount - Amount in ETH
     * @returns {Promise<number>} Amount in USD
     */
    async convertEthToUSD(ethAmount) {
        if (!ethAmount || ethAmount === 0) return 0;
        
        const ethPrice = await this.getEthPriceUSD();
        return ethAmount * ethPrice;
    }

    /**
     * Format USD amount with proper decimals
     * @param {number} usdAmount - Amount in USD
     * @returns {string} Formatted USD string
     */
    formatUSD(usdAmount) {
        if (usdAmount < 0.01) return '$0.00';
        if (usdAmount < 1) return `$${usdAmount.toFixed(4)}`;
        if (usdAmount < 100) return `$${usdAmount.toFixed(2)}`;
        return `$${Math.round(usdAmount).toLocaleString()}`;
    }

    /**
     * Get cached price without API call
     * @returns {number} Cached ETH price
     */
    getCachedPrice() {
        return this.cachedPrice;
    }
}

// Export singleton instance
const ethPriceService = new EthPriceService();
export default ethPriceService;