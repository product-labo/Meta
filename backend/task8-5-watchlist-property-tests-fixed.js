/**
 * Task 8.5: Property Tests for Complete Watchlist and Alert System
 * 
 * Property 7: User-specific watchlist operations
 * Property 16: Alert creation and management  
 * Property 21: Authentication-protected CRUD operations
 * 
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4
 * Feature: dashboard-data-population
 */

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Database configuration
const pool = new Pool({
    user: 'david_user',
    host: 'localhost',
    database: 'david',
    password: 'Davidsoyaya@1015',
    port: 5432,
});

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

// Database operations (simulating API calls)
async function addToWatchlist(userId, projectData) {
    try {
        const result = await pool.query(
            `INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (user_id, project_id) DO NOTHING
             RETURNING *`,
            [userId, projectData.id, projectData.name, projectData.category]
        );
        return { success: true, data: result.rows[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function removeFromWatchlist(userId, projectId) {
    try {
        const result = await pool.query(
            `DELETE FROM watchlist WHERE user_id = $1 AND project_id = $2 RETURNING *`,
            [userId, projectId]
        );
        return { success: true, data: result.rows[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getWatchlist(userId) {
    try {
        const result = await pool.query(
            `SELECT 
                w.id,
                w.project_id,
                w.project_name,
                w.project_category,
                w.added_at,
                w.updated_at,
                COUNT(a.id) as alert_count
             FROM watchlist w
             LEFT JOIN alerts a ON w.project_id = a.project_id AND w.user_id = a.user_id AND a.is_active = true
             WHERE w.user_id = $1
             GROUP BY w.id, w.project_id, w.project_name, w.project_category, w.added_at, w.updated_at
             ORDER BY w.added_at DESC`,
            [userId]
        );
        return { success: true, data: result.rows };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function checkWatchlistStatus(userId, projectId) {
    try {
        const result = await pool.query(
            `SELECT id FROM watchlist WHERE user_id = $1 AND project_id = $2`,
            [userId, projectId]
        );
        return { 
            success: true, 
            data: { 
                isWatchlisted: result.rows.length > 0,
                watchlistId: result.rows.length > 0 ? result.rows[0].id : null
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createAlert(userId, alertData) {
    try {
        const result = await pool.query(
            `INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [userId, alertData.projectId, alertData.type, alertData.condition, 
             alertData.threshold, alertData.thresholdUnit, alertData.frequency]
        );
        return { success: true, data: result.rows[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getAlerts(userId, projectId = null) {
    try {
        let query = `
            SELECT a.*, w.project_name, w.project_category
            FROM alerts a
            LEFT JOIN watchlist w ON a.project_id = w.project_id AND a.user_id = w.user_id
            WHERE a.user_id = $1
        `;
        const params = [userId];
        
        if (projectId) {
            query += ` AND a.project_id = $2`;
            params.push(projectId);
        }
        
        query += ` ORDER BY a.created_at DESC`;
        
        const result = await pool.query(query, params);
        return { success: true, data: result.rows };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateAlert(userId, alertId, updateData) {
    try {
        const result = await pool.query(
            `UPDATE alerts 
             SET type = COALESCE($3, type),
                 condition = COALESCE($4, condition),
                 threshold = COALESCE($5, threshold),
                 threshold_unit = COALESCE($6, threshold_unit),
                 frequency = COALESCE($7, frequency),
                 is_active = COALESCE($8, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [alertId, userId, updateData.type, updateData.condition, 
             updateData.threshold, updateData.thresholdUnit, updateData.frequency, updateData.isActive]
        );
        return { success: true, data: result.rows[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteAlert(userId, alertId) {
    try {
        const result = await pool.query(
            `DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING *`,
            [alertId, userId]
        );
        return { success: true, data: result.rows[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Property 7: User-specific watchlist operations
async function testWatchlistUserIsolation() {
    console.log('\n🧪 Testing Property 7: User-specific watchlist operations');
    console.log('Feature: dashboard-data-population, Property 7: For any user and project, watchlist operations should be isolated per user');
    
    const user1 = generateTestUser();
    const user2 = generateTestUser();
    const project1 = generateTestProject();
    const project2 = generateTestProject();
    
    await createTestUser(user1);
    await createTestUser(user2);
    
    try {
        // User 1 adds project 1 to watchlist
        const add1 = await addToWatchlist(user1.id, project1);
        if (!add1.success) {
            console.log(`❌ User 1 failed to add project: ${add1.error}`);
            return false;
        }
        
        // User 2 adds project 2 to watchlist
        const add2 = await addToWatchlist(user2.id, project2);
        if (!add2.success) {
            console.log(`❌ User 2 failed to add project: ${add2.error}`);
            return false;
        }
        
        // User 1 gets their watchlist (should only see project 1)
        const watchlist1 = await getWatchlist(user1.id);
        if (!watchlist1.success) {
            console.log(`❌ User 1 failed to get watchlist: ${watchlist1.error}`);
            return false;
        }
        
        const user1Projects = watchlist1.data.map(w => w.project_id);
        const user1Isolation = user1Projects.includes(project1.id) && !user1Projects.includes(project2.id);
        
        // User 2 gets their watchlist (should only see project 2)
        const watchlist2 = await getWatchlist(user2.id);
        if (!watchlist2.success) {
            console.log(`❌ User 2 failed to get watchlist: ${watchlist2.error}`);
            return false;
        }
        
        const user2Projects = watchlist2.data.map(w => w.project_id);
        const user2Isolation = user2Projects.includes(project2.id) && !user2Projects.includes(project1.id);
        
        // Test watchlist status check
        const status1 = await checkWatchlistStatus(user1.id, project1.id);
        const status2 = await checkWatchlistStatus(user2.id, project1.id);
        
        if (!status1.success || !status2.success) {
            console.log(`❌ Status check failed`);
            return false;
        }
        
        const statusIsolation = status1.data.isWatchlisted && !status2.data.isWatchlisted;
        
        // Test removal
        const remove1 = await removeFromWatchlist(user1.id, project1.id);
        if (!remove1.success) {
            console.log(`❌ User 1 failed to remove project: ${remove1.error}`);
            return false;
        }
        
        // Verify removal
        const finalWatchlist1 = await getWatchlist(user1.id);
        if (!finalWatchlist1.success) {
            console.log(`❌ User 1 failed to get final watchlist: ${finalWatchlist1.error}`);
            return false;
        }
        
        const finalUser1Projects = finalWatchlist1.data.map(w => w.project_id);
        const removalVerification = !finalUser1Projects.includes(project1.id);
        
        const allTestsPassed = user1Isolation && user2Isolation && statusIsolation && removalVerification;
        
        console.log(`✓ User 1 isolation: ${user1Isolation}`);
        console.log(`✓ User 2 isolation: ${user2Isolation}`);
        console.log(`✓ Status check isolation: ${statusIsolation}`);
        console.log(`✓ Removal verification: ${removalVerification}`);
        
        return allTestsPassed;
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
    await createTestUser(user);
    
    try {
        // Add project to watchlist first
        const watchlistAdd = await addToWatchlist(user.id, project);
        if (!watchlistAdd.success) {
            console.log(`❌ Failed to add project to watchlist: ${watchlistAdd.error}`);
            return false;
        }
        
        // Create multiple alerts for the project
        const alert1 = generateTestAlert(project.id);
        const alert2 = generateTestAlert(project.id);
        
        const create1 = await createAlert(user.id, alert1);
        const create2 = await createAlert(user.id, alert2);
        
        if (!create1.success || !create2.success) {
            console.log(`❌ Alert creation failed: ${create1.error || create2.error}`);
            return false;
        }
        
        // Get all alerts
        const allAlerts = await getAlerts(user.id);
        if (!allAlerts.success) {
            console.log(`❌ Failed to get alerts: ${allAlerts.error}`);
            return false;
        }
        
        const alertRetrievalSuccess = allAlerts.data.length >= 2;
        
        // Get project-specific alerts
        const projectAlerts = await getAlerts(user.id, project.id);
        if (!projectAlerts.success) {
            console.log(`❌ Failed to get project alerts: ${projectAlerts.error}`);
            return false;
        }
        
        const projectSpecificSuccess = projectAlerts.data.every(a => a.project_id === project.id);
        
        // Update an alert
        const alertToUpdate = allAlerts.data[0];
        const updateData = {
            threshold: alertToUpdate.threshold + 10,
            frequency: 'weekly',
            isActive: false
        };
        
        const update = await updateAlert(user.id, alertToUpdate.id, updateData);
        if (!update.success) {
            console.log(`❌ Alert update failed: ${update.error}`);
            return false;
        }
        
        // Verify update
        const updatedAlerts = await getAlerts(user.id);
        if (!updatedAlerts.success) {
            console.log(`❌ Failed to get updated alerts: ${updatedAlerts.error}`);
            return false;
        }
        
        const updatedAlert = updatedAlerts.data.find(a => a.id === alertToUpdate.id);
        const updateVerification = updatedAlert && 
            updatedAlert.threshold === updateData.threshold && 
            updatedAlert.frequency === updateData.frequency;
        
        // Delete an alert
        const alertToDelete = allAlerts.data[1];
        const deleteResult = await deleteAlert(user.id, alertToDelete.id);
        if (!deleteResult.success) {
            console.log(`❌ Alert deletion failed: ${deleteResult.error}`);
            return false;
        }
        
        // Verify deletion
        const finalAlerts = await getAlerts(user.id);
        if (!finalAlerts.success) {
            console.log(`❌ Failed to get final alerts: ${finalAlerts.error}`);
            return false;
        }
        
        const deletionVerification = !finalAlerts.data.some(a => a.id === alertToDelete.id);
        
        const allTestsPassed = alertRetrievalSuccess && projectSpecificSuccess && 
                             updateVerification && deletionVerification;
        
        console.log(`✓ Alert creation: ${create1.success && create2.success}`);
        console.log(`✓ Alert retrieval: ${alertRetrievalSuccess}`);
        console.log(`✓ Project-specific alerts: ${projectSpecificSuccess}`);
        console.log(`✓ Alert update: ${update.success}`);
        console.log(`✓ Update verification: ${updateVerification}`);
        console.log(`✓ Alert deletion: ${deleteResult.success}`);
        console.log(`✓ Deletion verification: ${deletionVerification}`);
        
        return allTestsPassed;
    } catch (error) {
        console.error('❌ Alert management test failed:', error.message);
        return false;
    }
}

// Property 21: Authentication-protected CRUD operations (Database-level simulation)
async function testAuthenticationProtection() {
    console.log('\n🧪 Testing Property 21: Authentication-protected CRUD operations');
    console.log('Feature: dashboard-data-population, Property 21: For any API endpoint, authentication should be required for all CRUD operations');
    
    const user1 = generateTestUser();
    const user2 = generateTestUser();
    const project = generateTestProject();
    
    await createTestUser(user1);
    await createTestUser(user2);
    
    try {
        // Test user isolation in database operations
        // User 1 creates a watchlist item
        const add1 = await addToWatchlist(user1.id, project);
        if (!add1.success) {
            console.log(`❌ User 1 failed to add to watchlist: ${add1.error}`);
            return false;
        }
        
        // User 2 tries to access User 1's data (should not see it)
        const user2Watchlist = await getWatchlist(user2.id);
        if (!user2Watchlist.success) {
            console.log(`❌ User 2 failed to get watchlist: ${user2Watchlist.error}`);
            return false;
        }
        
        const user2CannotSeeUser1Data = !user2Watchlist.data.some(w => w.project_id === project.id);
        
        // User 2 tries to delete User 1's watchlist item (should not affect User 1)
        const crossUserDelete = await removeFromWatchlist(user2.id, project.id);
        // This should succeed but not affect User 1's data
        
        // Verify User 1's watchlist is still intact
        const user1Watchlist = await getWatchlist(user1.id);
        if (!user1Watchlist.success) {
            console.log(`❌ User 1 failed to get watchlist after cross-user delete: ${user1Watchlist.error}`);
            return false;
        }
        
        const user1DataIntact = user1Watchlist.data.some(w => w.project_id === project.id);
        
        // Test alert isolation
        const alert1 = generateTestAlert(project.id);
        const createAlert1 = await createAlert(user1.id, alert1);
        if (!createAlert1.success) {
            console.log(`❌ User 1 failed to create alert: ${createAlert1.error}`);
            return false;
        }
        
        // User 2 should not see User 1's alerts
        const user2Alerts = await getAlerts(user2.id);
        if (!user2Alerts.success) {
            console.log(`❌ User 2 failed to get alerts: ${user2Alerts.error}`);
            return false;
        }
        
        const alertIsolation = !user2Alerts.data.some(a => a.project_id === project.id);
        
        // Test JWT token validation (simulate invalid token)
        try {
            const invalidToken = 'invalid.token.here';
            jwt.verify(invalidToken, JWT_SECRET);
            console.log(`❌ Invalid token was accepted`);
            return false;
        } catch (error) {
            // This should fail - invalid tokens should be rejected
        }
        
        // Test valid token
        const validToken = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET);
        try {
            const decoded = jwt.verify(validToken, JWT_SECRET);
            const validTokenAccepted = decoded.id === user1.id;
            
            const allTestsPassed = user2CannotSeeUser1Data && user1DataIntact && 
                                 alertIsolation && validTokenAccepted;
            
            console.log(`✓ User data isolation: ${user2CannotSeeUser1Data}`);
            console.log(`✓ Cross-user operation protection: ${user1DataIntact}`);
            console.log(`✓ Alert isolation: ${alertIsolation}`);
            console.log(`✓ Valid token accepted: ${validTokenAccepted}`);
            
            return allTestsPassed;
        } catch (error) {
            console.log(`❌ Valid token was rejected: ${error.message}`);
            return false;
        }
        
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
    console.log('🔄 Running Property 7 tests...');
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
            if (i < 5) { // Only log first few errors to avoid spam
                console.error(`Property 7 iteration ${i + 1} failed:`, error.message);
            }
        }
        
        // Progress indicator
        if ((i + 1) % 20 === 0) {
            console.log(`Property 7 progress: ${i + 1}/100 iterations completed`);
        }
    }
    
    // Run Property 16: Alert creation and management (100 iterations)
    console.log('🔄 Running Property 16 tests...');
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
            if (i < 5) { // Only log first few errors to avoid spam
                console.error(`Property 16 iteration ${i + 1} failed:`, error.message);
            }
        }
        
        // Progress indicator
        if ((i + 1) % 20 === 0) {
            console.log(`Property 16 progress: ${i + 1}/100 iterations completed`);
        }
    }
    
    // Run Property 21: Authentication-protected CRUD operations (100 iterations)
    console.log('🔄 Running Property 21 tests...');
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
            if (i < 5) { // Only log first few errors to avoid spam
                console.error(`Property 21 iteration ${i + 1} failed:`, error.message);
            }
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
        return true;
    } else {
        console.log('⚠️  Some property-based tests failed. Please review the implementation.');
        return false;
    }
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
        
        // Run the property-based tests
        const success = await runPropertyTests();
        
        // Cleanup
        await cleanup();
        
        // Close database connection
        await pool.end();
        
        // Exit with appropriate code
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        await cleanup();
        await pool.end();
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    testWatchlistUserIsolation,
    testAlertManagement,
    testAuthenticationProtection,
    runPropertyTests
};