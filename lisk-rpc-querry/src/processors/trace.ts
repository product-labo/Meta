import { DatabaseManager } from '../database/manager';
import { RpcClient } from '../rpc/client';

export interface TraceCall {
  call_id?: number;
  tx_hash: string;
  parent_call_id: number | null;
  call_depth: number;
  call_type: string;
  from_address: string;
  to_address: string;
  value: string;
  gas_limit: number | null;
  gas_used: number | null;
  input_data: string;
  output_data: string;
  error: string | null;
}

export class TraceProcessor {
  constructor(private db: DatabaseManager, private rpc: RpcClient) {}

  async process(txHash: string): Promise<void> {
    try {
      const trace = await this.rpc.debugTraceTransaction(txHash);
      const calls = this.flattenTrace(trace, txHash);
      
      for (const call of calls) {
        await this.store(call);
      }
    } catch (error) {
      // Some transactions may not be traceable
      console.warn(`Failed to trace transaction ${txHash}:`, error);
    }
  }

  private flattenTrace(trace: any, txHash: string, parentId: number | null = null, depth: number = 0): TraceCall[] {
    const calls: TraceCall[] = [];
    
    if (!trace) return calls;

    const call: TraceCall = {
      tx_hash: txHash,
      parent_call_id: parentId,
      call_depth: depth,
      call_type: trace.type || 'CALL',
      from_address: trace.from?.toLowerCase() || '',
      to_address: trace.to?.toLowerCase() || '',
      value: trace.value || '0x0',
      gas_limit: trace.gas ? parseInt(trace.gas, 16) : null,
      gas_used: trace.gasUsed ? parseInt(trace.gasUsed, 16) : null,
      input_data: trace.input || '0x',
      output_data: trace.output || '0x',
      error: trace.error || null
    };

    calls.push(call);

    // Process subcalls
    if (trace.calls && Array.isArray(trace.calls)) {
      for (const subcall of trace.calls) {
        calls.push(...this.flattenTrace(subcall, txHash, calls.length, depth + 1));
      }
    }

    return calls;
  }

  private async store(call: TraceCall): Promise<void> {
    await this.db.query(`
      INSERT INTO execution_calls (
        tx_hash, parent_call_id, call_depth, call_type, from_address, to_address,
        value, gas_limit, gas_used, input_data, output_data, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      call.tx_hash, call.parent_call_id, call.call_depth, call.call_type,
      call.from_address, call.to_address, call.value, call.gas_limit,
      call.gas_used, call.input_data, call.output_data, call.error
    ]);
  }
}
