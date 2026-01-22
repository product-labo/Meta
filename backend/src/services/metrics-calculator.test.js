/**
 * Test file for MetricsCalculator service
 * Tests the core metrics calculation algorithms
 */

import { MetricsCalculator } from './metrics-calculator.js';

// Mock database configuration for testing
const mockDbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    user: 'test_user',
    password: 'test_password'
};

describe('MetricsCalculator', () => {
    let calculator;

    beforeEach(() => {
        calculator = new MetricsCalculator(mockDbConfig);
    });

    afterEach(async () => {
        if (calculator) {
            await calculator.close();
        }
    });

    describe('calculateGrowthScore', () => {
        test('should calculate growth score correctly for high growth metrics', () => {
            const metrics = {
                customer_growth_rate: 25,
                transaction_growth_rate: 35,
                volume_growth_rate: 30,
                success_rate: 96,
                daily_active_customers: 100,
                weekly_active_customers: 200
            };

            const score = calculator.calculateGrowthScore(metrics);
            expect(score).toBeGreaterThan(80);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should calculate growth score correctly for declining metrics', () => {
            const metrics = {
                customer_growth_rate: -25,
                transaction_growth_rate: -35,
                volume_growth_rate: -30,
                success_rate: 45,
                daily_active_customers: 10,
                weekly_active_customers: 200
            };

            const score = calculator.calculateGrowthScore(metrics);
            expect(score).toBeLessThan(30);
            expect(score).toBeGreaterThanOrEqual(0);
        });

        test('should return base score for neutral metrics', () => {
            const metrics = {
                customer_growth_rate: 0,
                transaction_growth_rate: 0,
                volume_growth_rate: 0,
                success_rate: 85,
                daily_active_customers: 50,
                weekly_active_customers: 200
            };

            const score = calculator.calculateGrowthScore(metrics);
            expect(score).toBeGreaterThanOrEqual(45);
            expect(score).toBeLessThanOrEqual(55);
        });
    });

    describe('calculateHealthScore', () => {
        test('should calculate health score correctly for healthy metrics', () => {
            const metrics = {
                success_rate: 99,
                retention_rate: 60,
                transaction_volume_trend: 25,
                customer_stickiness: 0.5
            };

            const score = calculator.calculateHealthScore(metrics);
            expect(score).toBeGreaterThan(85);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should calculate health score correctly for unhealthy metrics', () => {
            const metrics = {
                success_rate: 40,
                retention_rate: 3,
                transaction_volume_trend: -25,
                customer_stickiness: 0.05
            };

            const score = calculator.calculateHealthScore(metrics);
            expect(score).toBeLessThan(25);
            expect(score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('calculateRiskScore', () => {
        test('should calculate risk score correctly for low risk metrics', () => {
            const metrics = {
                success_rate: 99,
                customer_concentration: 0.05,
                volume_volatility: 2
            };

            const score = calculator.calculateRiskScore(metrics);
            expect(score).toBeLessThan(35);
            expect(score).toBeGreaterThanOrEqual(0);
        });

        test('should calculate risk score correctly for high risk metrics', () => {
            const metrics = {
                success_rate: 30,
                customer_concentration: 0.9,
                volume_volatility: 150
            };

            const score = calculator.calculateRiskScore(metrics);
            expect(score).toBeGreaterThan(80);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('calculateCustomerConcentration', () => {
        test('should return low concentration for many customers with few transactions each', () => {
            const concentration = calculator.calculateCustomerConcentration(1000, 2000);
            expect(concentration).toBeLessThan(0.2);
        });

        test('should return high concentration for few customers with many transactions each', () => {
            const concentration = calculator.calculateCustomerConcentration(10, 2000);
            expect(concentration).toBeGreaterThan(0.8);
        });

        test('should return zero for no customers or transactions', () => {
            expect(calculator.calculateCustomerConcentration(0, 100)).toBe(0);
            expect(calculator.calculateCustomerConcentration(100, 0)).toBe(0);
        });
    });

    describe('classifyWalletType', () => {
        test('should classify whale wallet correctly', () => {
            const metrics = {
                total_spent_eth: 150,
                total_interactions: 100,
                unique_contracts: 20,
                avg_transaction_size: 15
            };

            const type = calculator.classifyWalletType(metrics);
            expect(type).toBe('whale');
        });

        test('should classify premium wallet correctly', () => {
            const metrics = {
                total_spent_eth: 25,
                total_interactions: 50,
                unique_contracts: 10,
                avg_transaction_size: 2
            };

            const type = calculator.classifyWalletType(metrics);
            expect(type).toBe('premium');
        });

        test('should classify regular wallet correctly', () => {
            const metrics = {
                total_spent_eth: 5,
                total_interactions: 15,
                unique_contracts: 5,
                avg_transaction_size: 0.5
            };

            const type = calculator.classifyWalletType(metrics);
            expect(type).toBe('regular');
        });

        test('should classify small wallet correctly', () => {
            const metrics = {
                total_spent_eth: 0.5,
                total_interactions: 3,
                unique_contracts: 2,
                avg_transaction_size: 0.1
            };

            const type = calculator.classifyWalletType(metrics);
            expect(type).toBe('small');
        });
    });

    describe('classifyActivityPattern', () => {
        test('should classify power user correctly', () => {
            const metrics = {
                interaction_frequency: 2,
                total_interactions: 150,
                unique_contracts: 15,
                days_active: 100
            };

            const pattern = calculator.classifyActivityPattern(metrics);
            expect(pattern).toBe('power_user');
        });

        test('should classify regular user correctly', () => {
            const metrics = {
                interaction_frequency: 0.5,
                total_interactions: 50,
                unique_contracts: 8,
                days_active: 60
            };

            const pattern = calculator.classifyActivityPattern(metrics);
            expect(pattern).toBe('regular');
        });

        test('should classify occasional user correctly', () => {
            const metrics = {
                interaction_frequency: 0.05,
                total_interactions: 8,
                unique_contracts: 3,
                days_active: 20
            };

            const pattern = calculator.classifyActivityPattern(metrics);
            expect(pattern).toBe('occasional');
        });

        test('should classify one-time user correctly', () => {
            const metrics = {
                interaction_frequency: 0.01,
                total_interactions: 2,
                unique_contracts: 1,
                days_active: 1
            };

            const pattern = calculator.classifyActivityPattern(metrics);
            expect(pattern).toBe('one_time');
        });
    });

    describe('calculateLoyaltyScore', () => {
        test('should calculate high loyalty score for loyal users', () => {
            const metrics = {
                unique_contracts: 15,
                total_interactions: 100,
                days_active: 200,
                repeat_interactions: 85
            };

            const score = calculator.calculateLoyaltyScore(metrics);
            expect(score).toBeGreaterThan(70);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should calculate low loyalty score for one-time users', () => {
            const metrics = {
                unique_contracts: 2,
                total_interactions: 2,
                days_active: 1,
                repeat_interactions: 0
            };

            const score = calculator.calculateLoyaltyScore(metrics);
            expect(score).toBeLessThan(30);
            expect(score).toBeGreaterThanOrEqual(0);
        });
    });
});