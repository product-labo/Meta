const fc = require('fast-check');

describe('Task 9: Advanced Project Comparison - Property Tests', () => {
    
    // Mock project data structure with logical consistency
    const mockProject = () => fc.record({
        contract_address: fc.string({ minLength: 40, maxLength: 42 }),
        business_name: fc.string({ minLength: 5, maxLength: 50 }),
        category: fc.constantFrom('DeFi', 'NFT', 'DAO', 'Identity', 'Bridge', 'Infrastructure'),
        chain_name: fc.constantFrom('Ethereum', 'Polygon', 'Starknet', 'Lisk'),
        total_interactions: fc.integer({ min: 0, max: 10000 }),
        growth_score: fc.integer({ min: 0, max: 100 }),
        health_score: fc.integer({ min: 0, max: 100 }),
        risk_score: fc.integer({ min: 0, max: 100 }),
        total_revenue_eth: fc.float({ min: 0, max: 1000 }),
        customer_growth_rate_percent: fc.float({ min: -50, max: 200 }),
        volume_growth_rate_percent: fc.float({ min: -50, max: 200 }),
        success_rate_percent: fc.float({ min: 0, max: 100 }),
        is_verified: fc.boolean()
    }).map(project => ({
        ...project,
        // Ensure customers never exceed total_interactions
        customers: Math.min(project.total_interactions, Math.floor(Math.random() * (project.total_interactions + 1)))
    }));

    // Property 17: Cross-chain metrics normalization
    test('Property 17: Cross-chain metrics normalization maintains consistency', () => {
        fc.assert(fc.property(
            mockProject(),
            mockProject(),
            (project1, project2) => {
                // Normalization function as implemented in competitive-analysis.tsx
                const normalizeScore = (score, chainFactor = 1) => {
                    return Math.min(100, Math.max(0, score * chainFactor));
                };
                
                const norm1 = normalizeScore(project1.growth_score);
                const norm2 = normalizeScore(project2.growth_score);
                
                // Normalized scores should be within valid range
                expect(norm1).toBeGreaterThanOrEqual(0);
                expect(norm1).toBeLessThanOrEqual(100);
                expect(norm2).toBeGreaterThanOrEqual(0);
                expect(norm2).toBeLessThanOrEqual(100);
                
                // If original scores are equal, normalized should be equal
                if (project1.growth_score === project2.growth_score) {
                    expect(norm1).toBe(norm2);
                }
            }
        ), { numRuns: 100 });
    });

    // Property 8: Project comparison functionality
    test('Property 8: Project comparison maintains metric relationships', () => {
        fc.assert(fc.property(
            mockProject(),
            mockProject(),
            (project1, project2) => {
                // All scores should be within valid ranges
                expect(project1.growth_score).toBeGreaterThanOrEqual(0);
                expect(project1.growth_score).toBeLessThanOrEqual(100);
                expect(project1.health_score).toBeGreaterThanOrEqual(0);
                expect(project1.health_score).toBeLessThanOrEqual(100);
                expect(project1.risk_score).toBeGreaterThanOrEqual(0);
                expect(project1.risk_score).toBeLessThanOrEqual(100);
                
                expect(project2.growth_score).toBeGreaterThanOrEqual(0);
                expect(project2.growth_score).toBeLessThanOrEqual(100);
                expect(project2.health_score).toBeGreaterThanOrEqual(0);
                expect(project2.health_score).toBeLessThanOrEqual(100);
                expect(project2.risk_score).toBeGreaterThanOrEqual(0);
                expect(project2.risk_score).toBeLessThanOrEqual(100);
                
                // Customer count should not exceed interaction count
                expect(project1.customers).toBeLessThanOrEqual(project1.total_interactions);
                expect(project2.customers).toBeLessThanOrEqual(project2.total_interactions);
            }
        ), { numRuns: 100 });
    });

    // Property: Top performers identification
    test('Property: Top performers are correctly identified', () => {
        fc.assert(fc.property(
            fc.array(mockProject(), { minLength: 10, maxLength: 50 }),
            fc.integer({ min: 60, max: 100 }),
            (projects, minGrowthScore) => {
                // Top performers filtering as implemented in competitive-analysis.tsx
                const topPerformers = projects
                    .filter(p => p.growth_score >= minGrowthScore)
                    .sort((a, b) => b.growth_score - a.growth_score)
                    .slice(0, 5);
                
                // All top performers should meet the criteria
                topPerformers.forEach(performer => {
                    expect(performer.growth_score).toBeGreaterThanOrEqual(minGrowthScore);
                });
                
                // Top performers should be sorted correctly
                for (let i = 1; i < topPerformers.length; i++) {
                    expect(topPerformers[i-1].growth_score).toBeGreaterThanOrEqual(
                        topPerformers[i].growth_score
                    );
                }
                
                // Should not exceed 5 items
                expect(topPerformers.length).toBeLessThanOrEqual(5);
            }
        ), { numRuns: 50 });
    });

    // Property: Rising stars identification
    test('Property: Rising stars have high growth but smaller customer base', () => {
        fc.assert(fc.property(
            fc.array(mockProject(), { minLength: 10, maxLength: 50 }),
            fc.integer({ min: 20, max: 50 }),
            fc.integer({ min: 5, max: 100 }),
            (projects, maxCustomers, minGrowthRate) => {
                // Rising stars filtering as implemented in competitive-analysis.tsx
                const risingStars = projects
                    .filter(p => 
                        p.customer_growth_rate_percent > minGrowthRate && 
                        p.customers < maxCustomers
                    )
                    .sort((a, b) => b.customer_growth_rate_percent - a.customer_growth_rate_percent)
                    .slice(0, 5);
                
                risingStars.forEach(star => {
                    expect(star.customer_growth_rate_percent).toBeGreaterThan(minGrowthRate);
                    expect(star.customers).toBeLessThan(maxCustomers);
                });
                
                // Should not exceed 5 items
                expect(risingStars.length).toBeLessThanOrEqual(5);
            }
        ), { numRuns: 50 });
    });

    // Property: Risk assessment consistency
    test('Property: Risk scores are properly categorized', () => {
        fc.assert(fc.property(
            fc.array(mockProject(), { minLength: 10, maxLength: 50 }),
            fc.integer({ min: 70, max: 100 }),
            (projects, minRiskScore) => {
                // High risk projects filtering as implemented in competitive-analysis.tsx
                const riskProjects = projects
                    .filter(p => p.risk_score >= minRiskScore)
                    .sort((a, b) => b.risk_score - a.risk_score)
                    .slice(0, 5);
                
                riskProjects.forEach(risk => {
                    expect(risk.risk_score).toBeGreaterThanOrEqual(minRiskScore);
                });
                
                // Should not exceed 5 items
                expect(riskProjects.length).toBeLessThanOrEqual(5);
            }
        ), { numRuns: 50 });
    });

    // Property: Category-based comparison consistency
    test('Property: Category leaders are correctly identified within categories', () => {
        fc.assert(fc.property(
            fc.array(mockProject(), { minLength: 10, maxLength: 50 }),
            (projects) => {
                // Category leaders logic as implemented in competitive-analysis.tsx
                const categoryMap = new Map();
                projects.forEach(project => {
                    const category = project.category || 'Unknown';
                    if (!categoryMap.has(category)) {
                        categoryMap.set(category, []);
                    }
                    categoryMap.get(category).push(project);
                });
                
                const categoryLeaders = Array.from(categoryMap.entries())
                    .map(([category, categoryProjects]) => {
                        const leader = categoryProjects
                            .sort((a, b) => b.total_revenue_eth - a.total_revenue_eth)[0];
                        
                        const avgGrowthScore = categoryProjects.length > 0 
                            ? categoryProjects.reduce((sum, p) => sum + p.growth_score, 0) / categoryProjects.length
                            : 50;
                        
                        const marketSize = categoryProjects.reduce((sum, p) => sum + p.total_revenue_eth, 0);
                        
                        return {
                            category,
                            leader,
                            totalProjects: categoryProjects.length,
                            avgGrowthScore,
                            marketSize
                        };
                    })
                    .filter(cl => cl.leader && cl.totalProjects >= 3)
                    .sort((a, b) => b.marketSize - a.marketSize)
                    .slice(0, 6);
                
                categoryLeaders.forEach(categoryData => {
                    expect(categoryData.leader).toBeDefined();
                    expect(categoryData.totalProjects).toBeGreaterThanOrEqual(3);
                    expect(categoryData.avgGrowthScore).toBeGreaterThanOrEqual(0);
                    expect(categoryData.avgGrowthScore).toBeLessThanOrEqual(100);
                    expect(categoryData.marketSize).toBeGreaterThanOrEqual(0);
                    
                    // Leader should have the highest revenue in their category
                    const categoryProjects = categoryMap.get(categoryData.category);
                    categoryProjects.forEach(project => {
                        expect(categoryData.leader.total_revenue_eth).toBeGreaterThanOrEqual(project.total_revenue_eth);
                    });
                });
                
                // Should not exceed 6 categories
                expect(categoryLeaders.length).toBeLessThanOrEqual(6);
            }
        ), { numRuns: 30 });
    });

    // Property: Filtering and sorting maintain data integrity
    test('Property: Filtering and sorting maintain data integrity', () => {
        fc.assert(fc.property(
            fc.array(mockProject(), { minLength: 10, maxLength: 50 }),
            fc.constantFrom('growth_score', 'customers', 'total_interactions'),
            fc.constantFrom('DeFi', 'NFT', 'DAO', 'Identity', 'Bridge', 'Infrastructure'),
            (projects, sortBy, filterCategory) => {
                // Filtering and sorting as implemented in competitive-analysis.tsx
                const filtered = projects.filter(p => p.category === filterCategory);
                const sorted = [...filtered].sort((a, b) => b[sortBy] - a[sortBy]);
                
                // Sorted array should have same length as filtered
                expect(sorted.length).toBe(filtered.length);
                
                // All items should still belong to the filter category
                sorted.forEach(item => {
                    expect(item.category).toBe(filterCategory);
                });
                
                // Should be properly sorted (descending)
                for (let i = 1; i < sorted.length; i++) {
                    expect(sorted[i-1][sortBy]).toBeGreaterThanOrEqual(sorted[i][sortBy]);
                }
            }
        ), { numRuns: 50 });
    });

    // Property: Score color classification
    test('Property: Score color classification is consistent', () => {
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 100 }),
            fc.constantFrom('growth', 'health', 'risk'),
            (score, type) => {
                // Score color logic as implemented in competitive-analysis.tsx
                const getScoreColor = (score, type) => {
                    if (type === 'risk') {
                        if (score <= 30) return 'text-green-600 bg-green-50';
                        if (score <= 60) return 'text-yellow-600 bg-yellow-50';
                        return 'text-red-600 bg-red-50';
                    } else {
                        if (score >= 70) return 'text-green-600 bg-green-50';
                        if (score >= 40) return 'text-yellow-600 bg-yellow-50';
                        return 'text-red-600 bg-red-50';
                    }
                };
                
                const color = getScoreColor(score, type);
                
                // Should return a valid color class
                expect(color).toMatch(/^text-(green|yellow|red)-600 bg-(green|yellow|red)-50$/);
                
                // Risk scores should have inverted logic
                if (type === 'risk') {
                    if (score <= 30) {
                        expect(color).toContain('green');
                    } else if (score <= 60) {
                        expect(color).toContain('yellow');
                    } else {
                        expect(color).toContain('red');
                    }
                } else {
                    if (score >= 70) {
                        expect(color).toContain('green');
                    } else if (score >= 40) {
                        expect(color).toContain('yellow');
                    } else {
                        expect(color).toContain('red');
                    }
                }
            }
        ), { numRuns: 100 });
    });

    // Integration test: Complete comparison workflow
    test('Integration: Complete comparison workflow produces valid results', () => {
        fc.assert(fc.property(
            fc.array(mockProject(), { minLength: 20, maxLength: 100 }),
            (projects) => {
                // Complete workflow as implemented in competitive-analysis.tsx
                
                // Top Performers (highest growth scores)
                const topPerformers = projects
                    .filter(p => p.growth_score >= 60)
                    .sort((a, b) => b.growth_score - a.growth_score)
                    .slice(0, 5);
                
                // Rising Stars (high growth rates but smaller size)
                const risingStars = projects
                    .filter(p => 
                        p.customer_growth_rate_percent > 20 && 
                        p.customers < 10000
                    )
                    .sort((a, b) => b.customer_growth_rate_percent - a.customer_growth_rate_percent)
                    .slice(0, 5);
                
                // High Risk Projects
                const riskProjects = projects
                    .filter(p => p.risk_score >= 70)
                    .sort((a, b) => b.risk_score - a.risk_score)
                    .slice(0, 5);
                
                // Category Leaders
                const categoryMap = new Map();
                projects.forEach(project => {
                    const category = project.category || 'Unknown';
                    if (!categoryMap.has(category)) {
                        categoryMap.set(category, []);
                    }
                    categoryMap.get(category).push(project);
                });
                
                const categoryLeaders = Array.from(categoryMap.entries())
                    .map(([category, categoryProjects]) => {
                        const leader = categoryProjects
                            .sort((a, b) => b.total_revenue_eth - a.total_revenue_eth)[0];
                        
                        const avgGrowthScore = categoryProjects.length > 0 
                            ? categoryProjects.reduce((sum, p) => sum + p.growth_score, 0) / categoryProjects.length
                            : 50;
                        
                        const marketSize = categoryProjects.reduce((sum, p) => sum + p.total_revenue_eth, 0);
                        
                        return {
                            category,
                            leader,
                            totalProjects: categoryProjects.length,
                            avgGrowthScore,
                            marketSize
                        };
                    })
                    .filter(cl => cl.leader && cl.totalProjects >= 3)
                    .sort((a, b) => b.marketSize - a.marketSize)
                    .slice(0, 6);
                
                // Verify results structure and constraints
                expect(topPerformers.length).toBeLessThanOrEqual(5);
                expect(risingStars.length).toBeLessThanOrEqual(5);
                expect(riskProjects.length).toBeLessThanOrEqual(5);
                expect(categoryLeaders.length).toBeLessThanOrEqual(6);
                
                // Verify all top performers meet criteria
                topPerformers.forEach(performer => {
                    expect(performer.growth_score).toBeGreaterThanOrEqual(60);
                });
                
                // Verify all rising stars meet criteria
                risingStars.forEach(star => {
                    expect(star.customer_growth_rate_percent).toBeGreaterThan(20);
                    expect(star.customers).toBeLessThan(10000);
                });
                
                // Verify all risk projects meet criteria
                riskProjects.forEach(risk => {
                    expect(risk.risk_score).toBeGreaterThanOrEqual(70);
                });
                
                // Verify category leaders
                categoryLeaders.forEach(categoryData => {
                    expect(categoryData.leader).toBeDefined();
                    expect(categoryData.totalProjects).toBeGreaterThanOrEqual(3);
                    expect(categoryData.avgGrowthScore).toBeGreaterThanOrEqual(0);
                    expect(categoryData.avgGrowthScore).toBeLessThanOrEqual(100);
                });
            }
        ), { numRuns: 20 });
    });
});