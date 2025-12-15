import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class RedisService {
    private client: RedisClientType | null = null;
    private isConnected = false;
    private retryCount = 0;
    private maxRetries = 3;

    async connect(): Promise<void> {
        if (this.isConnected) return;

        try {
            this.client = createClient({
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    connectTimeout: 5000,
                    lazyConnect: true
                },
                password: process.env.REDIS_PASSWORD || undefined,
                database: parseInt(process.env.REDIS_DB || '0')
            });

            this.client.on('error', (err) => {
                console.warn('[Redis] Connection error:', err.message);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('[Redis] Connected successfully');
                this.isConnected = true;
                this.retryCount = 0;
            });

            await this.client.connect();
            
        } catch (error) {
            console.warn('[Redis] Failed to connect:', error.message);
            this.isConnected = false;
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.isConnected || !this.client) return null;
        
        try {
            return await this.client.get(key);
        } catch (error) {
            console.warn('[Redis] Get failed:', error.message);
            return null;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<boolean> {
        if (!this.isConnected || !this.client) return false;
        
        try {
            const options = ttl ? { EX: ttl } : undefined;
            await this.client.set(key, value, options);
            return true;
        } catch (error) {
            console.warn('[Redis] Set failed:', error.message);
            return false;
        }
    }

    async cacheBlockData(chainId: number, blockNumber: number, data: any): Promise<void> {
        const key = `block:${chainId}:${blockNumber}`;
        const ttl = parseInt(process.env.CACHE_TTL || '300');
        await this.set(key, JSON.stringify(data), ttl);
    }

    async getCachedBlockData(chainId: number, blockNumber: number): Promise<any | null> {
        const key = `block:${chainId}:${blockNumber}`;
        const cached = await this.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    isHealthy(): boolean {
        return this.isConnected;
    }
}

export const redisService = new RedisService();
