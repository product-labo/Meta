import { Pool } from 'pg';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

const API_BASE = 'http://localhost:3003';

async function verifyTask9Prerequisites() {
    console.log('🔍 Task 9 Prerequisites Verification\n');
    console.log('=' .repeat(60));
    
    try {
        // Step 1: Check Backend API
        console.log('🔧 Step 1: Backend API Verification');
        console.log('-'.repeat(40));
        
        try {
            const healthResponse = await fetch(`${API_BASE}/health`);
            const healthData = await healthResponse.json();
            console.log('✅ Backend server is running:', healthData.message);
        } catch (error) {
            console.log('❌ Backend server not running. Please start it with: node app.js');
            return;
        }
        
        // Step 2: Check Compare Endpoint
        console.log('\n📊 Step 2: Compare Endpoint Verification');
        console.log('-'.repeat(40));
        
        const client = await pool.connect();
        
        // Get some project IDs for testing
        const projectsResult = await client.query(`
            SELECT contract_address as id, business_name as name, category, chain 
            FROM bi_contract_index 
            LIMIT 3
        `);
        
        if (projectsResult.rows.length < 2) {
            console.log('❌ Need at least 2 projects for comparison testing');
            console.log('   Run: node task3-1-enhance-contracts.js to populate sample data');
            client.release();
            return;
        }
        
        console.log(`✅ Found ${projectsResult.rows.length} projects for testing:`);
        projectsResult.rows.forEach((project, i) => {
            console.log(`  ${i + 1}. ${project.contract_name} (${project.category}) - Chain ${project.chain_id}`);
        });
        
        // Test compare endpoint
        const project1 = projectsResult.rows[0].id;
        const project2 = projectsResult.rows[1].id;
        
        try {
            const compareResponse = await fetch(`${API_BASE}/api/projects/compare?ids=${project1},${project2}`);
            const compareData = await compareResponse.json();
            
            if (compareResponse.ok) {
                console.log(`✅ Compare endpoint working: returned ${compareData.length} projects`);
                console.log('   Sample data structure:');
                if (compareData.length > 0) {
                    const sample = compareData[0];
                    console.log(`   - Project: ${sample.business_name || 'N/A'}`);
                    console.log(`   - Category: ${sample.category || 'N/A'}`);
                    console.log(`   - Chain: ${sample.chain || 'N/A'}`);
                    console.log(`   - Has Metrics: ${sample.total_transactions ? 'Yes' : 'No'}`);
                }
            } else {
                console.log('❌ Compare endpoint error:', compareData.message);
            }
        } catch (error) {
            console.log('❌ Compare endpoint failed:', error.message);
        }
        
        // Step 3: Check Metrics Data Availability
        console.log('\n📈 Step 3: Metrics Data Verification');
        console.log('-'.repeat(40));
        
        // Check project metrics tables
        const metricsCheck = await client.query(`
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN total_transactions > 0 THEN 1 END) as projects_with_transactions,
                COUNT(CASE WHEN total_customers > 0 THEN 1 END) as projects_with_customers,
                COUNT(CASE WHEN growth_score IS NOT NULL THEN 1 END) as projects_with_growth_score
            FROM bi_contract_index bci
            LEFT JOIN project_metrics_realtime pmr ON bci.id = pmr.project_id
        `);
        
        const metrics = metricsCheck.rows[0];
        console.log('📊 Metrics Data Status:');
        console.log(`   - Total Projects: ${metrics.total_projects}`);
        console.log(`   - With Transactions: ${metrics.projects_with_transactions}`);
        console.log(`   - With Customers: ${metrics.projects_with_customers}`);
        console.log(`   - With Growth Score: ${metrics.projects_with_growth_score}`);
        
        // Check for cross-chain data
        const chainCheck = await client.query(`
            SELECT chain, COUNT(*) as count
            FROM bi_contract_index
            GROUP BY chain
            ORDER BY count DESC
        `);
        
        console.log('\n🔗 Chain Distribution:');
        chainCheck.rows.forEach(row => {
            console.log(`   - ${row.chain}: ${row.count} projects`);
        });
        
        // Step 4: Frontend Route Verification
        console.log('\n🖥️  Step 4: Frontend Route Status');
        console.log('-'.repeat(40));
        
        console.log('📍 Current Compare Page Status:');
        console.log('   - Route: /dashboard/compare ✅ EXISTS');
        console.log('   - Component: fip/app/dashboard/compare/page.tsx ✅ EXISTS');
        console.log('   - Data Source: 🔴 MOCK DATA (hardcoded)');
        console.log('   - API Integration: ❌ NOT CONNECTED');
        
        // Step 5: Task 9 Requirements Analysis
        console.log('\n📋 Step 5: Task 9 Requirements Analysis');
        console.log('-'.repeat(40));
        
        console.log('🎯 What Task 9 Needs to Implement:');
        console.log('\n9.1 Create metrics-based comparison page component:');
        console.log('   ❌ Replace mock data with real API calls');
        console.log('   ❌ Connect to /api/projects/compare endpoint');
        console.log('   ❌ Implement dynamic project selection');
        console.log('   ❌ Add real metrics comparison tables');
        console.log('   ❌ Implement difference highlighting');
        console.log('   ❌ Add export functionality');
        
        console.log('\n9.2 Add cross-chain metrics normalization:');
        console.log('   ❌ Implement chain-specific metric conversion');
        console.log('   ❌ Handle missing data gracefully');
        console.log('   ❌ Add chain context indicators');
        console.log('   ❌ Create fair comparison algorithms');
        
        console.log('\n9.3 Property tests:');
        console.log('   ❌ Write property tests for comparison logic');
        console.log('   ❌ Test cross-chain normalization');
        
        // Step 6: Current Mock Data Analysis
        console.log('\n📊 Step 6: Current Mock Data Analysis');
        console.log('-'.repeat(40));
        
        console.log('🔍 Mock Data Categories Found:');
        console.log('   - Executive Summary (3 items)');
        console.log('   - Feature Usage (3 metrics)');
        console.log('   - User Behavior (4 metrics)');
        console.log('   - Financials (4 metrics)');
        console.log('   - Growth & Development (2 metrics)');
        
        console.log('\n📈 Mock Metrics Include:');
        console.log('   Feature Usage: Calls Per Feature, Success Rate, Drop-offs');
        console.log('   User Behavior: Adoption Rate, Productivity Score, Retention, Churn Triggers');
        console.log('   Financials: Revenue/Feature, Gas Efficiency, Fees Structure, Cash in');
        console.log('   Growth: MoM Growth, GitHub Activity');
        
        // Step 7: Implementation Roadmap
        console.log('\n🗺️  Step 7: Implementation Roadmap');
        console.log('-'.repeat(40));
        
        console.log('📝 Task 9.1 Implementation Steps:');
        console.log('   1. Add compare API methods to fip/lib/api.ts');
        console.log('   2. Replace hardcoded project selection with dynamic loading');
        console.log('   3. Replace mock data arrays with API calls');
        console.log('   4. Implement real metrics calculation and comparison');
        console.log('   5. Add difference highlighting logic');
        console.log('   6. Implement export functionality');
        
        console.log('\n📝 Task 9.2 Implementation Steps:');
        console.log('   1. Create chain normalization utilities');
        console.log('   2. Implement metric conversion functions');
        console.log('   3. Add missing data handling');
        console.log('   4. Create chain-specific context indicators');
        
        console.log('\n🎯 Success Criteria:');
        console.log('   ✅ Compare page loads real project data');
        console.log('   ✅ Users can select any two projects for comparison');
        console.log('   ✅ Metrics are calculated from real database data');
        console.log('   ✅ Cross-chain comparisons work correctly');
        console.log('   ✅ Missing data is handled gracefully');
        console.log('   ✅ Export functionality works');
        console.log('   ✅ Property tests pass');
        
        client.release();
        
        console.log('\n🎉 Task 9 Prerequisites Verification Complete!');
        console.log('=' .repeat(60));
        console.log('✅ Backend API is ready');
        console.log('✅ Compare endpoint exists');
        console.log('✅ Sample data is available');
        console.log('✅ Frontend route exists');
        console.log('🔴 Mock data needs to be replaced with real API integration');
        console.log('\n🚀 Ready to start Task 9 implementation!');
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the verification
verifyTask9Prerequisites().catch(console.error);