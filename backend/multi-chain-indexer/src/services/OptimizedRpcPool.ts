import { ethers } from 'ethers';
import { RpcProvider } from 'starknet';
import { dbService } from './DbService';

interface ProviderPool {
    providers: (ethers.JsonRpcProvider | RpcProvider)[];
    currentIndex: number;
    healthStatus: boolean[];
}

export class OptimizedRpcPool {
    private pools: Map<number, ProviderPool> = new Map();
    private healthCheckInterval: NodeJS.Timeout | null = null;

    async initialize() {
        const chains = await dbService.query('SELECT * FROM mc_chains WHERE is_active = true');
        
        // Initialize pools for each chain
        const poolPromises = chains.rows.map(async (chain) => {
            const pool = await this.createProviderPool(chain);
            this.pools.set(chain.id, pool);
        });

        await Promise.all(poolPromises);
        
        // Start health monitoring
        this.startHealthCheck();
        
        console.log(`[OptimizedRpcPool] Initialized ${this.pools.size} chain pools`);
    }

    private async createProviderPool(chain: any): Promise<ProviderPool> {
        const isStarknet = chain.name.toLowerCase().includes('starknet');
        const providers: (ethers.JsonRpcProvider | RpcProvider)[] = [];
        
        // Create multiple providers per RPC URL for connection pooling
        for (const url of chain.rpc_urls || []) {
            for (let i = 0; i < 3; i++) { // 3 connections per URL
                try {
                    if (isStarknet) {
                        providers.push(new RpcProvider({ nodeUrl: url }));
                    } else {
                        providers.push(new ethers.JsonRpcProvider(url, undefined, { 
                            staticNetwork: true,
                            batchMaxCount: 100,
                            batchStallTime: 10
                        }));
                    }
                } catch (e) {
                    console.warn(`[OptimizedRpcPool] Failed to create provider for ${url}`);
                }
            }
        }

        return {
            providers,
            currentIndex: 0,
            healthStatus: new Array(providers.length).fill(true)
        };
    }

    getProvider(chainId: number): ethers.JsonRpcProvider | RpcProvider {
        const pool = this.pools.get(chainId);
        if (!pool || pool.providers.length === 0) {
            throw new Error(`No providers for chain ${chainId}`);
        }

        // Round-robin with health check
        let attempts = 0;
        while (attempts < pool.providers.length) {
            const provider = pool.providers[pool.currentIndex];
            const isHealthy = pool.healthStatus[pool.currentIndex];
            
            pool.currentIndex = (pool.currentIndex + 1) % pool.providers.length;
            
            if (isHealthy) {
                return provider;
            }
            attempts++;
        }

        // Fallback to first provider if all unhealthy
        return pool.providers[0];
    }

    // Get multiple providers for parallel requests
    getProviders(chainId: number, count: number = 3): (ethers.JsonRpcProvider | RpcProvider)[] {
        const pool = this.pools.get(chainId);
        if (!pool) return [];

        const healthyProviders = pool.providers.filter((_, i) => pool.healthStatus[i]);
        return healthyProviders.slice(0, count);
    }

    private startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            const healthPromises: Promise<void>[] = [];

            for (const [chainId, pool] of this.pools) {
                for (let i = 0; i < pool.providers.length; i++) {
                    healthPromises.push(this.checkProviderHealth(chainId, i));
                }
            }

            await Promise.allSettled(healthPromises);
        }, 30000); // Check every 30 seconds
    }

    private async checkProviderHealth(chainId: number, providerIndex: number) {
        const pool = this.pools.get(chainId);
        if (!pool) return;

        const provider = pool.providers[providerIndex];
        
        try {
            if (provider instanceof RpcProvider) {
                await provider.getBlock('latest');
            } else {
                await provider.getBlockNumber();
            }
            pool.healthStatus[providerIndex] = true;
        } catch (error) {
            pool.healthStatus[providerIndex] = false;
            console.warn(`[OptimizedRpcPool] Provider ${providerIndex} for chain ${chainId} is unhealthy`);
        }
    }

    destroy() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
    }
}

export const optimizedRpcPool = new OptimizedRpcPool();
