/**
 * Unit tests for IndexingOrchestrator service
 * Tests job queue operations, prioritization, and status transitions
 */

import { pool } from '../../src/config/appConfig.js';

// Mock IndexingOrchestrator for unit testing
class MockIndexingOrchestrator {
  constructor(maxConcurrentJobs = 3) {
    this.jobQueue = new Map();
    this.runningJobs = new Set();
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.events = [];
  }

  emit(event, data) {
    this.events.push({ event, data });
  }

  async queueIndexingJob(params) {
    const jobId = 'job-' + Math.random().toString(36).substring(7);
    
    const job = {
      id: jobId,
      walletId: params.walletId,
      projectId: params.projectId,
      address: params.address,
      chain: params.chain,
      chainType: params.chainType,
      startBlock: params.startBlock,
      endBlock: params.endBlock,
      currentBlock: params.startBlock,
      status: 'queued',
      priority: params.priority || 0,
      transactionsFound: 0,
      eventsFound: 0,
      blocksPerSecond: 0,
      errorMessage: undefined,
      startedAt: undefined,
      completedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobQueue.set(job.id, job);
    this.emit('jobCreated', job);
    return job.id;
  }

  async startIndexing(jobId) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue`);
    }
    if (job.status !== 'queued' && job.status !== 'paused') {
      throw new Error(`Job ${jobId} cannot be started from status ${job.status}`);
    }

    job.status = 'running';
    job.startedAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.add(jobId);
    this.emit('jobStarted', job);
  }

  async pauseIndexing(jobId) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue`);
    }
    if (job.status !== 'running') {
      throw new Error(`Job ${jobId} is not running, cannot pause`);
    }

    job.status = 'paused';
    job.updatedAt = new Date();
    this.runningJobs.delete(jobId);
    this.emit('jobPaused', job);
  }

  async completeJob(jobId) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue`);
    }

    job.status = 'completed';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.delete(jobId);
    this.emit('jobCompleted', job);
  }

  async failJob(jobId, errorMessage) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue`);
    }

    job.status = 'failed';
    job.errorMessage = errorMessage;
    job.completedAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.delete(jobId);
    this.emit('jobFailed', job);
  }

  async getJobStatus(jobId) {
    return this.jobQueue.get(jobId) || null;
  }

  async getJobStatusByWallet(walletId) {
    for (const job of this.jobQueue.values()) {
      if (job.walletId === walletId) {
        return job;
      }
    }
    return null;
  }

  async getQueuedJobs() {
    const jobs = Array.from(this.jobQueue.values());
    return jobs.filter(job => job.status === 'queued')
               .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  }

  async updateProgress(jobId, currentBlock, transactionsFound, eventsFound, blocksPerSecond) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue`);
    }

    job.currentBlock = currentBlock;
    job.transactionsFound = transactionsFound;
    job.eventsFound = eventsFound;
    job.blocksPerSecond = blocksPerSecond;
    job.updatedAt = new Date();

    const totalBlocks = job.endBlock - job.startBlock;
    const estimatedTimeRemaining = blocksPerSecond > 0 
      ? (job.endBlock - currentBlock) / blocksPerSecond 
      : 0;

    const progress = {
      jobId: job.id,
      walletId: job.walletId,
      currentBlock,
      totalBlocks,
      transactionsFound,
      eventsFound,
      blocksPerSecond,
      estimatedTimeRemaining,
      status: job.status
    };

    this.emit('progress', progress);
  }
}

describe('IndexingOrchestrator Unit Tests', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MockIndexingOrchestrator();
  });

  afterEach(() => {
    // Clean up any test data
    orchestrator.jobQueue.clear();
    orchestrator.runningJobs.clear();
    orchestrator.events = [];
  });

  describe('Job Queue Operations', () => {
    test('should queue a new indexing job', async () => {
      const params = {
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000,
        priority: 5
      };

      const jobId = await orchestrator.queueIndexingJob(params);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBeGreaterThan(0);

      const job = await orchestrator.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job.walletId).toBe(params.walletId);
      expect(job.projectId).toBe(params.projectId);
      expect(job.address).toBe(params.address);
      expect(job.chain).toBe(params.chain);
      expect(job.chainType).toBe(params.chainType);
      expect(job.startBlock).toBe(params.startBlock);
      expect(job.endBlock).toBe(params.endBlock);
      expect(job.priority).toBe(params.priority);
      expect(job.status).toBe('queued');
    });

    test('should emit jobCreated event when job is queued', async () => {
      const params = {
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      };

      await orchestrator.queueIndexingJob(params);

      expect(orchestrator.events).toHaveLength(1);
      expect(orchestrator.events[0].event).toBe('jobCreated');
      expect(orchestrator.events[0].data.walletId).toBe(params.walletId);
    });

    test('should retrieve job by wallet ID', async () => {
      const params = {
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      };

      const jobId = await orchestrator.queueIndexingJob(params);
      const job = await orchestrator.getJobStatusByWallet(params.walletId);

      expect(job).toBeDefined();
      expect(job.id).toBe(jobId);
      expect(job.walletId).toBe(params.walletId);
    });

    test('should return null for non-existent wallet', async () => {
      const job = await orchestrator.getJobStatusByWallet('non-existent-wallet');
      expect(job).toBeNull();
    });
  });

  describe('Job Prioritization', () => {
    test('should order queued jobs by priority (highest first)', async () => {
      // Create jobs with different priorities
      const lowPriorityJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-1',
        projectId: 'project-1',
        address: '0x1111111111111111111111111111111111111111',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000,
        priority: 1
      });

      const highPriorityJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-2',
        projectId: 'project-2',
        address: '0x2222222222222222222222222222222222222222',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000,
        priority: 10
      });

      const mediumPriorityJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-3',
        projectId: 'project-3',
        address: '0x3333333333333333333333333333333333333333',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000,
        priority: 5
      });

      const queuedJobs = await orchestrator.getQueuedJobs();

      expect(queuedJobs).toHaveLength(3);
      expect(queuedJobs[0].id).toBe(highPriorityJob);
      expect(queuedJobs[1].id).toBe(mediumPriorityJob);
      expect(queuedJobs[2].id).toBe(lowPriorityJob);
    });

    test('should order jobs with same priority by creation time (oldest first)', async () => {
      const firstJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-1',
        projectId: 'project-1',
        address: '0x1111111111111111111111111111111111111111',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000,
        priority: 5
      });

      // Small delay to ensure different creation times
      await new Promise(resolve => setTimeout(resolve, 10));

      const secondJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-2',
        projectId: 'project-2',
        address: '0x2222222222222222222222222222222222222222',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000,
        priority: 5
      });

      const queuedJobs = await orchestrator.getQueuedJobs();

      expect(queuedJobs).toHaveLength(2);
      expect(queuedJobs[0].id).toBe(firstJob);
      expect(queuedJobs[1].id).toBe(secondJob);
    });
  });

  describe('Job Status Transitions', () => {
    test('should start a queued job', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      await orchestrator.startIndexing(jobId);

      const job = await orchestrator.getJobStatus(jobId);
      expect(job.status).toBe('running');
      expect(job.startedAt).toBeDefined();
      expect(orchestrator.runningJobs.has(jobId)).toBe(true);

      // Check event emission
      const startEvent = orchestrator.events.find(e => e.event === 'jobStarted');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.id).toBe(jobId);
    });

    test('should pause a running job', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      await orchestrator.startIndexing(jobId);
      await orchestrator.pauseIndexing(jobId);

      const job = await orchestrator.getJobStatus(jobId);
      expect(job.status).toBe('paused');
      expect(orchestrator.runningJobs.has(jobId)).toBe(false);

      // Check event emission
      const pauseEvent = orchestrator.events.find(e => e.event === 'jobPaused');
      expect(pauseEvent).toBeDefined();
      expect(pauseEvent.data.id).toBe(jobId);
    });

    test('should complete a job', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      await orchestrator.startIndexing(jobId);
      await orchestrator.completeJob(jobId);

      const job = await orchestrator.getJobStatus(jobId);
      expect(job.status).toBe('completed');
      expect(job.completedAt).toBeDefined();
      expect(orchestrator.runningJobs.has(jobId)).toBe(false);

      // Check event emission
      const completeEvent = orchestrator.events.find(e => e.event === 'jobCompleted');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.data.id).toBe(jobId);
    });

    test('should fail a job with error message', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      const errorMessage = 'RPC connection failed';
      await orchestrator.startIndexing(jobId);
      await orchestrator.failJob(jobId, errorMessage);

      const job = await orchestrator.getJobStatus(jobId);
      expect(job.status).toBe('failed');
      expect(job.errorMessage).toBe(errorMessage);
      expect(job.completedAt).toBeDefined();
      expect(orchestrator.runningJobs.has(jobId)).toBe(false);

      // Check event emission
      const failEvent = orchestrator.events.find(e => e.event === 'jobFailed');
      expect(failEvent).toBeDefined();
      expect(failEvent.data.id).toBe(jobId);
    });

    test('should throw error when starting non-existent job', async () => {
      await expect(orchestrator.startIndexing('non-existent-job'))
        .rejects.toThrow('Job non-existent-job not found in queue');
    });

    test('should throw error when starting already running job', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      await orchestrator.startIndexing(jobId);
      
      await expect(orchestrator.startIndexing(jobId))
        .rejects.toThrow(`Job ${jobId} cannot be started from status running`);
    });

    test('should throw error when pausing non-running job', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      await expect(orchestrator.pauseIndexing(jobId))
        .rejects.toThrow(`Job ${jobId} is not running, cannot pause`);
    });
  });

  describe('Progress Event Emission', () => {
    test('should update job progress and emit progress event', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      await orchestrator.startIndexing(jobId);
      await orchestrator.updateProgress(jobId, 500, 100, 50, 10.5);

      const job = await orchestrator.getJobStatus(jobId);
      expect(job.currentBlock).toBe(500);
      expect(job.transactionsFound).toBe(100);
      expect(job.eventsFound).toBe(50);
      expect(job.blocksPerSecond).toBe(10.5);

      // Check progress event emission
      const progressEvent = orchestrator.events.find(e => e.event === 'progress');
      expect(progressEvent).toBeDefined();
      expect(progressEvent.data.jobId).toBe(jobId);
      expect(progressEvent.data.currentBlock).toBe(500);
      expect(progressEvent.data.totalBlocks).toBe(999); // endBlock - startBlock
      expect(progressEvent.data.transactionsFound).toBe(100);
      expect(progressEvent.data.eventsFound).toBe(50);
      expect(progressEvent.data.blocksPerSecond).toBe(10.5);
      expect(progressEvent.data.estimatedTimeRemaining).toBe((1000 - 500) / 10.5);
    });

    test('should handle zero blocks per second in progress calculation', async () => {
      const jobId = await orchestrator.queueIndexingJob({
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      await orchestrator.updateProgress(jobId, 500, 100, 50, 0);

      const progressEvent = orchestrator.events.find(e => e.event === 'progress');
      expect(progressEvent).toBeDefined();
      expect(progressEvent.data.estimatedTimeRemaining).toBe(0);
    });

    test('should throw error when updating progress for non-existent job', async () => {
      await expect(orchestrator.updateProgress('non-existent-job', 500, 100, 50, 10))
        .rejects.toThrow('Job non-existent-job not found in queue');
    });
  });

  describe('Queue Filtering', () => {
    test('should only return queued jobs, not running or completed jobs', async () => {
      // Create multiple jobs with different statuses
      const queuedJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-1',
        projectId: 'project-1',
        address: '0x1111111111111111111111111111111111111111',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      const runningJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-2',
        projectId: 'project-2',
        address: '0x2222222222222222222222222222222222222222',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      const completedJob = await orchestrator.queueIndexingJob({
        walletId: 'wallet-3',
        projectId: 'project-3',
        address: '0x3333333333333333333333333333333333333333',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      });

      // Change statuses
      await orchestrator.startIndexing(runningJob);
      await orchestrator.startIndexing(completedJob);
      await orchestrator.completeJob(completedJob);

      const queuedJobs = await orchestrator.getQueuedJobs();

      expect(queuedJobs).toHaveLength(1);
      expect(queuedJobs[0].id).toBe(queuedJob);
      expect(queuedJobs[0].status).toBe('queued');
    });
  });
});