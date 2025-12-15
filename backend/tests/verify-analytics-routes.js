/**
 * Verify Analytics Routes Registration
 * Checks that all analytics endpoints are properly registered
 */

import express from 'express';
import analyticsRouter from '../src/routes/analytics.js';

console.log('🔍 Verifying Analytics Routes Registration...\n');

// Create a test app to inspect routes
const app = express();
app.use('/api', analyticsRouter);

// Extract all registered routes
const routes = [];

function extractRoutes(stack, basePath = '') {
  stack.forEach(layer => {
    if (layer.route) {
      // This is a route
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      const path = basePath + layer.route.path;
      routes.push({ methods, path });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // This is a nested router
      const newBasePath = basePath + (layer.regexp.source.match(/^\\\/([^\\]+)/) || ['', ''])[1];
      extractRoutes(layer.handle.stack, newBasePath);
    }
  });
}

extractRoutes(app._router.stack);

// Expected endpoints from Task 19
const expectedEndpoints = [
  { method: 'GET', path: '/api/analytics/dashboard/:projectId', requirement: '7.1' },
  { method: 'GET', path: '/api/analytics/adoption/:projectId', requirement: '7.2' },
  { method: 'GET', path: '/api/analytics/retention/:projectId', requirement: '7.4' },
  { method: 'GET', path: '/api/analytics/productivity/:projectId', requirement: '7.5' },
  { method: 'GET', path: '/api/analytics/shielded/:projectId', requirement: '7.6' },
  { method: 'GET', path: '/api/analytics/segments/:projectId', requirement: '7.7' },
  { method: 'GET', path: '/api/analytics/health/:projectId', requirement: '7.8' },
  { method: 'GET', path: '/api/analytics/comparison/:projectId', requirement: '7.9' }
];

console.log('📋 Expected Endpoints (Task 19):');
console.log('='.repeat(80));

let allFound = true;

expectedEndpoints.forEach(expected => {
  // Check both with and without /api prefix
  const pathWithoutApi = expected.path.replace('/api', '');
  const found = routes.some(route => 
    route.methods.includes(expected.method) && 
    (route.path === expected.path || route.path === pathWithoutApi)
  );

  const status = found ? '✅' : '❌';
  console.log(`${status} ${expected.method.padEnd(6)} ${expected.path.padEnd(50)} (Req ${expected.requirement})`);
  
  if (!found) {
    allFound = false;
  }
});

console.log('='.repeat(80));

// Show all registered analytics routes
console.log('\n📝 All Registered Analytics Routes:');
console.log('='.repeat(80));

const analyticsRoutes = routes.filter(r => r.path.includes('/analytics'));
analyticsRoutes.forEach(route => {
  console.log(`   ${route.methods.join(', ').padEnd(6)} ${route.path}`);
});

console.log('='.repeat(80));
console.log(`\nTotal Analytics Routes: ${analyticsRoutes.length}`);

if (allFound) {
  console.log('\n🎉 All required endpoints are properly registered!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some required endpoints are missing!');
  process.exit(1);
}
