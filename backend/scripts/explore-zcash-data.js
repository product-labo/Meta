import pool from './src/db/db.js';

async function exploreZcashData() {
  console.log('🔍 Exploring Zcash Database...\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Connected to database at: ${connectionTest.rows[0].current_time}\n`);

    // List all tables in the database
    console.log('📋 Available tables:');
    const tablesResult = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('  ℹ️  No tables found in the database');
      return;
    }

    tablesResult.rows.forEach(table => {
      console.log(`  📊 ${table.table_name} (${table.table_type})`);
    });
    console.log();

    // Get table schemas and row counts
    console.log('📈 Table details:');
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      try {
        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const rowCount = countResult.rows[0].count;

        // Get column information
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tableName]);

        console.log(`  🗂️  ${tableName} (${rowCount} rows):`);
        columnsResult.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`    - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
        });
        console.log();

      } catch (error) {
        console.log(`  ❌ Error exploring ${tableName}: ${error.message}`);
      }
    }

    // Look for transaction-related tables specifically
    console.log('🔍 Looking for transaction data...');
    const transactionTables = tablesResult.rows.filter(table => 
      table.table_name.toLowerCase().includes('transaction') ||
      table.table_name.toLowerCase().includes('tx') ||
      table.table_name.toLowerCase().includes('block') ||
      table.table_name.toLowerCase().includes('address') ||
      table.table_name.toLowerCase().includes('zcash')
    );

    if (transactionTables.length > 0) {
      console.log('  📊 Transaction-related tables found:');
      for (const table of transactionTables) {
        const tableName = table.table_name;
        try {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const rowCount = countResult.rows[0].count;
          console.log(`    - ${tableName}: ${rowCount} rows`);

          // Show sample data if available
          if (rowCount > 0) {
            const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 3`);
            console.log(`      Sample data:`);
            sampleResult.rows.forEach((row, index) => {
              console.log(`        Row ${index + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}: ${row[key]}`).join(', '));
            });
          }
        } catch (error) {
          console.log(`    ❌ Error reading ${tableName}: ${error.message}`);
        }
      }
    } else {
      console.log('  ℹ️  No obvious transaction tables found');
    }
    console.log();

    // Check for any existing wallet analytics tables
    console.log('🔍 Checking for existing analytics tables...');
    const analyticsTables = tablesResult.rows.filter(table => 
      table.table_name.toLowerCase().includes('wallet') ||
      table.table_name.toLowerCase().includes('analytics') ||
      table.table_name.toLowerCase().includes('cohort') ||
      table.table_name.toLowerCase().includes('adoption')
    );

    if (analyticsTables.length > 0) {
      console.log('  📊 Analytics tables found:');
      analyticsTables.forEach(table => {
        console.log(`    - ${table.table_name}`);
      });
    } else {
      console.log('  ℹ️  No analytics tables found yet');
    }
    console.log();

    console.log('✅ Database exploration completed!');

  } catch (error) {
    console.error('❌ Database exploration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run exploration
exploreZcashData();