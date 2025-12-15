#!/usr/bin/env node

const { spawn } = require('child_process');
const ConnectionTester = require('./test-connections');

async function runSafe() {
    console.log('🔍 Pre-flight checks...\n');
    
    // Run connection tests first
    const tester = new ConnectionTester();
    await tester.runAllTests();
    const success = tester.printSummary();
    
    if (!success) {
        console.log('\n❌ Pre-flight checks failed. Aborting.');
        process.exit(1);
    }
    
    console.log('\n🚀 Starting Multi-Chain Indexer...\n');
    
    // Start the indexer
    const indexer = spawn('node', ['start-indexer.js'], {
        stdio: 'inherit',
        cwd: __dirname
    });
    
    indexer.on('close', (code) => {
        console.log(`\n📊 Indexer exited with code ${code}`);
        process.exit(code);
    });
    
    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down...');
        indexer.kill('SIGINT');
    });
}

runSafe().catch(error => {
    console.error('❌ Failed to start:', error.message);
    process.exit(1);
});
