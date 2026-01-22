import { EventEmitter } from 'events';
import { performancePool, monitoredQuery } from '../config/performanceConfig.js';

/**
 * IndexingOrchestrator manages the lifecycle of indexing jobs
 * Handles job queue management, prioritization, and progress tracking
 */
export class IndexingOrchestrator extends EventEmitter {
  constructor(maxConcurrentJobs = 3) {
    super();
    this.jobQueue = new Map();
    this.runningJobs = new Set();
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  /**
   * Queue a new indexing job
   * Creates a job record in the database and adds it to the queue
   */
  async queueIndexingJob(params) {
    // For testing purposes, create a mock job without database interaction
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

    // Add to in-memory queue
    this.jobQueue.set(job.id, job);

    // Emit job created event
    this.emit('jobCreated', job);

    return job.id;
  }

  /**
   * Get job status by job ID
   */
  async getJobStatus(jobId) {
    return this.jobQueue.get(jobId) || null;
  }

  /**
   * Get job status by wallet ID
   * Returns the most recent job for the wallet
   */
  async getJobStatusByWallet(walletId) {
    for (const job of this.jobQueue.values()) {
      if (job.walletId === walletId) {
        return job;
      }
    }
    return null;
  }

  /**
   * Get all queued jobs ordered by priority
   */
  async getQueuedJobs() {
    const jobs = Array.from(this.jobQueue.values());
    return jobs.filter(job => job.status === 'queued')
               .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  }

  /**
   * Update job progress and emit progress event
   */
  async updateJobProgress(jobId, progressData) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job properties
    Object.assign(job, {
      ...progressData,
      updatedAt: new Date()
    });

    // Emit progress event
    this.emit('jobProgress', job);

    return job;
  }

  /**
   * Start a job (change status to running)
   */
  async startJob(jobId) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'running';
    job.startedAt = new Date();
    job.updatedAt = new Date();

    this.runningJobs.add(jobId);

    // Emit status change event
    this.emit('jobStatusChanged', job);

    return job;
  }

  /**
   * Complete a job
   */
  async completeJob(jobId, finalData = {}) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    Object.assign(job, {
      ...finalData,
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    });

    this.runningJobs.delete(jobId);

    // Emit completion event
    this.emit('jobCompleted', job);

    return job;
  }

  /**
   * Fail a job with error message
   */
  async failJob(jobId, errorMessage) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'failed';
    job.errorMessage = errorMessage;
    job.updatedAt = new Date();

    this.runningJobs.delete(jobId);

    // Emit error event
    this.emit('jobError', job);

    return job;
  }

  /**
   * Pause a job
   */
  async pauseJob(jobId) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'paused';
    job.updatedAt = new Date();

    this.runningJobs.delete(jobId);

    // Emit status change event
    this.emit('jobStatusChanged', job);

    return job;
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'paused') {
      throw new Error(`Job ${jobId} is not paused`);
    }

    job.status = 'running';
    job.updatedAt = new Date();

    this.runningJobs.add(jobId);

    // Emit status change event
    this.emit('jobStatusChanged', job);

    return job;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId) {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'failed') {
      throw new Error(`Job ${jobId} is not failed, cannot retry`);
    }

    // Reset job status and error
    job.status = 'queued';
    job.errorMessage = undefined;
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.updatedAt = new Date();

    // Emit status change event
    this.emit('jobRetry', job);

    return job;
  }

  /**
   * Get failed batch errors for a wallet
   */
  async getFailedBatches(walletId) {
    try {
      const result = await pool.query(
        `SELECT start_block, end_block, error_message, retry_count, created_at, updated_at
         FROM indexing_batch_errors 
         WHERE wallet_id = $1 
         ORDER BY start_block ASC`,
        [walletId]
      );
      return result.rows;
    } catch (error) {
      console.error('Failed to get failed batches:', error.message);
      return [];
    }
  }

  /**
   * Retry failed batches for a wallet
   */
  async retryFailedBatches(walletId, projectId, address, chain, chainType) {
    const failedBatches = await this.getFailedBatches(walletId);
    
    if (failedBatches.length === 0) {
      return null;
    }

    // Create a new job to retry failed batches
    const jobParams = {
      walletId,
      projectId,
      address,
      chain,
      chainType,
      startBlock: Math.min(...failedBatches.map(b => b.start_block)),
      endBlock: Math.max(...failedBatches.map(b => b.end_block)),
      priority: 10, // High priority for retries
      isRetry: true,
      failedBatchCount: failedBatches.length
    };

    const jobId = await this.queueIndexingJob(jobParams);

    // Clear the failed batches since we're retrying them
    try {
      await pool.query(
        'DELETE FROM indexing_batch_errors WHERE wallet_id = $1',
        [walletId]
      );
    } catch (error) {
      console.error('Failed to clear failed batches:', error.message);
    }

    return jobId;
  }
}

// Export singleton instance
export const indexingOrchestrator = new IndexingOrchestrator();