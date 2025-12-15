/**
 * Property-Based Tests for Configuration and Deployment Lisk Alignment
 * **Feature: remove-zcash-dependencies, Property 6: Configuration and deployment Lisk alignment**
 * **Validates: Requirements 1.5, 6.1, 6.2, 6.3**
 */

const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

describe('Configuration and Deployment Lisk Alignment Properties', () => {
  
  /**
   * Property 6: Configuration and deployment Lisk alignment
   * For any deployment or configuration operation, the system should require and use 
   * Lisk-related settings and never reference Zcash configurations
   */
  test('Deployment scripts should use Lisk node configuration', () => {
    fc.assert(fc.property(
      fc.constantFrom('deployment_scripts', 'docker_config', 'env_variables'),
      (configType) => {
        let hasLiskConfig = false;
        let hasZcashConfig = false;

        switch (configType) {
          case 'deployment_scripts':
            // Check deployment scripts directory
            const scriptsDir = path.join(__dirname, '../../scripts');
            if (fs.existsSync(scriptsDir)) {
              const scriptFiles = fs.readdirSync(scriptsDir);
              
              for (const file of scriptFiles) {
                if (file.endsWith('.sh') || file.endsWith('.js')) {
                  const filePath = path.join(scriptsDir, file);
                  const content = fs.readFileSync(filePath, 'utf8');
                  
                  // Should reference Lisk
                  if (content.includes('lisk') || 
                      content.includes('LISK') ||
                      content.includes('LSK')) {
                    hasLiskConfig = true;
                  }
                  
                  // Should not reference Zcash
                  if (content.includes('zcash') || 
                      content.includes('ZCASH') ||
                      content.includes('ZEC')) {
                    hasZcashConfig = true;
                  }
                }
              }
            }
            break;

          case 'docker_config':
            // Check for Docker configuration files
            const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'];
            
            for (const dockerFile of dockerFiles) {
              const dockerPath = path.join(__dirname, '../../', dockerFile);
              if (fs.existsSync(dockerPath)) {
                const content = fs.readFileSync(dockerPath, 'utf8');
                
                // Should reference Lisk services
                if (content.includes('lisk') || 
                    content.includes('LISK')) {
                  hasLiskConfig = true;
                }
                
                // Should not reference Zcash services
                if (content.includes('zcash') || 
                    content.includes('ZCASH')) {
                  hasZcashConfig = true;
                }
              }
            }
            break;

          case 'env_variables':
            // Check environment configuration files
            const envFiles = ['.env.example', '.env'];
            
            for (const envFile of envFiles) {
              const envPath = path.join(__dirname, '../../', envFile);
              if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf8');
                
                // Should have Lisk environment variables
                if (content.includes('LISK') || 
                    content.includes('lisk')) {
                  hasLiskConfig = true;
                }
                
                // Should not have Zcash environment variables
                if (content.includes('ZCASH') || 
                    content.includes('zcash')) {
                  hasZcashConfig = true;
                }
              }
            }
            break;
        }

        // Property: Should have Lisk configuration and no Zcash configuration
        return hasLiskConfig && !hasZcashConfig;
      }
    ), { numRuns: 100 });
  });

  test('Application configuration should use Lisk API settings', () => {
    fc.assert(fc.property(
      fc.constantFrom('app_config', 'service_config', 'network_config'),
      (configType) => {
        let hasLiskSettings = false;
        let hasZcashSettings = false;

        switch (configType) {
          case 'app_config':
            // Check main application configuration
            const appConfigPath = path.join(__dirname, '../../src/config/appConfig.js');
            if (fs.existsSync(appConfigPath)) {
              const content = fs.readFileSync(appConfigPath, 'utf8');
              
              hasLiskSettings = content.includes('lisk') || 
                              content.includes('LISK');
              
              hasZcashSettings = content.includes('zcash') || 
                               content.includes('ZCASH');
            }
            break;

          case 'service_config':
            // Check service configuration files
            const servicesDir = path.join(__dirname, '../../src/services');
            if (fs.existsSync(servicesDir)) {
              const serviceFiles = fs.readdirSync(servicesDir);
              
              for (const file of serviceFiles) {
                if (file.includes('lisk') || file.includes('Lisk')) {
                  hasLiskSettings = true;
                }
                if (file.includes('zcash') || file.includes('Zcash')) {
                  hasZcashSettings = true;
                }
              }
            }
            break;

          case 'network_config':
            // Check for network configuration
            const configDir = path.join(__dirname, '../../src/config');
            if (fs.existsSync(configDir)) {
              const configFiles = fs.readdirSync(configDir);
              
              for (const file of configFiles) {
                const filePath = path.join(configDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                if (content.includes('lisk') || content.includes('LISK')) {
                  hasLiskSettings = true;
                }
                if (content.includes('zcash') || content.includes('ZCASH')) {
                  hasZcashSettings = true;
                }
              }
            }
            break;
        }

        // Property: Should have Lisk settings and no Zcash settings
        return hasLiskSettings && !hasZcashSettings;
      }
    ), { numRuns: 100 });
  });

  test('Health checks should verify Lisk connectivity', () => {
    fc.assert(fc.property(
      fc.constantFrom('health_endpoint', 'monitoring_config', 'status_checks'),
      (checkType) => {
        let checksLisk = false;
        let checksZcash = false;

        switch (checkType) {
          case 'health_endpoint':
            // Check main application file for health checks
            const appPath = path.join(__dirname, '../../app.js');
            if (fs.existsSync(appPath)) {
              const content = fs.readFileSync(appPath, 'utf8');
              
              if (content.includes('lisk') && content.includes('health')) {
                checksLisk = true;
              }
              if (content.includes('zcash') && content.includes('health')) {
                checksZcash = true;
              }
            }
            break;

          case 'monitoring_config':
            // Check monitoring services
            const monitorPath = path.join(__dirname, '../../src/services/performanceMonitor.js');
            if (fs.existsSync(monitorPath)) {
              const content = fs.readFileSync(monitorPath, 'utf8');
              
              checksLisk = content.includes('lisk') || content.includes('LISK');
              checksZcash = content.includes('zcash') || content.includes('ZCASH');
            }
            break;

          case 'status_checks':
            // Check routes for status endpoints
            const routesDir = path.join(__dirname, '../../src/routes');
            if (fs.existsSync(routesDir)) {
              const routeFiles = fs.readdirSync(routesDir);
              
              for (const file of routeFiles) {
                const filePath = path.join(routesDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                if (content.includes('lisk') || content.includes('LISK')) {
                  checksLisk = true;
                }
                if (content.includes('zcash') || content.includes('ZCASH')) {
                  checksZcash = true;
                }
              }
            }
            break;
        }

        // Property: Should check Lisk and not Zcash
        return checksLisk && !checksZcash;
      }
    ), { numRuns: 100 });
  });
});