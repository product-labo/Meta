console.log('Hello from Node');
try {
    const { ethers } = require('ethers');
    console.log('Ethers loaded:', !!ethers);
    const { Pool } = require('pg');
    console.log('PG loaded:', !!Pool);
} catch (e) {
    console.error('Import failed:', e.message);
}
