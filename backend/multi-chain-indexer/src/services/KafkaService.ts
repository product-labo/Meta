import { Kafka, Producer, Consumer } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

class KafkaService {
    private kafka: Kafka;
    private producer: Producer | null = null;
    private isConnected = false;
    private topicsPrefix: string;

    constructor() {
        this.kafka = new Kafka({
            clientId: process.env.KAFKA_CLIENT_ID || 'multi-chain-indexer',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            retry: {
                initialRetryTime: 100,
                retries: 3
            }
        });
        
        this.topicsPrefix = process.env.KAFKA_TOPICS_PREFIX || 'blockchain';
    }

    async connectProducer(): Promise<void> {
        if (this.isConnected) return;

        try {
            this.producer = this.kafka.producer({
                maxInFlightRequests: 1,
                idempotent: false,
                transactionTimeout: 30000
            });

            await this.producer.connect();
            this.isConnected = true;
            console.log('[Kafka] Producer connected successfully');
            
        } catch (error) {
            console.warn('[Kafka] Producer connection failed:', error.message);
            this.isConnected = false;
        }
    }

    async publishTransaction(chainId: number, transaction: any): Promise<boolean> {
        if (!this.isConnected || !this.producer) return false;

        try {
            await this.producer.send({
                topic: `${this.topicsPrefix}.transactions`,
                messages: [{
                    key: `${chainId}:${transaction.hash}`,
                    value: JSON.stringify({
                        chainId,
                        timestamp: Date.now(),
                        ...transaction
                    })
                }]
            });
            return true;
            
        } catch (error) {
            console.warn('[Kafka] Publish failed:', error.message);
            return false;
        }
    }

    async publishBlockData(chainId: number, blockData: any): Promise<boolean> {
        if (!this.isConnected || !this.producer) return false;

        try {
            await this.producer.send({
                topic: `${this.topicsPrefix}.blocks`,
                messages: [{
                    key: `${chainId}:${blockData.number}`,
                    value: JSON.stringify({
                        chainId,
                        timestamp: Date.now(),
                        ...blockData
                    })
                }]
            });
            return true;
            
        } catch (error) {
            console.warn('[Kafka] Block publish failed:', error.message);
            return false;
        }
    }

    async publishEventLog(chainId: number, eventLog: any): Promise<boolean> {
        if (!this.isConnected || !this.producer) return false;

        try {
            await this.producer.send({
                topic: `${this.topicsPrefix}.events`,
                messages: [{
                    key: `${chainId}:${eventLog.transactionHash}:${eventLog.logIndex}`,
                    value: JSON.stringify({
                        chainId,
                        timestamp: Date.now(),
                        ...eventLog
                    })
                }]
            });
            return true;
            
        } catch (error) {
            console.warn('[Kafka] Event publish failed:', error.message);
            return false;
        }
    }

    isHealthy(): boolean {
        return this.isConnected;
    }

    async disconnect(): Promise<void> {
        if (this.producer) {
            await this.producer.disconnect();
            this.isConnected = false;
        }
    }
}

export const kafkaService = new KafkaService();
