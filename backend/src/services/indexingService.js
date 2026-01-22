/**
 * Indexing Service
 * 
 * Integrates indexing workers with the orchestrator and WebSocket service
 * Manages the complete indexing workflow from job creation to completion
 */

import { indexingOrchestrator } from './indexingOrchestratorService.js';
import { EVMIndexerWorker } from './evmIndexerWorker.js';
import { StarknetIndexerWorker } from './starknetIndexerWorker.js';
import indexerWebSocketService from './indexerWebSocket.js';

class IndexingService {
  constructor() {
    this.workers = new Map(); // jobId -> worker instance
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for the orchestrator
   */
  setupEventListeners() {
    // Listen for new jobs and start indexing
    indexingOrchestrator.on('jobCreated', (job) => {
      this.startIndexingJob(job);
    });
  }

  /**
   * Start indexing for a job
   */
  async startIndexingJob(job) {
    try {
      console.log(`Starting indexing job ${job.id} for wallet ${job.walletId}`);

      // Update job status to running
      await indexingOrchestrator.startJob(job.id);

      // Create appropriate worker based on chain type
      let worker;
      if (job.chainType === 'starknet') {
        worker = new StarknetIndexerWorker();
      } else {
        // Default to EVM for all other chains
        worker = new EVMIndexerWorker();
      }

      this.workers.set(job.id, worker);

      // Set up progress callback
      const onProgress = (progressData) => {
        this.handleProgress(job.id, progressData);
      };

      // Start indexing
      const result = await worker.indexWallet(
        job.walletId,
        job.address,
        job.chain,
        job.chainType,
        job.startBlock,
        job.endBlock,
        onProgress
      );

      // Handle completion
      if (result.success) {
        await indexingOrchestrator.completeJob(job.id, {
          transactionsFound: result.transactionsFound,
          eventsFound: result.eventsFound,
          currentBlock: result.endBlock
        });
      } else {
        await indexingOrchestrator.failJob(job.id, result.error || 'Indexing failed');
      }

    } catch (error) {
      console.error(`Error in indexing job ${job.id}:`, error);
      await indexingOrchestrator.failJob(job.id, error.message);
    } finally {
      // Clean up worker
      this.workers.delete(job.id);
    }
  }

  /**
   * Handle progress updates from workers
   */
  async handleProgress(jobId, progressData) {
    try {
      // Update job progress in orchestrator
      await indexingOrchestrator.updateJobProgress(jobId, {
        currentBlock: progressData.currentBlock,
        transactionsFound: progressData.transactionsFound,
        eventsFound: progressData.eventsFound,
        blocksPerSecond: progressData.blocksPerSecond
      });

    } catch (error) {
      console.error(`Error handling progress for job ${jobId}:`, error);
    }
  }

  /**
   * Stop indexing job
   */
  async stopIndexingJob(jobId) {
    const worker = this.workers.get(jobId);
    if (worker && worker.stop) {
      worker.stop();
    }

    await indexingOrchestrator.pauseJob(jobId);
  }

  /**
   * Resume indexing job
   */
  async resumeIndexingJob(jobId) {
    const job = await indexingOrchestrator.getJobStatus(jobId);
    if (job && job.status === 'paused') {
      // Restart the job from where it left off
      job.startBlock = job.currentBlock + 1;
      await this.startIndexingJob(job);
    }
  }

  /**
   * Get active indexing jobs count
   */
  getActiveJobsCount() {
    return this.workers.size;
  }

  /**
   * Get worker for job
   */
  getWorker(jobId) {
    return this.workers.get(jobId);
  }
}

// Export singleton instance
export const indexingService = new IndexingService();