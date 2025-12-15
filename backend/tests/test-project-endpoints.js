/**
 * Test Project Management Endpoints
 * Tests CRUD operations for projects with JWT authentication
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let userId = '';
let projectId = '';

// Test user credentials
const testUser = {
  name: 'Project Test User',
  email: `project-test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

// Test project data
const testProject = {
  name: 'Test DeFi Project',
  description: 'A test project for DeFi analytics',
  category: 'defi',
  website_url: 'https://example.com',
  github_url: 'https://github.com/example/project',
  tags: ['defi', 'analytics', 'zcash']
};

async function runTests() {
  console.log('🧪 Testing Project Management Endpoints\n');

  try {
    // Test 1: Register a test user
    console.log('1️⃣  Testing user registration...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    
    if (registerResponse.data.success && registerResponse.data.token) {
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
      console.log('✅ User registered successfully');
      console.log(`   User ID: ${userId}`);
    } else {
      throw new Error('Registration failed');
    }

    // Test 2: Create a project
    console.log('\n2️⃣  Testing project creation...');
    const createResponse = await axios.post(
      `${BASE_URL}/api/projects`,
      testProject,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (createResponse.data.success && createResponse.data.data) {
      projectId = createResponse.data.data.id;
      console.log('✅ Project created successfully');
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Project Name: ${createResponse.data.data.name}`);
      console.log(`   Category: ${createResponse.data.data.category}`);
    } else {
      throw new Error('Project creation failed');
    }

    // Test 3: Get all projects
    console.log('\n3️⃣  Testing get all projects...');
    const getAllResponse = await axios.get(
      `${BASE_URL}/api/projects`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (getAllResponse.data.success && Array.isArray(getAllResponse.data.data)) {
      console.log('✅ Retrieved all projects successfully');
      console.log(`   Total projects: ${getAllResponse.data.data.length}`);
    } else {
      throw new Error('Get all projects failed');
    }

    // Test 4: Get project by ID
    console.log('\n4️⃣  Testing get project by ID...');
    const getOneResponse = await axios.get(
      `${BASE_URL}/api/projects/${projectId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (getOneResponse.data.success && getOneResponse.data.data) {
      console.log('✅ Retrieved project by ID successfully');
      console.log(`   Project: ${getOneResponse.data.data.name}`);
    } else {
      throw new Error('Get project by ID failed');
    }

    // Test 5: Update project
    console.log('\n5️⃣  Testing project update...');
    const updateData = {
      name: 'Updated DeFi Project',
      status: 'active',
      description: 'Updated description for testing'
    };
    
    const updateResponse = await axios.put(
      `${BASE_URL}/api/projects/${projectId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (updateResponse.data.success && updateResponse.data.data) {
      console.log('✅ Project updated successfully');
      console.log(`   New name: ${updateResponse.data.data.name}`);
      console.log(`   New status: ${updateResponse.data.data.status}`);
    } else {
      throw new Error('Project update failed');
    }

    // Test 6: Test authentication (should fail without token)
    console.log('\n6️⃣  Testing authentication requirement...');
    try {
      await axios.get(`${BASE_URL}/api/projects`);
      console.log('❌ Authentication test failed - should have required token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Authentication properly required');
      } else {
        throw error;
      }
    }

    // Test 7: Test authorization (user can only access their own projects)
    console.log('\n7️⃣  Testing authorization...');
    // Create another user
    const otherUser = {
      name: 'Other User',
      email: `other-${Date.now()}@example.com`,
      password: 'password123'
    };
    
    const otherRegister = await axios.post(`${BASE_URL}/auth/register`, otherUser);
    const otherToken = otherRegister.data.token;
    
    try {
      await axios.get(
        `${BASE_URL}/api/projects/${projectId}`,
        {
          headers: { Authorization: `Bearer ${otherToken}` }
        }
      );
      console.log('❌ Authorization test failed - should not access other user\'s project');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Authorization properly enforced');
      } else {
        throw error;
      }
    }

    // Test 8: Delete project
    console.log('\n8️⃣  Testing project deletion...');
    const deleteResponse = await axios.delete(
      `${BASE_URL}/api/projects/${projectId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (deleteResponse.data.success) {
      console.log('✅ Project deleted successfully');
    } else {
      throw new Error('Project deletion failed');
    }

    // Test 9: Verify project is deleted
    console.log('\n9️⃣  Verifying project deletion...');
    try {
      await axios.get(
        `${BASE_URL}/api/projects/${projectId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      console.log('❌ Deletion verification failed - project still exists');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Project deletion verified');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All project management tests passed!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   cd backend && npm start\n');
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
})();
