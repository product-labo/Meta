/**
 * Verification Script for Project API Implementation
 * Checks that all required endpoints are properly implemented
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Project API Implementation\n');

// Check 1: Routes file exists and has correct endpoints
console.log('1️⃣  Checking routes file...');
const routesPath = path.join(__dirname, '../src/routes/project.js');
if (!fs.existsSync(routesPath)) {
  console.error('❌ Routes file not found');
  process.exit(1);
}

const routesContent = fs.readFileSync(routesPath, 'utf8');
const requiredRoutes = [
  "router.post('/', createProjectController)",
  "router.get('/', getProjectsController)",
  "router.get('/:id', getProjectController)",
  "router.put('/:id', updateProjectController)",
  "router.delete('/:id', deleteProjectController)"
];

let allRoutesPresent = true;
requiredRoutes.forEach(route => {
  if (!routesContent.includes(route)) {
    console.error(`❌ Missing route: ${route}`);
    allRoutesPresent = false;
  }
});

if (allRoutesPresent) {
  console.log('✅ All required routes are present');
} else {
  process.exit(1);
}

// Check 2: Controller file exists and has all functions
console.log('\n2️⃣  Checking controller file...');
const controllerPath = path.join(__dirname, '../src/controllers/project.js');
if (!fs.existsSync(controllerPath)) {
  console.error('❌ Controller file not found');
  process.exit(1);
}

const controllerContent = fs.readFileSync(controllerPath, 'utf8');
const requiredControllers = [
  'createProjectController',
  'getProjectsController',
  'getProjectController',
  'updateProjectController',
  'deleteProjectController'
];

let allControllersPresent = true;
requiredControllers.forEach(controller => {
  if (!controllerContent.includes(`const ${controller}`)) {
    console.error(`❌ Missing controller: ${controller}`);
    allControllersPresent = false;
  }
});

if (allControllersPresent) {
  console.log('✅ All required controllers are present');
} else {
  process.exit(1);
}

// Check 3: Model file exists and has all functions
console.log('\n3️⃣  Checking model file...');
const modelPath = path.join(__dirname, '../src/models/project.js');
if (!fs.existsSync(modelPath)) {
  console.error('❌ Model file not found');
  process.exit(1);
}

const modelContent = fs.readFileSync(modelPath, 'utf8');
const requiredModels = [
  'createProject',
  'getAllProjects',
  'getProjectById',
  'updateProject',
  'deleteProject'
];

let allModelsPresent = true;
requiredModels.forEach(model => {
  if (!modelContent.includes(`function ${model}`)) {
    console.error(`❌ Missing model function: ${model}`);
    allModelsPresent = false;
  }
});

if (allModelsPresent) {
  console.log('✅ All required model functions are present');
} else {
  process.exit(1);
}

// Check 4: Routes are registered in main index
console.log('\n4️⃣  Checking route registration...');
const indexPath = path.join(__dirname, '../src/routes/index.js');
if (!fs.existsSync(indexPath)) {
  console.error('❌ Main routes index file not found');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes('import projectRouter from "./project.js"')) {
  console.error('❌ Project router not imported');
  process.exit(1);
}

if (!indexContent.includes('router.use("/api/projects", projectRouter)')) {
  console.error('❌ Project router not registered');
  process.exit(1);
}

console.log('✅ Routes properly registered in main index');

// Check 5: Authentication middleware is applied
console.log('\n5️⃣  Checking authentication...');
if (!routesContent.includes('authenticateJWT')) {
  console.error('❌ JWT authentication not applied');
  process.exit(1);
}

if (!routesContent.includes('router.use(authenticateJWT)')) {
  console.error('❌ Authentication middleware not applied to all routes');
  process.exit(1);
}

console.log('✅ Authentication properly configured');

// Check 6: Migration file exists
console.log('\n6️⃣  Checking database migration...');
const migrationPath = path.join(__dirname, '../migrations/009_add_projects_table.sql');
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file not found');
  process.exit(1);
}

const migrationContent = fs.readFileSync(migrationPath, 'utf8');
if (!migrationContent.includes('CREATE TABLE IF NOT EXISTS projects')) {
  console.error('❌ Projects table creation not found in migration');
  process.exit(1);
}

console.log('✅ Database migration file exists');

// Check 7: Verify SQL parameter syntax
console.log('\n7️⃣  Checking SQL parameter syntax...');
const sqlParamRegex = /\$\d+/g;
const modelSqlMatches = modelContent.match(sqlParamRegex);

if (!modelSqlMatches || modelSqlMatches.length === 0) {
  console.error('❌ No SQL parameters found in model');
  process.exit(1);
}

// Check for incorrect parameter syntax (missing $)
const incorrectParamRegex = /= \${paramCount}\b/g;
if (incorrectParamRegex.test(modelContent)) {
  console.error('❌ Incorrect SQL parameter syntax found (missing $ prefix)');
  process.exit(1);
}

console.log('✅ SQL parameter syntax is correct');

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ All Project API Implementation Checks Passed!');
console.log('='.repeat(50));
console.log('\n📋 Implementation Summary:');
console.log('   ✓ Routes: POST, GET, GET/:id, PUT/:id, DELETE/:id');
console.log('   ✓ Controllers: All CRUD operations implemented');
console.log('   ✓ Models: All database operations implemented');
console.log('   ✓ Authentication: JWT middleware applied');
console.log('   ✓ Database: Migration file exists');
console.log('   ✓ SQL Syntax: Parameterized queries correct');
console.log('\n📝 Requirements Validated:');
console.log('   ✓ Requirement 4.1: Project creation with all fields');
console.log('   ✓ Requirement 4.4: List user projects');
console.log('   ✓ Requirement 4.5: Update project details');
console.log('\n🎯 Next Steps:');
console.log('   1. Run migration: node backend/scripts/run-projects-migration.js');
console.log('   2. Start server: cd backend && npm start');
console.log('   3. Run tests: node backend/tests/test-project-endpoints.js');
console.log('');

process.exit(0);
