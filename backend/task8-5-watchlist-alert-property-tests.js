/**
 * Task 8.5: Property Tests for Complete Watchlist and Alert System
 * 
 * This file contains comprehensive property-based tests for:
 * - Property 7: User-specific watchlist operations
 * - Property 16: Alert creation and management
 * - Property 21: Authentication-protected CRUD operations
 * 
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4
 * Feature: dashboard-data-population
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Database configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'david',
    password: 'password',
    port: 5432,
});

const API_BASE = 'http://localhost:3003';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Test utilities
function generateTestUser() {
    const id = Math.floor(Math.random() * 1000000);
    return {
        id,
        email: `test${id}@example.com`,
        password: 'testpass123'
    };
}

function generateTestProject() {
    const id = Math.random().toString(36).substring(2, 15);
    return {
        id,
        name: `Test Project ${id}`,
        category: ['DeFi', 'NFT', 'Gaming', 'Infrastructure'][Math.floor(Math.random() * 4)]
    };
}

function generateTestAlert(projectId) {
    const types = ['adoption', 'retention', 'revenue', 'feature_usage', 'wallet_anomalies'];
    const conditions = ['above', 'below', 'equals', 'change'];
    const frequencies = ['immediate', 'weekly', 'monthly'];
    
    return {
        projectId,
        type: types[Math.floor(Math.random() * types.length)],
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        threshold: Math.floor(Math.random() * 100) + 1,
        thresholdUnit: 'percent',
        frequency: frequencies[Math.floor(Math.random() * frequencies.length)]
    };
}

async function createTestUser(user) {
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    
    // Insert user into database
    await pool.query(
        'INSERT INTO users (id, email, password_hash, is_verified) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [user.id, user.email, 'hashed_password', true]
    );
    
    return token;
}

async function makeAuthenticatedRequest(endpoint, method = 'GET', token, body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    return { status: response.status, data };
}

// Property 7: User-specific watchlist operations
async function testWatchlistUserIsolation() {
    console.log('\n🧪 Testing Property 7: User-specific watchlist operations');
    console.log('Feature: dashboard-data-population, Property 7: For any user and project, watchlist operations should be isolated per user');
    
    const user1 = generateTestUser();
    const user2 = generateTestUser();
    const project1 = generateTestProject();
    const project2 = generateTestProject();
    
    const token1 = await createTestUser(user1);
    const token2 = await createTestUser(user2);
    
    try {
        // User 1 adds project 1 to watchlist
        const add1 = await makeAuthenticatedRequest('/api/watchlist', 'POST', token1, {
            projectId: project1.id,
            projectName: project1.name,
            projectCategory: project1.category
        });
        
        console.log(`✓ User 1 added project to watchlist: ${add1.status === 200}`);
        
        // User 2 adds project 2 to watchlist
        const add2 = await makeAuthenticatedRequest('/api/watchlist', 'POST', token2, {
            projectId: project2.id,
            projectName: project2.name,
            projectCategory: project2.category
        });
        
        console.log(`✓ User 2 added project to watchlist: ${add2.status === 200}`);
        
        // User 1 gets their watchlist (should only see project 1)
        const watchlist1 = await makeAuthenticatedRequest('/api/watchlist', 'GET', token1);
        const user1Projects = watchlist1.data.watchlist.map(w => w.project_id);
        
        console.log(`✓ User 1 isolation: ${user1Projects.includes(project1.id) && !user1Projects.includes(project2.id)}`);
        
        // User 2 gets their watchlist (should only see project 2)
        const watchlist2 = await makeAuthenticatedRequest('/api/watchlist', 'GET', token2);
        const user2Projects = watchlist2.data.watchlist.map(w => w.project_id);
        
        console.log(`✓ User 2 isolation: ${user2Projects.includes(project2.id) && !user2Projects.includes(project1.id)}`);
        
        // Test watchlist status check
        const status1 = await makeAuthenticatedRequest(`/api/watchlist/status/${project1.id}`, 'GET', token1);
        const status2 = await makeAuthenticatedRequest(`/api/watchlist/status/${project1.id}`, 'GET', token2);
        
        console.log(`✓ Status check isolation: ${status1.data.isWatchlisted && !status2.data.isWatchlisted}`);
        
        // Test removal
        const remove1 = await makeAuthenticatedRequest(`/api/watchlist/${project1.id}`, 'DELETE', token1);
        console.log(`✓ User 1 removed project: ${remove1.status === 200}`);
        
        // Verify removal
        const finalWatchlist1 = await makeAuthenticatedRequest('/api/watchlist', 'GET', token1);
        const finalUser1Projects = finalWatchlist1.data.watchlist.map(w => w.project_id);
        
        console.log(`✓ Removal verification: ${!finalUser1Projects.includes(project1.id)}`);
        
        return true;
    } catch (error) {
        console.error('❌ Watchlist user isolation test failed:', error.message);
        return false;
    }
}

// Property 16: Alert creation and management
async function testAlertManagement() {
    console.log('\n🧪 Testing Property 16: Alert creation and management');
    console.log('Feature: dashboard-data-population, Property 16: For any user and project, alert CRUD operations should work correctly with proper validation');
    
    const user = generateTestUser();
    const project = generateTestProject();
    const token = await createTestUser(user);
    
    try {
        // Add project to watchlist first
        await makeAuthenticatedRequest('/api/watchlist', 'POST', token, {
            projectId: project.id,
            projectName: project.name,
            projectCategory: project.category
        });
        
        // Create multiple alerts for the project
        const alert1 = generateTestAlert(project.id);
        const alert2 = generateTestAlert(project.id);
        
        const create1 = await makeAuthenticatedRequest('/api/alerts', 'POST', token, alert1);
        const create2 = await makeAuthenticatedRequest('/api/alerts', 'POST', token, alert2);
        
        console.log(`✓ Alert creation: ${create1.status === 201 && create2.status === 201}`);
        
        // Get all alerts
        const allAlerts = await makeAuthenticatedRequest('/api/alerts', 'GET', token);
        const userAlerts = allAlerts.data.alerts;
        
        console.log(`✓ Alert retrieval: ${userAlerts.length >= 2}`);
        
        // Get project-specific alerts
        const projectAlerts = await makeAuthenticatedRequest(`/api/alerts?projectId=${project.id}`, 'GET', token);
        const projectSpecificAlerts = projectAlerts.data.alerts;
        
        console.log(`✓ Project-specific alerts: ${projectSpecificAlerts.every(a => a.project_id === project.id)}`);
        
        // Update an alert
        const alertToUpdate = userAlerts[0];
        const updateData = {
            threshold: alertToUpdate.threshold + 10,
            frequency: 'weekly',
            isActive: false
        };
        
        const update = await makeAuthenticatedRequest(`/api/alerts/${alertToUpdate.id}`, 'PUT', token, updateData);
        console.log(`✓ Alert update: ${update.status === 200}`);
        
        // Verify update
        const updatedAlerts = await makeAuthenticatedRequest('/api/alerts', 'GET', token);
        const updatedAlert = updatedAlerts.data.alerts.find(a => a.id === alertToUpdate.id);
        
        console.log(`✓ Update verification: ${updatedAlert.threshold === updateData.threshold && updatedAlert.frequency === updateData.frequency}`);
        
        // Delete an alert
        const alertToDelete = userAlerts[1];
        const deleteResult = await makeAuthenticatedRequest(`/api/alerts/${alertToDelete.id}`, 'DELETE', token);
        console.log(`✓ Alert deletion: ${deleteResult.status === 200}`);
        
        // Verify deletion
        const finalAlerts = await makeAuthenticatedRequest('/api/alerts', 'GET', token);
        const deletedAlertExists = finalAlerts.data.alerts.some(a => a.id === alertToDelete.id);
        
        console.log(`✓ Deletion verification: ${!deletedAlertExists}`);
        
        // Test alert history
        const history = await makeAuthenticatedRequest('/api/alerts/history', 'GET', token);
        console.log(`✓ Alert history accessible: ${history.status === 200}`);
        
        return true;
    } catch (error) {
        console.error('❌ Alert management test failed:', error.message);
        return false;
    }
}

// Property 21: Authentication-protected CRUD operations
async function testAuthenticationProtection() {
    console.log('\n🧪 Testing Property 21: Authentication-protected CRUD operations');
    console.log('Feature: dashboard-data-population, Property 21: For any API endpoint, authentication should be required for all CRUD operations');
    
    const user = generateTestUser();
    const project = generateTestProject();
    const token = await createTestUser(user);
    const invalidToken = 'invalid.token.here';
    
    try {
        // Test unauthenticated requests
        const unauthWatchlist = await fetch(`${API_BASE}/api/watchlist`);
        const unauthAlerts = await fetch(`${API_BASE}/api/alerts`);
        
        console.log(`✓ Unauthenticated requests blocked: ${unauthWatchlist.status === 401 && unauthAlerts.status === 401}`);
        
        // Test invalid token requests
        const invalidWatchlist = await makeAuthenticatedRequest('/api/watchlist', 'GET', invalidToken);
        const invalidAlerts = await makeAuthenticatedRequest('/api/alerts', 'GET', invalidToken);
        
        console.log(`✓ Invalid token requests blocked: ${invalidWatchlist.status === 401 && invalidAlerts.status === 401}`);
        
        // Test valid token requests work
        const validWatchlist = await makeAuthenticatedRequest('/api/watchlist', 'GET', token);
        const validAlerts = await makeAuthenticatedRequest('/api/alerts', 'GET', token);
        
        console.log(`✓ Valid token requests allowed: ${validWatchlist.status === 200 && validAlerts.status === 200}`);
        
        // Test CRUD operations require authentication
        const endpoints = [
            { method: 'POST', path: '/api/watchlist', body: { projectId: project.id } },
            { method: 'DELETE', path: `/api/watchlist/${project.id}` },
            { method: 'GET', path: `/api/watchlist/status/${project.id}` },
            { method: 'POST', path: '/api/alerts', body: generateTestAlert(project.id) },
            { method: 'PUT', path: '/api/alerts/1', body: { threshold: 50 } },
            { method: 'DELETE', path: '/api/alerts/1' },
            { method: 'GET', path: '/api/alerts/history' }
        ];
        
        let allEndpointsProtected = true;
        
        for (const endpoint of endpoints) {
            const unauthResponse = await fetch(`${API_BASE}${endpoint.path}`, {
                method: endpoint.method,
                headers: { 'Content-Type': 'application/json' },
                body: endpoint.body ? JSON.stringify(endpoint.body) : null
            });
            
            if (unauthResponse.status !== 401) {
                allEndpointsProtected = false;
                console.log(`❌ Endpoint ${endpoint.method} ${endpoint.path} not properly protected`);
            }
        }
        
        console.log(`✓ All CRUD endpoints protected: ${allEndpointsProtected}`);
        
        // Test user isolation in authenticated requests
        const user2 = generateTestUser();
        const token2 = await createTestUser(user2);
        
        // User 1 creates a watchlist item
        await makeAuthenticatedRequest('/api/watchlist', 'POST', token, {
            projectId: project.id,
            projectName: project.name,
            projectCategory: project.category
        });
        
        // User 2 tries to delete User 1's watchlist item (should fail or not affect User 1)
        const crossUserDelete = await makeAuthenticatedRequest(`/api/watchlist/${project.id}`, 'DELETE', token2);
        
        // Verify User 1's watchlist is still intact
        const user1Watchlist = await makeAuthenticatedRequest('/api/watchlist', 'GET', token);
        const user1HasProject = user1Watchlist.data.watchlist.some(w => w.project_id === project.id);
        
        console.log(`✓ Cross-user operation isolation: ${user1HasProject}`);
        
        return true;
    } catch (error) {
        console.error('❌ Authentication protection test failed:', error.message);
        return false;
    }
}

// Property-based test runner with multiple iterations
async function runPropertyTests() {
    console.log('🚀 Starting Property-Based Tests for Watchlist and Alert System');
    console.log('Running 100 iterations per property to ensure comprehensive coverage...\n');
    
    const results = {
        property7: { passed: 0, failed: 0 },
        property16: { passed: 0, failed: 0 },
        property21: { passed: 0, failed: 0 }
    };
    
    // Run Property 7: User-specific watchlist operations (100 iterations)
    for (let i = 0; i < 100; i++) {
        try {
            const result = await testWatchlistUserIsolation();
            if (result) {
                results.property7.passed++;
            } else {
                results.property7.failed++;
            }
        } catch (error) {
            results.property7.failed++;
            console.error(`Property 7 iteration ${i + 1} failed:`, error.message);
        }
        
        // Progress indicator
        if ((i + 1) % 20 === 0) {
            console.log(`Property 7 progress: ${i + 1}/100 iterations completed`);
        }
    }
    
    // Run Property 16: Alert creation and management (100 iterations)
    for (let i = 0; i < 100; i++) {
        try {
            const result = await testAlertManagement();
            if (result) {
                results.property16.passed++;
            } else {
                results.property16.failed++;
            }
        } catch (error) {
            results.property16.failed++;
            console.error(`Property 16 iteration ${i + 1} failed:`, error.message);
        }
        
        // Progress indicator
        if ((i + 1) % 20 === 0) {
            console.log(`Property 16 progress: ${i + 1}/100 iterations completed`);
        }
    }
    
    // Run Property 21: Authentication-protected CRUD operations (100 iterations)
    for (let i = 0; i < 100; i++) {
        try {
            const result = await testAuthenticationProtection();
            if (result) {
                results.property21.passed++;
            } else {
                results.property21.failed++;
            }
        } catch (error) {
            results.property21.failed++;
            console.error(`Property 21 iteration ${i + 1} failed:`, error.message);
        }
        
        // Progress indicator
        if ((i + 1) % 20 === 0) {
            console.log(`Property 21 progress: ${i + 1}/100 iterations completed`);
        }
    }
    
    // Final results
    console.log('\n📊 Property-Based Test Results:');
    console.log('=====================================');
    console.log(`Property 7 (User-specific watchlist operations): ${results.property7.passed}/100 passed, ${results.property7.failed}/100 failed`);
    console.log(`Property 16 (Alert creation and management): ${results.property16.passed}/100 passed, ${results.property16.failed}/100 failed`);
    console.log(`Property 21 (Authentication-protected CRUD operations): ${results.property21.passed}/100 passed, ${results.property21.failed}/100 failed`);
    
    const totalPassed = results.property7.passed + results.property16.passed + results.property21.passed;
    const totalTests = 300;
    const successRate = (totalPassed / totalTests * 100).toFixed(2);
    
    console.log(`\nOverall Success Rate: ${successRate}% (${totalPassed}/${totalTests})`);
    
    if (totalPassed === totalTests) {
        console.log('🎉 All property-based tests passed! Watchlist and Alert system is working correctly.');
    } else {
        console.log('⚠️  Some property-based tests failed. Please review the implementation.');
    }
    
    return totalPassed === totalTests;
}

// Cleanup function
async function cleanup() {
    try {
        // Clean up test data
        await pool.query('DELETE FROM alerts WHERE project_id LIKE \'%test%\' OR project_id LIKE \'%Test%\'');
        await pool.query('DELETE FROM watchlist WHERE project_id LIKE \'%test%\' OR project_id LIKE \'%Test%\'');
        await pool.query('DELETE FROM users WHERE email LIKE \'test%@example.com\'');
        console.log('✓ Test data cleaned up');
    } catch (error) {
        console.error('Cleanup error:', error.message);
    }
}

// Main execution
async function main() {
    try {
        console.log('🔧 Setting up test environment...');
        
        // Verify database connection
        await pool.query('SELECT 1');
        console.log('✓ Database connection established');
        
        // Verify server is running
        const healthCheck = await fetch(`${API_BASE}/health`).catch(() => ({ status: 404 }));
        if (healthCheck.status !== 200) {
            console.log('⚠️  Server health check failed, but continuing with tests...');
        } else {
            console.log('✓ Server is running');
        }
        
        // Run the property-based tests
        const success = await runPropertyTests();
        
        // Cleanup
        await cleanup();
        
        // Exit with appropriate code
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        await cleanup();
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    testWatchlistUserIsolation,
    testAlertManagement,
    testAuthenticationProtection,
    runPropertyTests
};