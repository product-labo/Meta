import { getBlockByHeight, deleteBlocksAboveHeight } from '../repositories/BlockRepository';
import { updateSyncState, getChainConfig } from '../repositories/ChainConfigRepository';
import { rpcClient } from '../rpc/LiskRPCClient';

export class ReorgHandler {
  private chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  /**
   * Detect and handle blockchain reorganizations
   */
  async detectAndHandleReorg(current_height: number): Promise<boolean> {
    const config = await getChainConfig(this.chainId);
    if (!config) return false;

    const reorg_depth = config.reorg_depth;
    const check_height = Math.max(0, current_height - reorg_depth);

    // Check blocks within reorg depth
    for (let height = check_height; height <= current_height; height++) {
      const dbBlock = await getBlockByHeight(this.chainId, height);
      if (!dbBlock) continue;

      const chainBlock = await rpcClient.getBlockByNumber(height, false);
      if (!chainBlock) continue;

      // Compare block hashes
      if (dbBlock.block_id !== chainBlock.hash) {
        console.log(`⚠️  REORG DETECTED at height ${height}`);
        console.log(`   DB block: ${dbBlock.block_id}`);
        console.log(`   Chain block: ${chainBlock.hash}`);
        
        await this.handleReorg(height);
        return true;
      }
    }

    return false;
  }

  /**
   * Handle reorg by deleting blocks above reorg point
   */
  private async handleReorg(reorg_height: number): Promise<void> {
    console.log(`🔄 Handling reorg from height ${reorg_height}`);
    
    // Delete all blocks above reorg point (CASCADE will delete related data)
    await deleteBlocksAboveHeight(this.chainId, reorg_height - 1);
    
    // Update sync state to reorg point
    await updateSyncState(this.chainId, reorg_height - 1);
    
    console.log(`✅ Reorg handled, rolled back to height ${reorg_height - 1}`);
  }

  /**
   * Verify chain continuity
   */
  async verifyChainContinuity(from_height: number, to_height: number): Promise<boolean> {
    for (let height = from_height + 1; height <= to_height; height++) {
      const block = await getBlockByHeight(this.chainId, height);
      const prevBlock = await getBlockByHeight(this.chainId, height - 1);
      
      if (!block || !prevBlock) return false;
      
      if (block.previous_block_id !== prevBlock.block_id) {
        console.log(`❌ Chain discontinuity at height ${height}`);
        return false;
      }
    }
    
    return true;
  }
}
