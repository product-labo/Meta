import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/metagauge'
});

async function checkTables() {
  try {
    console.log('Checking available tables...');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%metric%' OR table_name LIKE '%transaction%' OR table_name LIKE '%project%')
      ORDER BY table_name
    `);
    
    console.log('Available analytics tables:');
    result.rows.forEach(row => console.log('- ' + row.table_name));
    
    // Check if key tables exist and have data
    const tables = ['mc_transaction_details', 'project_metrics_realtime', 'wallet_metrics_realtime', 'projects'];
    
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`${table}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`${table}: Table does not exist`);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();