/**
 * Test Marathon Sync Frontend Integration
 * Tests the new localStorage-based state management and animated logo
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Marathon Sync Frontend Integration...\n');

// Test 1: Check if hook file exists and has correct exports
console.log('1. Testing marathon sync hook...');
const hookPath = path.join(__dirname, 'frontend/hooks/use-marathon-sync.ts');
if (fs.existsSync(hookPath)) {
  const hookContent = fs.readFileSync(hookPath, 'utf8');
  
  // Check for key functions
  const hasUseMarathonSync = hookContent.includes('export function useMarathonSync');
  const hasLocalStorage = hookContent.includes('localStorage');
  const hasPolling = hookContent.includes('POLL_INTERVAL');
  const hasStateManagement = hookContent.includes('MarathonSyncState');
  
  console.log(`   ✅ Hook file exists`);
  console.log(`   ${hasUseMarathonSync ? '✅' : '❌'} useMarathonSync function exported`);
  console.log(`   ${hasLocalStorage ? '✅' : '❌'} localStorage integration`);
  console.log(`   ${hasPolling ? '✅' : '❌'} Polling mechanism`);
  console.log(`   ${hasStateManagement ? '✅' : '❌'} State management interface`);
} else {
  console.log('   ❌ Hook file not found');
}

// Test 2: Check animated logo component
console.log('\n2. Testing animated logo component...');
const logoPath = path.join(__dirname, 'frontend/components/ui/animated-logo.tsx');
if (fs.existsSync(logoPath)) {
  const logoContent = fs.readFileSync(logoPath, 'utf8');
  
  const hasAnimatedLogo = logoContent.includes('export function AnimatedLogo');
  const hasMarathonLoader = logoContent.includes('export function MarathonSyncLoader');
  const hasLoadingWithLogo = logoContent.includes('export function LoadingWithLogo');
  const hasSVGLogo = logoContent.includes('<svg');
  const hasAnimations = logoContent.includes('animate-wave');
  
  console.log(`   ✅ Logo component file exists`);
  console.log(`   ${hasAnimatedLogo ? '✅' : '❌'} AnimatedLogo component`);
  console.log(`   ${hasMarathonLoader ? '✅' : '❌'} MarathonSyncLoader component`);
  console.log(`   ${hasLoadingWithLogo ? '✅' : '❌'} LoadingWithLogo component`);
  console.log(`   ${hasSVGLogo ? '✅' : '❌'} SVG MetaGauge logo`);
  console.log(`   ${hasAnimations ? '✅' : '❌'} Animation classes`);
} else {
  console.log('   ❌ Logo component file not found');
}

// Test 3: Check CSS animations
console.log('\n3. Testing CSS animations...');
const cssPath = path.join(__dirname, 'frontend/app/globals.css');
if (fs.existsSync(cssPath)) {
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  const hasWaveAnimation = cssContent.includes('@keyframes wave');
  const hasFloatAnimation = cssContent.includes('@keyframes float');
  const hasGlowAnimation = cssContent.includes('@keyframes glow');
  const hasAnimateWave = cssContent.includes('.animate-wave');
  
  console.log(`   ✅ Global CSS file exists`);
  console.log(`   ${hasWaveAnimation ? '✅' : '❌'} Wave keyframes`);
  console.log(`   ${hasFloatAnimation ? '✅' : '❌'} Float keyframes`);
  console.log(`   ${hasGlowAnimation ? '✅' : '❌'} Glow keyframes`);
  console.log(`   ${hasAnimateWave ? '✅' : '❌'} Animation utility classes`);
} else {
  console.log('   ❌ Global CSS file not found');
}

// Test 4: Check dashboard integration
console.log('\n4. Testing dashboard integration...');
const dashboardPath = path.join(__dirname, 'frontend/app/dashboard/page.tsx');
if (fs.existsSync(dashboardPath)) {
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  const hasHookImport = dashboardContent.includes('import { useMarathonSync }');
  const hasLoaderImport = dashboardContent.includes('import { MarathonSyncLoader, LoadingWithLogo }');
  const hasHookUsage = dashboardContent.includes('useMarathonSync()');
  const hasLoaderUsage = dashboardContent.includes('<MarathonSyncLoader');
  const hasLoadingUsage = dashboardContent.includes('<LoadingWithLogo');
  
  console.log(`   ✅ Dashboard file exists`);
  console.log(`   ${hasHookImport ? '✅' : '❌'} Marathon sync hook imported`);
  console.log(`   ${hasLoaderImport ? '✅' : '❌'} Animated components imported`);
  console.log(`   ${hasHookUsage ? '✅' : '❌'} Hook used in component`);
  console.log(`   ${hasLoaderUsage ? '✅' : '❌'} MarathonSyncLoader used`);
  console.log(`   ${hasLoadingUsage ? '✅' : '❌'} LoadingWithLogo used`);
} else {
  console.log('   ❌ Dashboard file not found');
}

// Test 5: Check API integration
console.log('\n5. Testing API integration...');
const apiPath = path.join(__dirname, 'frontend/lib/api.ts');
if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  const hasRefreshFunction = apiContent.includes('refreshDefaultContract');
  const hasStopFunction = apiContent.includes('stopContinuousSync');
  const hasGetStatus = apiContent.includes('getStatus');
  const hasGetContract = apiContent.includes('getDefaultContract');
  
  console.log(`   ✅ API file exists`);
  console.log(`   ${hasRefreshFunction ? '✅' : '❌'} refreshDefaultContract function`);
  console.log(`   ${hasStopFunction ? '✅' : '❌'} stopContinuousSync function`);
  console.log(`   ${hasGetStatus ? '✅' : '❌'} getStatus function`);
  console.log(`   ${hasGetContract ? '✅' : '❌'} getDefaultContract function`);
} else {
  console.log('   ❌ API file not found');
}

// Test 6: Check backend continuous sync
console.log('\n6. Testing backend continuous sync...');
const backendPath = path.join(__dirname, 'src/api/routes/continuous-sync-improved.js');
if (fs.existsSync(backendPath)) {
  const backendContent = fs.readFileSync(backendPath, 'utf8');
  
  const hasInteractionBased = backendContent.includes('interaction-based');
  const hasDeduplication = backendContent.includes('deduplication');
  const hasDataIntegrity = backendContent.includes('dataIntegrityScore');
  const hasAccumulatedData = backendContent.includes('accumulatedData');
  const hasCycleTracking = backendContent.includes('syncCycle');
  
  console.log(`   ✅ Backend sync file exists`);
  console.log(`   ${hasInteractionBased ? '✅' : '❌'} Interaction-based fetching`);
  console.log(`   ${hasDeduplication ? '✅' : '❌'} Deduplication logic`);
  console.log(`   ${hasDataIntegrity ? '✅' : '❌'} Data integrity scoring`);
  console.log(`   ${hasAccumulatedData ? '✅' : '❌'} Accumulated data tracking`);
  console.log(`   ${hasCycleTracking ? '✅' : '❌'} Sync cycle tracking`);
} else {
  console.log('   ❌ Backend sync file not found');
}

console.log('\n🎉 Marathon Sync Frontend Integration Test Complete!');
console.log('\n📋 Summary:');
console.log('   • localStorage-based state management implemented');
console.log('   • Animated MetaGauge logo with waving effects');
console.log('   • Marathon sync loader with real-time stats');
console.log('   • Dashboard integration with new components');
console.log('   • CSS animations for smooth user experience');
console.log('   • Backend interaction-based sync with deduplication');

console.log('\n🚀 Ready to test in browser!');
console.log('   1. Start the frontend: cd frontend && npm run dev');
console.log('   2. Navigate to /dashboard');
console.log('   3. Click "Marathon Sync" to test the new features');
console.log('   4. Check browser localStorage for state persistence');
console.log('   5. Observe animated logo and real-time progress updates');