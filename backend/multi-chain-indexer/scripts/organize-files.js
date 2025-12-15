const fs = require('fs');
const path = require('path');

// Create organized folder structure
const folders = [
    'bin',           // Executable commands
    'lib',           // Core libraries
    'lib/cache',     // Caching system
    'lib/queue',     // Queue/Kafka system
    'config',        // Configuration files
    'scripts',       // Utility scripts
    'tests',         // All tests
    'docs',          // Documentation
    'tools'          // Development tools
];

console.log('🗂️  ORGANIZING MULTI-CHAIN INDEXER FILES');
console.log('=' .repeat(60));

// Create folders
folders.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✅ Created folder: ${folder}`);
    }
});

// File organization plan
const fileOrganization = {
    'bin/': [
        'start-indexer.js',
        'start-api.js', 
        'start-all.js',
        'query-business.js'
    ],
    'lib/': [
        'src/index.ts',
        'src/workers/',
        'src/services/'
    ],
    'lib/cache/': [
        'redis-cache.js',
        'memory-cache.js',
        'cache-manager.js'
    ],
    'lib/queue/': [
        'kafka-producer.js',
        'kafka-consumer.js',
        'queue-manager.js'
    ],
    'config/': [
        '.env.example',
        'chains.json',
        'cache.json',
        'kafka.json'
    ],
    'scripts/': [
        'data-analysis.js',
        'query-data.js',
        'fix-addresses.js',
        'check-addresses.js'
    ],
    'tests/': [
        'test-*.js'
    ],
    'docs/': [
        '*.md'
    ],
    'tools/': [
        'demo-*.js',
        'advanced-query.js'
    ]
};

console.log('\n📋 FILE ORGANIZATION PLAN:');
Object.entries(fileOrganization).forEach(([folder, files]) => {
    console.log(`\n${folder}`);
    files.forEach(file => {
        console.log(`  └── ${file}`);
    });
});

console.log('\n✅ Folder structure created!');
console.log('\n🔄 Next steps:');
console.log('   1. Move files to organized folders');
console.log('   2. Create unified command system');
console.log('   3. Implement caching layer');
console.log('   4. Add Kafka integration');