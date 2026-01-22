import { getLatestStateSnapshot, insertStateSnapshot } from '../repositories/StateSnapshotRepository';
import { getAccountDeltas } from '../repositories/StateDeltaRepository';
import { getTokenBalance, upsertTokenBalance } from '../repositories/TokenBalanceRepository';

export class StateComputer {
  /**
   * Compute current account state by replaying deltas from last snapshot
   */
  async computeAccountState(
    address: string,
    module: string,
    target_height: number
  ): Promise<any> {
    // Get latest snapshot before target height
    const snapshot = await getLatestStateSnapshot(address, module);
    const start_height = snapshot ? snapshot.block_height : 0;
    
    // Get all deltas since snapshot
    const deltas = await getAccountDeltas(address, module);
    const relevantDeltas = deltas.filter(
      d => d.block_height > start_height && d.block_height <= target_height
    );
    
    // Start with snapshot state or empty
    let state = snapshot ? JSON.parse(snapshot.state_data) : {};
    
    // Apply deltas
    for (const delta of relevantDeltas) {
      const field = delta.field_path;
      const newValue = JSON.parse(delta.new_value);
      
      // Apply change
      if (field.includes('.')) {
        // Nested field
        const parts = field.split('.');
        let current = state;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = newValue;
      } else {
        // Top-level field
        state[field] = newValue;
      }
    }
    
    return state;
  }

  /**
   * Create state snapshot at specific height
   */
  async createSnapshot(
    address: string,
    module: string,
    block_height: number
  ): Promise<void> {
    const state = await this.computeAccountState(address, module, block_height);
    
    await insertStateSnapshot({
      address,
      block_height,
      module,
      state_data: state
    });
  }

  /**
   * Compute token balance from transaction history
   */
  async computeTokenBalance(
    address: string,
    token_id: string,
    up_to_height: number
  ): Promise<{ available: number; locked: number }> {
    const balance = await getTokenBalance(address, token_id);
    
    if (balance && balance.last_updated_height >= up_to_height) {
      return {
        available: balance.available_balance,
        locked: balance.locked_balance
      };
    }
    
    // Recompute from deltas if needed
    const deltas = await getAccountDeltas(address, 'token');
    let available = 0;
    let locked = 0;
    
    for (const delta of deltas) {
      if (delta.block_height > up_to_height) break;
      
      const change = JSON.parse(delta.new_value);
      if (change.change) {
        available += change.change;
      }
      if (change.locked_change) {
        locked += change.locked_change;
      }
    }
    
    return { available: Math.max(0, available), locked: Math.max(0, locked) };
  }
}

export const stateComputer = new StateComputer();
