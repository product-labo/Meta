import { LiskIndexer } from './services/LiskIndexer';

async function main() {
  const indexer = new LiskIndexer();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    indexer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    indexer.stop();
    process.exit(0);
  });

  // Start indexing
  await indexer.start();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
