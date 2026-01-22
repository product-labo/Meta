import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';
import { indexingOrchestrator } from './indexingOrchestratorService.js';

/**
 * WebSocket server for real-time indexing progress updates
 * Provides authenticated connections per wallet with message queuing
 */
class IndexerWebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new Map(); // walletId -> Set of WebSocket connections
    this.messageQueues = new Map(); // walletId -> Array of queued messages
    this.heartbeatInterval = null;
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/indexing',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Set up heartbeat to detect broken connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    // Listen to indexing orchestrator events
    this.setupEventListeners();

    console.log('✅ Indexer WebSocket service initialized');
  }

  /**
   * Verify client connection with authentication
   * Expected URL format: /ws/indexing?token=JWT_TOKEN&walletId=WALLET_ID
   */
  verifyClient(info) {
    try {
      const query = url.parse(info.req.url, true).query;
      const token = query.token;
      const walletId = query.walletId;

      if (!token || !walletId) {
        console.log('WebSocket connection rejected: Missing token or walletId');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      // Store user info and walletId for later use
      info.req.user = decoded;
      info.req.walletId = walletId;

      return true;
    } catch (error) {
      console.log('WebSocket connection rejected: Invalid token', error.message);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const walletId = req.walletId;
    const user = req.user;

    console.log(`WebSocket connected for wallet ${walletId} by user ${user.id}`);

    // Initialize connection properties
    ws.isAlive = true;
    ws.walletId = walletId;
    ws.userId = user.id;

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Add connection to wallet's connection set
    if (!this.connections.has(walletId)) {
      this.connections.set(walletId, new Set());
    }
    this.connections.get(walletId).add(ws);

    // Send any queued messages for this wallet
    this.sendQueuedMessages(walletId, ws);

    // Handle connection close
    ws.on('close', () => {
      console.log(`WebSocket disconnected for wallet ${walletId}`);
      this.connections.get(walletId)?.delete(ws);
      
      // Clean up empty connection sets
      if (this.connections.get(walletId)?.size === 0) {
        this.connections.delete(walletId);
      }
    });

    // Handle client messages (for potential future use)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error.message);
      }
    });

    // Send initial status if available
    this.sendInitialStatus(ws, walletId);
  }

  /**
   * Handle messages from clients
   */
  handleClientMessage(ws, message) {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'requestStatus':
        this.sendInitialStatus(ws, ws.walletId);
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Send initial status for a wallet
   */
  async sendInitialStatus(ws, walletId) {
    try {
      const job = await indexingOrchestrator.getJobStatusByWallet(walletId);
      if (job) {
        const message = {
          type: 'status',
          data: {
            walletId: walletId,
            status: job.status,
            currentBlock: job.currentBlock,
            totalBlocks: job.endBlock - job.startBlock + 1,
            transactionsFound: job.transactionsFound,
            eventsFound: job.eventsFound,
            blocksPerSecond: job.blocksPerSecond,
            estimatedTimeRemaining: this.calculateETA(job),
            errorMessage: job.errorMessage
          }
        };
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending initial status:', error.message);
    }
  }

  /**
   * Set up event listeners for indexing orchestrator
   */
  setupEventListeners() {
    // Listen for job progress updates
    indexingOrchestrator.on('jobProgress', (job) => {
      this.broadcastProgress(job);
    });

    // Listen for job completion
    indexingOrchestrator.on('jobCompleted', (job) => {
      this.broadcastComplete(job);
    });

    // Listen for job errors
    indexingOrchestrator.on('jobError', (job) => {
      this.broadcastError(job);
    });

    // Listen for job status changes
    indexingOrchestrator.on('jobStatusChanged', (job) => {
      this.broadcastStatusChange(job);
    });
  }

  /**
   * Broadcast progress update to all connections for a wallet
   */
  broadcastProgress(job) {
    const message = {
      type: 'progress',
      data: {
        walletId: job.walletId,
        currentBlock: job.currentBlock,
        totalBlocks: job.endBlock - job.startBlock + 1,
        transactionsFound: job.transactionsFound,
        eventsFound: job.eventsFound,
        blocksPerSecond: job.blocksPerSecond,
        estimatedTimeRemaining: this.calculateETA(job),
        percentage: this.calculatePercentage(job)
      }
    };

    this.sendToWallet(job.walletId, message);
  }

  /**
   * Broadcast completion message
   */
  broadcastComplete(job) {
    const message = {
      type: 'complete',
      data: {
        walletId: job.walletId,
        totalTransactions: job.transactionsFound,
        totalEvents: job.eventsFound,
        completedAt: job.completedAt
      }
    };

    this.sendToWallet(job.walletId, message);
  }

  /**
   * Broadcast error message
   */
  broadcastError(job) {
    const message = {
      type: 'error',
      data: {
        walletId: job.walletId,
        errorMessage: job.errorMessage,
        currentBlock: job.currentBlock
      }
    };

    this.sendToWallet(job.walletId, message);
  }

  /**
   * Broadcast status change
   */
  broadcastStatusChange(job) {
    const message = {
      type: 'statusChange',
      data: {
        walletId: job.walletId,
        status: job.status,
        currentBlock: job.currentBlock
      }
    };

    this.sendToWallet(job.walletId, message);
  }

  /**
   * Send message to all connections for a specific wallet
   */
  sendToWallet(walletId, message) {
    const connections = this.connections.get(walletId);
    
    if (!connections || connections.size === 0) {
      // No active connections, queue the message
      this.queueMessage(walletId, message);
      return;
    }

    const messageStr = JSON.stringify(message);
    const deadConnections = new Set();

    connections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error sending WebSocket message:', error.message);
          deadConnections.add(ws);
        }
      } else {
        deadConnections.add(ws);
      }
    });

    // Clean up dead connections
    deadConnections.forEach((ws) => {
      connections.delete(ws);
    });

    // If no connections remain, queue the message
    if (connections.size === 0) {
      this.connections.delete(walletId);
      this.queueMessage(walletId, message);
    }
  }

  /**
   * Queue message for offline clients
   */
  queueMessage(walletId, message) {
    if (!this.messageQueues.has(walletId)) {
      this.messageQueues.set(walletId, []);
    }

    const queue = this.messageQueues.get(walletId);
    queue.push({
      ...message,
      timestamp: Date.now()
    });

    // Limit queue size to prevent memory issues (keep last 50 messages)
    if (queue.length > 50) {
      queue.splice(0, queue.length - 50);
    }
  }

  /**
   * Send queued messages to a newly connected client
   */
  sendQueuedMessages(walletId, ws) {
    const queue = this.messageQueues.get(walletId);
    if (!queue || queue.length === 0) {
      return;
    }

    // Send all queued messages
    queue.forEach((message) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending queued message:', error.message);
        }
      }
    });

    // Clear the queue after sending
    this.messageQueues.delete(walletId);
  }

  /**
   * Calculate estimated time remaining
   */
  calculateETA(job) {
    if (job.blocksPerSecond <= 0) {
      return 0;
    }

    const remainingBlocks = job.endBlock - job.currentBlock;
    return Math.ceil(remainingBlocks / job.blocksPerSecond);
  }

  /**
   * Calculate completion percentage
   */
  calculatePercentage(job) {
    const totalBlocks = job.endBlock - job.startBlock + 1;
    const processedBlocks = job.currentBlock - job.startBlock + 1;
    return Math.min(100, Math.max(0, (processedBlocks / totalBlocks) * 100));
  }

  /**
   * Get connection count for a wallet
   */
  getConnectionCount(walletId) {
    return this.connections.get(walletId)?.size || 0;
  }

  /**
   * Get total connection count
   */
  getTotalConnections() {
    let total = 0;
    this.connections.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    console.log('WebSocket server shut down');
  }
}

// Export both class and singleton instance
export { IndexerWebSocketService };
export default new IndexerWebSocketService();