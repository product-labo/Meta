/**
 * Fix to ensure continuous sync properly updates user status on completion/error
 */

import { readFile, writeFile } from 'fs/promises';

async function fixContinuousSyncCompletion() {
  console.log('🔧 Fixing continuous sync completion handling...');
  
  try {
    const filePath = 'src/api/routes/continuous-sync-improved.js';
    let content = await readFile(filePath, 'utf8');
    
    // Add better error handling at the end of the main try-catch block
    const oldEndPattern = `  } catch (error) {
    console.error('Continuous sync error:', error);
    throw error;
  }
}`;

    const newEndPattern = `  } catch (error) {
    console.error('Continuous sync error:', error);
    
    // Update user status on continuous sync error
    try {
      const errorUser = await UserStorage.findById(userId);
      if (errorUser && errorUser.onboarding?.defaultContract) {
        const errorOnboarding = {
          ...errorUser.onboarding,
          defaultContract: {
            ...errorUser.onboarding.defaultContract,
            continuousSync: false,
            indexingProgress: 0,
            isIndexed: false,
            error: error.message,
            lastUpdate: new Date().toISOString()
          }
        };
        await UserStorage.update(userId, { onboarding: errorOnboarding });
        console.log('✅ User status updated after continuous sync error');
      }
    } catch (updateError) {
      console.error('Failed to update user status on continuous sync error:', updateError);
    }
    
    throw error;
  }
}`;

    if (content.includes(oldEndPattern)) {
      content = content.replace(oldEndPattern, newEndPattern);
      await writeFile(filePath, content, 'utf8');
      console.log('✅ Fixed continuous sync error handling');
    } else {
      console.log('⚠️  Pattern not found, continuous sync might already be fixed');
    }
    
    // Also add better completion handling when sync loop ends normally
    const oldLoopEndPattern = `    console.log(\`🏁 Continuous sync loop ended for analysis \${analysisId}\`);`;
    
    const newLoopEndPattern = `    console.log(\`🏁 Continuous sync loop ended for analysis \${analysisId}\`);
    
    // Update user status when continuous sync ends normally
    try {
      const endUser = await UserStorage.findById(userId);
      if (endUser && endUser.onboarding?.defaultContract) {
        const endOnboarding = {
          ...endUser.onboarding,
          defaultContract: {
            ...endUser.onboarding.defaultContract,
            continuousSync: false,
            isIndexed: true,
            indexingProgress: 100,
            lastUpdate: new Date().toISOString()
          }
        };
        await UserStorage.update(userId, { onboarding: endOnboarding });
        console.log('✅ User status updated after continuous sync completion');
      }
    } catch (updateError) {
      console.error('Failed to update user status on continuous sync completion:', updateError);
    }`;

    if (content.includes(oldLoopEndPattern) && !content.includes('User status updated after continuous sync completion')) {
      content = content.replace(oldLoopEndPattern, newLoopEndPattern);
      await writeFile(filePath, content, 'utf8');
      console.log('✅ Fixed continuous sync completion handling');
    } else {
      console.log('⚠️  Completion pattern not found or already fixed');
    }
    
    console.log('🎉 Continuous sync fixes applied successfully');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixContinuousSyncCompletion().catch(console.error);