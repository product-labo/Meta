#!/bin/bash

echo "🚀 Starting continuous Starknet ingestion..."

while true; do
  echo "$(date): Running ingestion cycle..."
  
  # Run incremental ingestion
  cd /mnt/c/pr0/meta/starknet-rpc-query
  npx ts-node --transpile-only incremental-ingestion.ts
  
  # Wait 30 seconds before next cycle
  echo "$(date): Waiting 30 seconds..."
  sleep 30
done
