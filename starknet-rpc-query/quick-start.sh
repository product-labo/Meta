#!/bin/bash
cd /mnt/c/pr0/meta/starknet-rpc-query

echo "🚀 Starting Starknet RPC Server (bypassing TypeScript errors)"
echo "============================================================"

# Skip build and run directly with ts-node --transpile-only
npx ts-node --transpile-only src/server.ts
