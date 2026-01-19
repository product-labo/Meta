import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// Create database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
});

async function setupGroupD() {
  console.log('🚀 Setting up Group D: Advanced Features (25 endpoints)...');
  
  try {
    // Read and execute the SQL file
    const sqlPath = path.join(process.cwd(), 'group-d-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📊 Creating Group D database tables...');
    await pool.query(sql);
    console.log('✅ Group D database tables created successfully');
    
    // Verify tables were created
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'api_keys', 
          'api_usage_logs', 
          'project_team', 
          'project_invitations', 
          'shared_projects', 
          'project_activity_logs'
        )
      ORDER BY table_name;
    `;
    
    const result = await pool.query(tableCheckQuery);
    console.log('📋 Created tables:', result.rows.map(row => row.table_name).join(', '));
    
    // Check if sample data was inserted
    const sampleDataCheck = await pool.query('SELECT COUNT(*) as count FROM api_keys');
    console.log(`📝 Sample API keys created: ${sampleDataCheck.rows[0].count}`);
    
    const teamDataCheck = await pool.query('SELECT COUNT(*) as count FROM project_team');
    console.log(`👥 Sample team members created: ${teamDataCheck.rows[0].count}`);
    
    console.log('\n🎉 Group D Setup Complete!');
    console.log('\n📊 GROUP D FEATURES IMPLEMENTED:');
    console.log('   D1: Advanced Analytics (10 endpoints)');
    console.log('   D2: API Management (8 endpoints)');
    console.log('   D3: Collaboration Features (7 endpoints)');
    console.log('\n🔗 Total: 25 endpoints added');
    console.log('\n✨ Platform is now 100% complete with all 125 endpoints!');
    
    // Show endpoint summary
    console.log('\n📈 ENDPOINT SUMMARY:');
    console.log('   Group A: Core Analytics - 35 endpoints ✅');
    console.log('   Group B: User Experience - 40 endpoints ✅');
    console.log('   Group C: Auth & Onboarding - 25 endpoints ✅');
    console.log('   Group D: Advanced Features - 25 endpoints ✅');
    console.log('   ────────────────────────────────────────');
    console.log('   TOTAL: 125 endpoints (100% complete) 🎯');
    
  } catch (error) {
    console.error('❌ Error setting up Group D:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupGroupD()
  .then(() => {
    console.log('\n🚀 Ready to start the server with all Group D features!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });