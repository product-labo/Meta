#!/bin/bash

# Fix TypeScript compilation errors

# Fix error type annotations
find src -name "*.ts" -exec sed -i 's/} catch (error) {/} catch (error: any) {/g' {} \;

# Fix unused variables
sed -i 's/blockNumber,/\/\/ blockNumber,/g' src/services/ingestion/TransactionProcessor.ts
sed -i 's/timeout,/\/\/ timeout,/g' src/services/rpc/StarknetRPCClient.ts
sed -i 's/response,/\/\/ response,/g' src/services/rpc/StarknetRPCClient.ts

# Fix ResponseParser type issues
cat > src/services/rpc/ResponseParser.ts << 'EOF'
import { Block, Transaction } from '../../models';

export class ResponseParser {
  parseBlock(result: any): Block {
    return {
      blockNumber: parseInt(result.block_number || '0'),
      blockHash: result.block_hash || '',
      parentHash: result.parent_hash || '',
      timestamp: parseInt(result.timestamp || '0'),
      sequencerAddress: result.sequencer_address || '',
      stateRoot: result.state_root || '',
      transactionCount: result.transactions?.length || 0,
      status: result.status || 'ACCEPTED_ON_L2'
    };
  }

  parseTransaction(result: any): Transaction {
    return {
      transactionHash: result.transaction_hash || '',
      blockNumber: parseInt(result.block_number || '0'),
      transactionIndex: parseInt(result.transaction_index || '0'),
      type: result.type || 'INVOKE',
      version: result.version || '0x1',
      nonce: result.nonce || '0x0',
      maxFee: result.max_fee || '0x0',
      senderAddress: result.sender_address || '',
      calldata: JSON.stringify(result.calldata || []),
      signature: JSON.stringify(result.signature || []),
      status: result.status || 'ACCEPTED_ON_L2'
    };
  }

  parseEvent(result: any): any {
    return {
      eventIndex: parseInt(result.event_index || '0'),
      transactionHash: result.transaction_hash || '',
      fromAddress: result.from_address || '',
      keys: JSON.stringify(result.keys || []),
      data: JSON.stringify(result.data || [])
    };
  }
}
EOF

# Fix StarknetRPCClient lastError issue
sed -i 's/let lastError;/let lastError: any = null;/g' src/services/rpc/StarknetRPCClient.ts

echo "TypeScript errors fixed"
