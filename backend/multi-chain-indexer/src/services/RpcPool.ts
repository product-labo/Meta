
import { ethers } from 'ethers';
import { RpcProvider } from 'starknet';
import { dbService } from './DbService';

interface ChainConfig {
    id: number;
    name: string;
    rpcUrls: string[];
    chainId: number; // EVM Chain ID
}

type AnyProvider = ethers.JsonRpcProvider | RpcProvider;

export class RpcPool {
    private providers: Map<number, AnyProvider[]> = new Map();
    private activeProviderIndex: Map<number, number> = new Map();
    private chainConfigs: Map<number, ChainConfig> = new Map();

    constructor() { }

    /**
     * Initializes RPC pools for all active chains in the DB
     */
    async initialize() {
        console.log('[RpcPool] Initializing...');
        // Load chains from DB
        const res = await dbService.query('SELECT * FROM mc_chains WHERE is_active = true');

        for (const row of res.rows) {
            const config: ChainConfig = {
                id: row.id,
                name: row.name,
                rpcUrls: row.rpc_urls || [],
                chainId: row.id
            };

            this.chainConfigs.set(config.id, config);
            this.setupProviders(config);
        }
        console.log(`[RpcPool] Initialized ${this.chainConfigs.size} chains.`);
    }

    private setupProviders(config: ChainConfig) {
        const providers: AnyProvider[] = [];
        const isStarknet = config.name.toLowerCase().includes('starknet');

        for (const url of config.rpcUrls) {
            try {
                if (isStarknet) {
                    const p = new RpcProvider({ nodeUrl: url });
                    providers.push(p);
                } else {
                    // Static provider to avoid auto-detect network overhead
                    const p = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
                    providers.push(p);
                }
            } catch (e) {
                console.error(`[RpcPool] Invalid RPC URL for ${config.name}: ${url}`);
            }
        }
        this.providers.set(config.id, providers);
        this.activeProviderIndex.set(config.id, 0);
    }

    /**
     * Get a working provider for the given chain
     */
    getProvider(chainId: number): AnyProvider {
        const chainProviders = this.providers.get(chainId);
        if (!chainProviders || chainProviders.length === 0) {
            throw new Error(`No providers configured for chain ${chainId}`);
        }

        const index = this.activeProviderIndex.get(chainId) || 0;
        return chainProviders[index];
    }

    /**
     * Report a failure on the current provider and rotate to the next one
     */
    rotate(chainId: number) {
        const chainProviders = this.providers.get(chainId);
        if (!chainProviders) return;

        let index = this.activeProviderIndex.get(chainId) || 0;
        const total = chainProviders.length;

        index = (index + 1) % total;
        this.activeProviderIndex.set(chainId, index);

        // Note: _getConnection() is specific to ethers. Starknet provider has different properties.
        console.warn(`[RpcPool] Rotated chain ${chainId} to provider index ${index}`);
    }
}

export const rpcPool = new RpcPool();
