/**
 * Test for Segments Analytics Endpoint
 * Requirements: 7.7
 */

const request = require('supertest');
const app = require('../app');
const pool = require('../db/db');

describe('Segments Analytics Endpoint', () => {
  let authToken;
  let userId;
  let projectId;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, subscription_status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Test User', `test-segments-${Date.now()}@example.com`, 'hashedpassword', 'premium']
    );
    userId = userResult.rows[0].id;

    // Create test project
    const projectResult = await pool.query(
      `INSERT INTO projects (user_id, name, category, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, 'Test Project', 'defi', 'active']
    );
    projectId = projectResult.rows[0].id;

    // Generate mock JWT token (in real app, use proper JWT)
    authToken = 'mock-token-' + userId;
  });

  afterAll(async () => {
    // Cleanup
    if (projectId) {
      await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    }
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await pool.end();
  });

  test('GET /api/analytics/segments/:projectId should return segment data', async () => {
    const response = await request(app)
      .get(`/api/analytics/segments/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.project_id).toBe(projectId);
    expect(Array.isArray(response.body.data.segments)).toBe(true);
  });

  test('Segment data should have correct structure', async () => {
    const response = await request(app)
      .get(`/api/analytics/segments/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.body.data.segments.length > 0) {
      const segment = response.body.data.segments[0];
      expect(segment).toHaveProperty('status');
      expect(segment).toHaveProperty('risk_level');
      expect(segment).toHaveProperty('wallet_count');
      expect(segment).toHaveProperty('avg_score');
      expect(segment).toHaveProperty('avg_retention');
      expect(segment).toHaveProperty('avg_adoption');
      expect(segment).toHaveProperty('avg_activity');
    }
  });
});
