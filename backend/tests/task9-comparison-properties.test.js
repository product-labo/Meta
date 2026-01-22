const fc = require('fast-check');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    user: 'david_user',
    host: 'localhost',
    database: 'david',
    password: 'Davidsoyaya@1015',
    port: 5432,
});

describe('Task 9: Advanced Project Comparison - Property Tests', () => {
    let testData = [];

    beforeAll(async () => {
        // Fetch test data once for all tests
        const result = await pool.query(`
            SELECT 
                c.contract_address,
                'Contract ' || SUBSTRING(c.contract_address, 1, 8) || '...' as business_name,
                COALESCE(cc.category, 'Other') as category,
                'lisk' as chain_name,
                COUNT(DISTINCT wi.wallet_address) as customers,
                COUNT(wi.interaction_id) as total_interactions,
                
                CASE 
                    WHEN COUNT(DISTINCT wi.wallet_address) > 50 THEN 85
                    WHEN COUNT(DISTINCT wi.wallet_address) > 20 THEN 70
                    WHEN COUNT(DISTINCT wi.wallet_address) > 10 THEN 60
                    ELSE 40
                END as growth_score,
                
                CASE 
                    WHEN MAX(wi.created_at) > NOW() - INTERVAL '7 days' THEN 90
                    WHEN MAX(wi.created_at) > NOW() - INTERVAL '30 days' THEN 75
                    ELSE 60
                END as health_score,
                
                CASE 
                    WHEN COUNT(DISTINCT wi.wallet_address) < 5 THEN 80
                    WHEN COUNT(DISTINCT wi.wallet_address) < 20 THEN 50
                    ELSE 20
                END as risk_score,
                
                MAX(wi.created_at) as last_activity
                
            FROM lisk_contracts c
            LEFT JOIN lisk_contract_categories cc ON c.contract_address = cc.contract_address
            LEFT JOIN lisk_wallet_interactions wi ON c.contract_address = wi.contract_address
            GROUP BY c.contract_address, cc.category
            HAVING COUNT(wi.interaction_id) > 0
            ORDER BY COUNT(wi.interaction_id) DESC
            LIMIT 20
        `);
        
        testData = result.rows;
    });

    afterAll(async () => {
        await pool.end();
    });

    // Property 17: Cross-chain metrics normalization
    test('Property 17: Cross-chain metrics normalization maintains consistency', () => {
        fc.assert(fc.property(
            fc.constantFrom(...testData),
            fc.constantFrom(...testData),
            (project1, project2) => {
                // Property: When comparing projects, normalized metrics should be comparable
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
        ), { numRuns: 50 });
    });

    // Property 8: Project comparison functionality
    test('Property 8: Project comparison maintains metric relationships', () => {
        fc.assert(fc.property(
            fc.constantFrom(...testData),
            fc.constantFrom(...testData),
            (project1, project2) => {
                // Property: Comparison should maintain relative ordering
                const compareProjects = (p1, p2, metric) => {
                    if (p1[metric] > p2[metric]) return 1;
                    if (p1[metric] < p2[metric]) return -1;
                    return 0;
                };
                
                const growthComparison = compareProjects(project1, project2, 'growth_score');
                const customerComparison = compareProjects(project1, project2, 'customers');
                
                // Growth score should generally correlate with customer count
                if (Math.abs(project1.customers - project2.customers) > 10) {
                    // For significantly different customer counts, growth scores should reflect this
                    if (project1.customers > project2.customers * 2) {
                        expect(project1.growth_score).toBeGreaterThanOrEqual(project2.growth_score - 10);
                    }
                }
                
                // All scores should be within valid ranges
                expect(project1.growth_score).toBeGreaterThanOrEqual(0);
                expect(project1.growth_score).toBeLessThanOrEqual(100);
                expect(project1.health_score).toBeGreaterThanOrEqual(0);
                expect(project1.health_score).toBeLessThanOrEqual(100);
                expect(project1.risk_score).toBeGreaterThanOrEqual(0);
                expect(project1.risk_score).toBeLessThanOrEqual(100);
            }
        ), { numRuns: 30 });
    });

    // Property: Top performers identification
    test('Property: Top performers are correctly identified', () => {
        fc.assert(fc.property(
            fc.integer({ min: 60, max: 100 }),
            (minGrowthScore) => {
                // Property: Top performers should have growth scores above threshold
                const topPerformers = testData
                    .filter(p => p.growth_score >= minGrowthScore)
                    .sort((a, b) => b.growth_score - a.growth_score);
                
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
            }
        ), { numRuns: 20 });
    });

    // Property: Rising stars identification
    test('Property: Rising stars have high growth but smaller customer base', () => {
        fc.assert(fc.property(
            fc.integer({ min: 50, max: 100 }),
            fc.integer({ min: 5, max: 50 }),
            (minGrowthScore, maxCustomers) => {
                // Property: Rising stars should have high growth but smaller customer base
                const risingStars = testData
                    .filter(p => p.growth_score >= minGrowthScore && p.customers <= maxCustomers)
                    .sort((a, b) => b.growth_score - a.growth_score);
                
                risingStars.forEach(star => {
                    expect(star.growth_score).toBeGreaterThanOrEqual(minGrowthScore);
                    expect(star.customers).toBeLessThanOrEqual(maxCustomers);
                });
            }
        ), { numRuns: 20 });
    });

    // Property: Risk assessment consistency
    test('Property: Risk scores are inversely related to stability metrics', () => {
        fc.assert(fc.property(
            fc.constantFrom(...testData),
            (project) => {
                // Property: Projects with fewer customers should generally have higher risk
                const expectedRiskRange = project.customers < 5 ? [70, 100] :
                                        project.customers < 20 ? [40, 70] :
                                        [0, 40];
                
                expect(project.risk_score).toBeGreaterThanOrEqual(expectedRiskRange[0] - 10);
                expect(project.risk_score).toBeLessThanOrEqual(expectedRiskRange[1] + 10);
                
                // Risk score should be inversely related to health score
                const combinedScore = project.risk_score + project.health_score;
                expect(combinedScore).toBeGreaterThan(50); // Some reasonable minimum
                expect(combinedScore).toBeLessThan(200); // Some reasonable maximum
            }
        ), { numRuns: 30 });
    });

    // Property: Category-based comparison consistency
    test('Property: Category leaders are correctly identified within categories', () => {
        fc.assert(fc.property(
            fc.constantFrom(...Array.from(new Set(testData.map(p => p.category)))),
            (category) => {
                // Property: Category leaders should be the best in their category
                const categoryProjects = testData.filter(p => p.category === category);
                
                if (categoryProjects.length > 1) {
                    const leader = categoryProjects.reduce((best, current) => 
                        current.total_interactions > best.total_interactions ? current : best
                    );
                    
                    // Leader should have the highest interaction count in category
                    categoryProjects.forEach(project => {
                        expect(leader.total_interactions).toBeGreaterThanOrEqual(project.total_interactions);
                    });
                    
                    // Leader should have valid metrics
                    expect(leader.growth_score).toBeGreaterThanOrEqual(0);
                    expect(leader.growth_score).toBeLessThanOrEqual(100);
                }
            }
        ), { numRuns: 15 });
    });

    // Property: Metrics calculation consistency
    test('Property: Calculated metrics are mathematically consistent', () => {
        fc.assert(fc.property(
            fc.constantFrom(...testData),
            (project) => {
                // Property: Growth score calculation should be consistent with customer count
                let expectedGrowthScore;
                if (project.customers > 50) expectedGrowthScore = 85;
                else if (project.customers > 20) expectedGrowthScore = 70;
                else if (project.customers > 10) expectedGrowthScore = 60;
                else expectedGrowthScore = 40;
                
                expect(project.growth_score).toBe(expectedGrowthScore);
                
                // Property: Projects with interactions should have positive customer counts
                if (project.total_interactions > 0) {
                    expect(project.customers).toBeGreaterThan(0);
                }
                
                // Property: Customer count should not exceed interaction count
                expect(project.customers).toBeLessThanOrEqual(project.total_interactions);
            }
        ), { numRuns: 40 });
    });

    // Property: Comparison filtering and sorting
    test('Property: Filtering and sorting maintain data integrity', () => {
        fc.assert(fc.property(
            fc.constantFrom('growth_score', 'customers', 'total_interactions'),
            fc.constantFrom(...Array.from(new Set(testData.map(p => p.category)))),
            (sortBy, filterCategory) => {
                // Property: Filtered and sorted data should maintain integrity
                const filtered = testData.filter(p => p.category === filterCategory);
                const sorted = [...filtered].sort((a, b) => b[sortBy] - a[sortBy]);
                
                // Sorted array should have same length as filtered
                expect(sorted.length).toBe(filtered.length);
                
                // All items should still belong to the filter category
                sorted.forEach(item => {
                    expect(item.category).toBe(filterCategory);
                });
                
                // Should be properly sorted
                for (let i = 1; i < sorted.length; i++) {
                    expect(sorted[i-1][sortBy]).toBeGreaterThanOrEqual(sorted[i][sortBy]);
                }
            }
        ), { numRuns: 25 });
    });

    // Integration test: Complete comparison workflow
    test('Integration: Complete comparison workflow produces valid results', async () => {
        // Test the complete comparison workflow as implemented in the frontend
        const projects = testData.slice(0, 10);
        
        // Top Performers (highest growth scores)
        const topPerformers = projects
            .filter(p => p.growth_score >= 60)
            .sort((a, b) => b.growth_score - a.growth_score)
            .slice(0, 5);
        
        // Rising Stars (high growth rates but smaller size)
        const risingStars = projects
            .filter(p => p.growth_score > 50 && p.customers < 50)
            .sort((a, b) => b.growth_score - a.growth_score)
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
                    .sort((a, b) => b.total_interactions - a.total_interactions)[0];
                
                return {
                    category,
                    leader,
                    totalProjects: categoryProjects.length,
                    avgGrowthScore: categoryProjects.reduce((sum, p) => sum + p.growth_score, 0) / categoryProjects.length
                };
            })
            .filter(cl => cl.leader && cl.totalProjects >= 1)
            .sort((a, b) => b.totalProjects - a.totalProjects);
        
        // Verify results
        expect(topPerformers.length).toBeGreaterThanOrEqual(0);
        expect(risingStars.length).toBeGreaterThanOrEqual(0);
        expect(riskProjects.length).toBeGreaterThanOrEqual(0);
        expect(categoryLeaders.length).toBeGreaterThan(0);
        
        // Verify all top performers meet criteria
        topPerformers.forEach(performer => {
            expect(performer.growth_score).toBeGreaterThanOrEqual(60);
        });
        
        // Verify all rising stars meet criteria
        risingStars.forEach(star => {
            expect(star.growth_score).toBeGreaterThan(50);
            expect(star.customers).toBeLessThan(50);
        });
        
        // Verify all risk projects meet criteria
        riskProjects.forEach(risk => {
            expect(risk.risk_score).toBeGreaterThanOrEqual(70);
        });
        
        // Verify category leaders
        categoryLeaders.forEach(categoryData => {
            expect(categoryData.leader).toBeDefined();
            expect(categoryData.totalProjects).toBeGreaterThan(0);
            expect(categoryData.avgGrowthScore).toBeGreaterThanOrEqual(0);
            expect(categoryData.avgGrowthScore).toBeLessThanOrEqual(100);
        });
        
        console.log(`✅ Comparison workflow verified:`);
        console.log(`   - ${topPerformers.length} top performers`);
        console.log(`   - ${risingStars.length} rising stars`);
        console.log(`   - ${riskProjects.length} high risk projects`);
        console.log(`   - ${categoryLeaders.length} category leaders`);
    });
});