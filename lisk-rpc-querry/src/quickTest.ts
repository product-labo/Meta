import { LiskIndexer } from './services/LiskIndexer';

async function quickTest() {
  console.log('🚀 Quick Indexer Test\n');
  
  const indexer = new LiskIndexer();
  
  try {
    await indexer.initialize();
    console.log('✅ Initialized\n');
    
    // Index 5 blocks starting from 26839000
    console.log('Indexing 5 blocks...\n');
    for (let i = 26839000; i <= 26839004; i++) {
      console.log(`Block ${i}...`);
      await indexer.indexBlock(i);
    }
    
    console.log('\n✅ Done! Check database.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

quickTest();
