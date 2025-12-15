/**
 * Verify Project Management Setup
 * Checks that all components are properly configured
 */

import { pool } from '../src/config/appConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifySetup() {
  console.log('🔍 Verifying Project Management Setup\n');
  
  let allChecksPass = true;

  try {
    // Check 1: Verify database connection
    console.log('1️⃣  Checking database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Check 2: Verify projects table exists
    console.log('2️⃣  Checking if projects table exists...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'projects'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Projects table exists\n');
    } else {
      console.log('❌ Projects table does not exist');
      console.log('   Run: node scripts/run-projects-migration.js\n');
      allChecksPass = false;
    }

    // Check 3: Verify table structure
    if (tableCheck.rows.length > 0) {
      console.log('3️⃣  Checking projects table structure...');
      const columnsCheck = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'projects'
        ORDER BY ordinal_position
      `);
      
      const requiredColumns = ['id', 'user_id', 'name', 'description', 'category', 'status', 'created_at', 'updated_at'];
      const existingColumns = columnsCheck.rows.map(row => row.column_name);
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('✅ All required columns exist');
        console.log(`   Total columns: ${existingColumns.length}\n`);
      } else {
        console.log('❌ Missing columns:', missingColumns.join(', '));
        allChecksPass = false;
      }
    }

    // Check 4: Verify enums exist
    console.log('4️⃣  Checking project enums...');
    const enumCheck = await pool.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typname IN ('project_category', 'project_status')
    `);
    
    if (enumCheck.rows.length === 2) {
      console.log('✅ Project enums exist (project_category, project_status)\n');
    } else {
      console.log('❌ Project enums missing');
      allChecksPass = false;
    }

    // Check 5: Verify model file exists
    console.log('5️⃣  Checking project model file...');
    const modelPath = path.join(__dirname, '../src/models/project.js');
    if (fs.existsSync(modelPath)) {
      console.log('✅ Project model file exists\n');
    } else {
      console.log('❌ Project model file not found');
      allChecksPass = false;
    }

    // Check 6: Verify controller file exists
    console.log('6️⃣  Checking project controller file...');
    const controllerPath = path.join(__dirname, '../src/controllers/project.js');
    if (fs.existsSync(controllerPath)) {
      console.log('✅ Project controller file exists\n');
    } else {
      console.log('❌ Project controller file not found');
      allChecksPass = false;
    }

    // Check 7: Verify routes file exists
    console.log('7️⃣  Checking project routes file...');
    const routesPath = path.join(__dirname, '../src/routes/project.js');
    if (fs.existsSync(routesPath)) {
      console.log('✅ Project routes file exists\n');
    } else {
      console.log('❌ Project routes file not found');
      allChecksPass = false;
    }

    // Check 8: Verify routes are registered
    console.log('8️⃣  Checking if routes are registered...');
    const indexPath = path.join(__dirname, '../src/routes/index.js');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    if (indexContent.includes('projectRouter') || indexContent.includes('project.js')) {
      console.log('✅ Project routes are registered in main routes file\n');
    } else {
      console.log('⚠️  Project routes may not be registered in main routes file');
      console.log('   Check: backend/src/routes/index.js\n');
    }

    // Check 9: Test basic CRUD operations
    console.log('9️⃣  Testing basic database operations...');
    
    // Create a test user first
    const testEmail = `test-${Date.now()}@example.com`;
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['Test User', testEmail, 'hashed_password']
    );
    const testUserId = userResult.rows[0].id;
    
    // Test INSERT
    const insertResult = await pool.query(
      `INSERT INTO projects (user_id, name, description, category) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testUserId, 'Test Project', 'Test Description', 'defi']
    );
    const testProjectId = insertResult.rows[0].id;
    console.log('   ✓ INSERT operation successful');
    
    // Test SELECT
    const selectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [testProjectId]
    );
    if (selectResult.rows.length > 0) {
      console.log('   ✓ SELECT operation successful');
    }
    
    // Test UPDATE
    await pool.query(
      'UPDATE projects SET name = $1 WHERE id = $2',
      ['Updated Test Project', testProjectId]
    );
    console.log('   ✓ UPDATE operation successful');
    
    // Test DELETE
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    console.log('   ✓ DELETE operation successful');
    
    // Clean up test user
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    
    console.log('✅ All database operations working correctly\n');

    // Summary
    if (allChecksPass) {
      console.log('✅ All checks passed! Project management is properly set up.\n');
      console.log('📝 Next steps:');
      console.log('   1. Start the server: npm start');
      console.log('   2. Test endpoints: node tests/test-project-endpoints.js\n');
    } else {
      console.log('❌ Some checks failed. Please review the errors above.\n');
    }

    await pool.end();
    process.exit(allChecksPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

verifySetup();
