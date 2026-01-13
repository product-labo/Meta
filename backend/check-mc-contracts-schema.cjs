const { pool } = require('./src/config/database.ts');

async function checkSchema() {
  try {
    console.log('Checking mc_contracts table schema...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mc_contracts' 
      ORDER BY ordinal_position
    `);
    
    console.log('mc_contracts table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    // Also check a sample row
    const sampleResult = await pool.query('SELECT * FROM mc_contracts LIMIT 1');
    console.log('\nSample row keys:', Object.keys(sampleResult.rows[0] || {}));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();