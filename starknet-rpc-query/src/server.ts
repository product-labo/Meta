import express from 'express';
import { StarknetRPCQueryApp } from './app';
import { logger } from './utils/logger';

export class APIServer {
  private app: express.Application;
  private starknetApp: StarknetRPCQueryApp;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.starknetApp = new StarknetRPCQueryApp();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    const query = this.starknetApp.getQueryService();

    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Get block by number or hash
    this.app.get('/api/blocks/:identifier', async (req, res) => {
      try {
        const { identifier } = req.params;
        const block = await query.getBlock(identifier);
        
        if (!block) {
          return res.status(404).json({ error: 'Block not found' });
        }
        
        return res.json(block);
      } catch (error: any) {
        logger.error('Error fetching block:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get latest block
    this.app.get('/api/blocks', async (_req, res) => {
      try {
        const block = await query.getBlock('latest');
        return res.json(block);
      } catch (error: any) {
        logger.error('Error fetching latest block:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get transaction by hash
    this.app.get('/api/transactions/:txHash', async (req, res) => {
      try {
        const { txHash } = req.params;
        const transaction = await query.getTransaction(txHash);
        
        if (!transaction) {
          return res.status(404).json({ error: 'Transaction not found' });
        }
        
        return res.json(transaction);
      } catch (error: any) {
        logger.error('Error fetching transaction:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get transactions for a block
    this.app.get('/api/blocks/:blockNumber/transactions', async (req, res) => {
      try {
        const blockNumber = BigInt(req.params.blockNumber);
        const transactions = await query.getTransactions({ fromBlock: blockNumber, toBlock: blockNumber });
        return res.json(transactions);
      } catch (error: any) {
        logger.error('Error fetching block transactions:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get wallet interactions
    this.app.get('/api/wallets/:address/interactions', async (req, res) => {
      try {
        const { address } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;
        const interactions = await query.getWalletInteractions(address);
        return res.json(interactions);
      } catch (error: any) {
        logger.error('Error fetching wallet interactions:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get contract events
    this.app.get('/api/contracts/:address/events', async (req, res) => {
      try {
        const { address } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;
        const events = await query.getEventsByContract(address);
        return res.json(events);
      } catch (error: any) {
        logger.error('Error fetching contract events:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Start the Starknet indexing system
      await this.starknetApp.start();
      
      // Start the HTTP server
      this.app.listen(this.port, () => {
        logger.info(`API server running on port ${this.port}`);
        logger.info('Available endpoints:');
        logger.info('  GET /health - Health check');
        logger.info('  GET /api/blocks/latest - Get latest block');
        logger.info('  GET /api/blocks/:identifier - Get block by number or hash');
        logger.info('  GET /api/blocks/:blockNumber/transactions - Get block transactions');
        logger.info('  GET /api/transactions/:txHash - Get transaction by hash');
        logger.info('  GET /api/wallets/:address/interactions - Get wallet interactions');
        logger.info('  GET /api/contracts/:address/events - Get contract events');
      });
    } catch (error: any) {
      logger.error('Failed to start API server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.starknetApp.stop();
    logger.info('API server stopped');
  }
}

if (require.main === module) {
  const server = new APIServer(3000);
  
  process.on('SIGINT', async () => {
    logger.info('Shutting down API server...');
    await server.stop();
    process.exit(0);
  });

  server.start().catch((error) => {
    logger.error('API server failed:', error);
    process.exit(1);
  });
}
