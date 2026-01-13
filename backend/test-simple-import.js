/**
 * Simple test to verify imports work
 */

try {
    console.log('Testing MetricsCalculator import...');
    const { MetricsCalculator } = await import('./src/services/metrics-calculator.js');
    console.log('✅ MetricsCalculator imported successfully');
    console.log('MetricsCalculator type:', typeof MetricsCalculator);
    
    console.log('Testing MetricsDataPipeline import...');
    const { MetricsDataPipeline } = await import('./src/services/metrics-pipeline.js');
    console.log('✅ MetricsDataPipeline imported successfully');
    console.log('MetricsDataPipeline type:', typeof MetricsDataPipeline);
    
} catch (error) {
    console.error('❌ Import failed:', error);
}