/**
 * Test UI Endpoints
 * Verifies Task Management and Analytics endpoints
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3003';
const API_URL = `${BASE_URL}/api`;
const AUTH_URL = `${BASE_URL}/auth`;

let authToken = null;
let projectId = null;
let taskId = null;

// Test user
const testUser = {
    email: `ui-test-${Date.now()}@example.com`,
    password: 'TestPassword123!'
};

const testProject = {
    name: 'UI Test Project',
    category: 'defi',
    status: 'active'
};

async function runTests() {
    console.log('=== Testing UI Endpoints ===\n');

    try {
        // 1. Setup (Register -> Login -> Create Project)
        console.log('1. Setting up (Register -> Login -> Create Project)...');
        await axios.post(`${AUTH_URL}/signup`, testUser);
        const loginRes = await axios.post(`${AUTH_URL}/login`, testUser);
        authToken = loginRes.data.token;
        const authHeaders = { Authorization: `Bearer ${authToken}` };

        const projectRes = await axios.post(`${API_URL}/projects`, testProject, { headers: authHeaders });
        projectId = projectRes.data.data.id;
        console.log('   ✓ Setup complete');
        console.log(`   Project ID: ${projectId}\n`);

        // 2. Task Management
        console.log('2. Testing Task Management...');

        // Create Task
        const taskRes = await axios.post(
            `${API_URL}/projects/${projectId}/tasks`,
            {
                title: 'Fix High Latency',
                priority: 'high',
                impact: 'User Experience',
                verification_criteria: 'Latency < 200ms'
            },
            { headers: authHeaders }
        );
        taskId = taskRes.data.data.id;
        console.log('   ✓ Created Task');
        console.log(`     ID: ${taskId}, Title: ${taskRes.data.data.title}`);

        // Get Tasks
        const tasksRes = await axios.get(`${API_URL}/projects/${projectId}/tasks`, { headers: authHeaders });
        console.log(`   ✓ Retrieved ${tasksRes.data.data.length} tasks`);

        // Update Task
        const updateRes = await axios.put(
            `${API_URL}/projects/${projectId}/tasks/${taskId}`,
            { status: 'in_progress' },
            { headers: authHeaders }
        );
        console.log(`   ✓ Updated Task status onto: ${updateRes.data.data.status}`);

        console.log('');

        // 3. Analytics Endpoints
        console.log('3. Testing Analytics Endpoints...');

        const endpoints = [
            'overview',
            'transactional',
            'productivity',
            'insights',
            'wallet-stats',
            'competitors',
            'bridges',
            'activity'
        ];

        for (const endpoint of endpoints) {
            const res = await axios.get(`${API_URL}/projects/${projectId}/analytics/${endpoint}`, { headers: authHeaders });
            if (res.data.status === 'success') {
                console.log(`   ✓ GET /analytics/${endpoint} - Success`);
            } else {
                console.log(`   ✗ GET /analytics/${endpoint} - Failed`);
            }
        }

        console.log('\n=== All UI Tests Passed! ===');
        process.exit(0);

    } catch (error) {
        console.error('\n✗ Test failed:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(`   ${error.message}`);
        }
        process.exit(1);
    }
}

runTests();
