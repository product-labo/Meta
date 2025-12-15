// Mock services for running without Redis/Kafka dependencies

export class MockRedisService {
    private cache = new Map<string, { value: string; expires: number }>();

    async connect() {
        console.log('[MockRedis] Connected (in-memory cache)');
    }

    async get(key: string): Promise<string | null> {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    async set(key: string, value: string, ttlSeconds: number = 3600) {
        this.cache.set(key, {
            value,
            expires: Date.now() + (ttlSeconds * 1000)
        });
    }

    async getOrSet(key: string, fetchFn: () => Promise<any>, ttlSeconds: number = 3600): Promise<any> {
        const cached = await this.get(key);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                return cached;
            }
        }

        const freshData = await fetchFn();
        if (freshData) {
            await this.set(key, JSON.stringify(freshData), ttlSeconds);
        }
        return freshData;
    }
}

export class MockKafkaService {
    private isConnected: boolean = false;

    async connectProducer() {
        this.isConnected = true;
        console.log('[MockKafka] Producer connected (logging only)');
    }

    async sendEvent(topic: string, key: string, data: any) {
        if (!this.isConnected) return;
        console.log(`[MockKafka] Event -> ${topic}:${key}`, JSON.stringify(data, null, 2));
    }

    async disconnect() {
        console.log('[MockKafka] Disconnected');
    }
}

export const mockRedisService = new MockRedisService();
export const mockKafkaService = new MockKafkaService();
