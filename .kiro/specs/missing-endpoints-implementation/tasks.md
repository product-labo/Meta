# Implementation Plan: Missing Endpoints Implementation

## Overview

This implementation plan systematically addresses the **83% gap** in backend endpoints by implementing **125+ missing endpoints** across **11 major functional areas**. Based on comprehensive frontend analysis from `FRONTEND_BACKEND_ENDPOINT_GAP_ANALYSIS.md`, this plan ensures perfect alignment between frontend requirements and backend implementation.

## Database Status ✅ (95% COMPLETE)

**EXCELLENT NEWS: Database Infrastructure Ready**
The database engineer has implemented comprehensive infrastructure with **real blockchain data**:

✅ **FULLY IMPLEMENTED TABLES:**
- `mc_transaction_details` - **Real blockchain data** (Ethereum, Lisk, Starknet)
- `project_metrics_realtime` - Analytics storage with **real metrics**
- `wallet_metrics_realtime` - Wallet behavior and financial metrics
- `bi_contract_index` - Business intelligence contracts with **real data**
- `alerts` - Notification system infrastructure ready
- `watchlist` - Project bookmarking system ready
- `profiles` - User management complete
- `users` - Authentication system complete
- `projects` - Project management complete

**🎯 Key Advantage**: All database tables exist with real blockchain data. We can immediately implement endpoints using existing data infrastructure.

## Tasks

### Phase 1: Replace Mock Data with Real Database Queries (Week 1)

- [ ] 1. Audit and replace mock data in existing controllers
  - Replace mock data in `analyticsController.ts` with real database queries
  - Update `getStartupOverview()` to use `mc_transaction_details` for real metrics
  - Update `getTransactionalInsights()` to calculate from blockchain data
  - Update `getWalletIntelligence()` to use `wallet_metrics_realtime`
  - _Requirements: 1.1, 2.1, 6.1_

- [ ]* 1.1 Write property test for analytics data consistency
  - **Property 1: Analytics Data Consistency**
  - **Validates: Requirements 1.1, 2.1, 6.1**

- [ ] 2. Create data aggregation service
  - Build service to populate `project_metrics_realtime` from `mc_transaction_details`
  - Create wallet metrics calculation from transaction data
  - Implement real-time metric updates
  - _Requirements: 1.1, 2.1, 6.1_

### Phase 2: Startup Overview Analytics (High Priority - Week 1-2)

- [ ] 3. Implement Startup Overview Page Analytics (`/startup`)
  - [ ] 3.1 Real-time metrics cards implementation
    - Implement GET /api/projects/:id/analytics/overview
    - Query `mc_transaction_details` for active wallet counts using `from_address`
    - Calculate transaction volume from `transaction_value` field
    - Calculate revenue from `gas_fee_eth` and transaction fees
    - _Requirements: 1.1_

  - [ ] 3.2 Retention charts implementation
    - Implement GET /api/projects/:id/analytics/retention-chart
    - Use `block_timestamp` in `mc_transaction_details` for weekly retention analysis
    - Calculate user return patterns from blockchain transaction history
    - _Requirements: 1.2_

  - [ ] 3.3 Success/fail transaction ratios
    - Implement GET /api/projects/:id/analytics/transaction-success-rate
    - Use `status` field in `mc_transaction_details` for success/fail categorization
    - Create stacked bar chart data for weekly success rates
    - _Requirements: 1.3_

  - [ ] 3.4 Feature usage analytics (swap, bridge, transfer)
    - Implement GET /api/projects/:id/analytics/feature-usage
    - Analyze `function_name` field in `mc_transaction_details`
    - Create donut chart data showing swap, bridge, transfer percentages
    - _Requirements: 1.4_

  - [ ] 3.5 TAM/SAM/SOM calculations
    - Implement GET /api/projects/:id/analytics/tam-sam-som
    - Use `bi_contract_categories` and market data for calculations
    - Calculate addressable market based on category metrics
    - _Requirements: 1.6_

  - [ ] 3.6 Country-based analytics
    - Implement GET /api/projects/:id/analytics/country-stats
    - Create geographic analysis using wallet clustering from `mc_transaction_details`
    - Calculate drop-off rates by geographic regions
    - _Requirements: 1.5_

  - [ ] 3.7 Flow in/out analysis
    - Implement GET /api/projects/:id/analytics/flow-analysis
    - Track money flow using `transaction_value` and `from_address`/`to_address`
    - Calculate net flow and create line chart data
    - _Requirements: 1.7_

  - [ ]* 3.8 Write property tests for startup overview analytics
    - **Property 2: Startup Metrics Calculation Accuracy**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Phase 3: Transaction Analytics Implementation (Week 2)

- [ ] 4. Implement Transactions Page Analytics (`/startup/transactions`)
  - [ ] 4.1 Transaction volume tracking
    - Implement GET /api/projects/:id/analytics/transaction-volume
    - Aggregate `transaction_value` from `mc_transaction_details` by time periods
    - Create area chart data for transaction volume over time
    - _Requirements: 2.1_

  - [ ] 4.2 Gas fee analysis
    - Implement GET /api/projects/:id/analytics/gas-analysis
    - Use `gas_fee_eth` and `gas_fee_usd` from `mc_transaction_details`
    - Calculate average gas fees and trends over time
    - _Requirements: 2.2_

  - [ ] 4.3 Failed transaction categorization
    - Implement GET /api/projects/:id/analytics/failed-transactions
    - Parse `error_message` field for failure type classification
    - Create donut chart data: gas limits, reverts, other errors
    - _Requirements: 2.3_

  - [ ] 4.4 Top revenue wallets ranking
    - Implement GET /api/projects/:id/analytics/top-revenue-wallets
    - Aggregate transaction values by `from_address` from `mc_transaction_details`
    - Create table data with wallet rankings and transaction counts
    - _Requirements: 2.4_

  - [ ] 4.5 Gas fee trends over time
    - Implement GET /api/projects/:id/analytics/gas-trends
    - Track gas fee changes using `gas_fee_eth` over `block_timestamp`
    - Create line chart data for gas fee trends
    - _Requirements: 2.5_

  - [ ]* 4.6 Write property tests for transaction analytics
    - **Property 3: Transaction Volume Aggregation Accuracy**
    - **Validates: Requirements 2.1, 2.2, 2.4**

### Phase 4: Advanced Analytics - Insights, Users, Wallet Intelligence (Week 2-3)

- [ ] 5. Implement Insights Page Analytics (`/startup/insights`)
  - [ ] 5.1 Behavioral cohort analysis
    - Implement GET /api/projects/:id/analytics/cohorts
    - Use `mc_transaction_details` to segment users by first transaction date
    - Create 4 different cohort cards with metrics (referral, organic, paid, enterprise)
    - _Requirements: 5.1_

  - [ ] 5.2 Conversion funnel tracking
    - Implement GET /api/projects/:id/analytics/conversion-funnel
    - Analyze transaction progression using `function_name` patterns
    - Create funnel chart data and conversion metrics
    - _Requirements: 5.3_

  - [ ] 5.3 Feature adoption analytics
    - Implement GET /api/projects/:id/analytics/feature-adoption
    - Track feature usage patterns from `mc_transaction_details`
    - Create 12 insight cards with adoption metrics and trends
    - _Requirements: 5.4_

  - [ ] 5.4 Share/Export functionality
    - Implement POST /api/exports/request
    - Implement GET /api/exports/:id/status
    - Implement GET /api/exports/:id/download
    - Support CSV, PDF, JSON formats for analytics data
    - _Requirements: 8.1, 8.3, 8.4_

- [ ] 6. Implement Users Page Analytics (`/startup/users`)
  - [ ] 6.1 User retention and churn analysis
    - Implement GET /api/projects/:id/users/retention
    - Implement GET /api/projects/:id/users/churn
    - Calculate retention rates and churn patterns from transaction history
    - _Requirements: 5.2_

  - [ ] 6.2 Activity funnel tracking
    - Implement GET /api/projects/:id/users/funnel
    - Track 4-step onboarding journey with progress bars
    - Calculate drop-off rates at each step
    - _Requirements: 5.3_

  - [ ] 6.3 Cohort retention matrix
    - Implement GET /api/projects/:id/users/cohorts
    - Create 5-week cohort analysis with color-coded percentages
    - Use transaction patterns for retention calculations
    - _Requirements: 5.1_

  - [ ] 6.4 User lifetime value calculations
    - Implement GET /api/projects/:id/users/lifetime-value
    - Calculate LTV using `transaction_value` aggregation per wallet
    - Factor in transaction frequency and average transaction size
    - _Requirements: 5.5_

- [ ] 7. Implement Wallet Intelligence Page (`/startup/wallet`)
  - [ ] 7.1 Wallet metrics dashboard
    - Implement GET /api/projects/:id/wallets/metrics
    - Use `wallet_metrics_realtime` for performance indicators
    - Display comprehensive wallet activity tracking
    - _Requirements: 6.1_

  - [ ] 7.2 Wallet comparison system
    - Implement GET /api/projects/:id/wallets/comparison
    - Compare wallets using `wallet_metrics_realtime` data
    - Create side-by-side analysis interface
    - _Requirements: 6.2_

  - [ ] 7.3 Wallet activity tracking
    - Implement GET /api/projects/:id/wallets/activity
    - Track transaction patterns and behavior from `mc_transaction_details`
    - Analyze interaction frequency and timing patterns
    - _Requirements: 6.4_

  - [ ] 7.4 Bridge analytics
    - Implement GET /api/projects/:id/wallets/bridges
    - Analyze cross-chain transactions in `mc_transaction_details`
    - Track bridge transactions by function signatures
    - _Requirements: 6.3_

  - [ ] 7.5 Wallet insights
    - Implement GET /api/projects/:id/wallets/insights
    - Generate intelligent insights from wallet behavior patterns
    - Use machine learning for wallet classification
    - _Requirements: 6.5_

  - [ ]* 7.6 Write property tests for wallet intelligence
    - **Property 4: Wallet Metrics Aggregation Accuracy**
    - **Validates: Requirements 6.1, 6.2, 6.4**

### Phase 5: Productivity and Notification Systems (Week 3)

- [ ] 8. Implement Productivity Page (`/startup/productivity`)
  - [ ] 8.1 Productivity score calculation (0-100)
    - Implement GET /api/projects/:id/productivity/score
    - Use `growth_score`, `health_score`, `error_rate` from `project_metrics_realtime`
    - Create donut chart visualization with operational score
    - _Requirements: 7.1_

  - [ ] 8.2 Pillar breakdown analysis (5 categories)
    - Implement GET /api/projects/:id/productivity/pillars
    - Track feature stability, alert response, resolution efficiency
    - Use `success_rate_percent`, `uptime_percentage` from metrics tables
    - _Requirements: 7.2_

  - [ ] 8.3 7-day trend analysis
    - Implement GET /api/projects/:id/productivity/trends
    - Use `project_metrics_daily` for historical productivity tracking
    - Create line chart data for productivity trends
    - _Requirements: 7.5_

  - [ ] 8.4 Auto-generated tasks (5 pending tasks)
    - Implement GET /api/projects/:id/productivity/tasks
    - Create task auto-generation from alerts and low productivity scores
    - Display tasks with priority indicators and checkboxes
    - _Requirements: 4.1_

  - [ ]* 8.5 Write property tests for productivity scoring
    - **Property 5: Productivity Score Calculation Accuracy**
    - **Validates: Requirements 7.1, 7.2**

- [ ] 9. Implement Notifications Page (`/startup/notifications`)
  - [ ] 9.1 Real-time alerts system (2 alert cards)
    - Implement GET /api/notifications/alerts using existing `alerts` table
    - Create alert cards with severity indicators and action buttons
    - Use `type`, `condition`, `threshold` fields from alerts table
    - _Requirements: 3.1, 3.2_

  - [ ] 9.2 Alert actions ("Investigate" and "Create Task")
    - Implement POST /api/notifications/alerts for alert creation
    - Implement PUT /api/notifications/:id/status for alert management
    - Link alerts to task creation workflow
    - _Requirements: 3.3, 3.4_

  - [ ] 9.3 Task management CRUD interface
    - Implement GET /api/tasks, POST /api/tasks, PUT /api/tasks/:id, DELETE /api/tasks/:id
    - Create task table with status, due dates, impact tracking
    - Add task status management (overdue, in-progress, completed)
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ] 9.4 Task search and filtering
    - Implement GET /api/tasks/search with command palette functionality
    - Implement GET /api/tasks/filter for status-based filtering
    - Add advanced search capabilities for task descriptions
    - _Requirements: 4.2_

  - [ ]* 9.5 Write property tests for notification system
    - **Property 6: Alert Generation and Task Management Accuracy**
    - **Validates: Requirements 3.1, 3.2, 4.1, 4.2**

### Phase 6: Dashboard and Project Management Enhancement (Week 3-4)

- [ ] 10. Implement Dashboard Page Enhancements (`/dashboard`)
  - [ ] 10.1 Advanced project filtering
    - Implement GET /api/projects/filter with advanced criteria
    - Use existing `category`, `status`, `tags` fields from projects table
    - Add multi-criteria filtering with search functionality
    - _Requirements: 9.1_

  - [ ] 10.2 Advanced project sorting
    - Implement GET /api/projects/sort with multiple criteria
    - Sort by customers, revenue, transactions, health scores
    - Use metrics from `project_metrics_realtime` for sorting
    - _Requirements: 9.2_

  - [ ] 10.3 Project bookmarking system
    - Implement POST /api/projects/:id/bookmark using existing `watchlist` table
    - Implement GET /api/projects/bookmarks
    - Use existing `user_id`, `project_id`, `created_at` fields
    - _Requirements: 9.4_

  - [ ] 10.4 Project health status
    - Implement GET /api/projects/:id/health-status
    - Use `health_score` from `project_metrics_realtime`
    - Calculate health based on transaction success rates and activity
    - _Requirements: 9.4_

  - [ ] 10.5 Monitoring dashboard
    - Implement GET /api/monitoring/dashboard
    - Create system health monitoring interface
    - Display 8 dashboard metrics with trend indicators
    - _Requirements: 9.5_

  - [ ]* 10.6 Write property tests for project management
    - **Property 7: Multi-Criteria Filtering and Sorting Accuracy**
    - **Validates: Requirements 9.1, 9.2**

### Phase 7: Authentication and Profile Management (Week 4)

- [ ] 11. Implement Settings Page and Profile Management (`/settings`)
  - [ ] 11.1 Profile management system
    - Implement GET /api/profile using existing `profiles` table
    - Implement PUT /api/profile for profile updates
    - Use existing `display_name`, `avatar_url`, `bio` fields
    - _Requirements: 10.2_

  - [ ] 11.2 Profile picture upload
    - Implement POST /api/profile/avatar
    - Handle image upload with validation (JPG, GIF, PNG, max 800K)
    - Update `avatar_url` field in profiles table
    - _Requirements: 10.2_

  - [ ] 11.3 Security settings
    - Implement PUT /api/auth/change-password
    - Add password change functionality with validation
    - Integrate with existing authentication system
    - _Requirements: 10.3_

  - [ ] 11.4 Settings management
    - Implement GET /api/settings and PUT /api/settings
    - Use `preferences` field in `profiles` table
    - Add role-based access controls using existing `roles` in `users` table
    - _Requirements: 10.3, 10.5_

- [ ] 12. Implement Enhanced Authentication
  - [ ] 12.1 OAuth integration (Google, GitHub)
    - Implement GET /auth/oauth/:provider
    - Implement GET /auth/oauth/:provider/callback
    - Integrate with existing `users` table structure
    - _Requirements: 10.1_

  - [ ] 12.2 Social login API
    - Implement POST /api/auth/social-login
    - Handle OAuth provider authentication flow
    - Create or update user records in existing tables
    - _Requirements: 10.1_

  - [ ]* 12.3 Write property tests for authentication
    - **Property 8: OAuth Authentication Flow Integrity**
    - **Validates: Requirements 10.1**

### Phase 8: Onboarding Flow Enhancement (Week 4)

- [ ] 13. Implement Onboarding Flow APIs
  - [ ] 13.1 Role selection API
    - Implement POST /api/onboarding/role
    - Handle startup vs researcher role selection
    - Update user roles in existing `users` table
    - _Requirements: 11.1_

  - [ ] 13.2 Company details submission
    - Implement POST /api/onboarding/company
    - Handle startup form submission with validation
    - Store company details in existing `profiles` table
    - _Requirements: 11.2_

  - [ ] 13.3 Wallet connection integration
    - Implement POST /api/onboarding/wallet
    - Handle wallet integration with connection status
    - Link wallets to user accounts in existing infrastructure
    - _Requirements: 11.3_

### Phase 9: System Integration and Real-time Features (Week 4-5)

- [ ] 14. Implement Real-time WebSocket Connections
  - [ ] 14.1 Live notifications WebSocket
    - Add WebSocket support for live notifications using `alerts` table
    - Stream real-time alerts to frontend notification components
    - Implement connection management and reconnection logic
    - _Requirements: 3.1, 1.1_

  - [ ] 14.2 Real-time metric updates
    - Implement real-time metric updates from `project_metrics_realtime`
    - Stream transaction updates from `mc_transaction_details`
    - Update frontend dashboards with live data
    - _Requirements: 1.1, 2.1_

- [ ] 15. Performance Optimization and Caching
  - [ ] 15.1 Redis caching implementation
    - Add Redis caching for frequently accessed analytics data
    - Cache results from `project_metrics_realtime` and `wallet_metrics_realtime`
    - Implement cache invalidation strategies
    - _Requirements: All requirements_

  - [ ] 15.2 Database query optimization
    - Optimize database queries using existing indexes
    - Add query performance monitoring
    - Implement connection pooling and query optimization
    - _Requirements: All requirements_

### Phase 10: Final Integration and Testing (Week 5)

- [ ] 16. Complete Frontend Integration
  - [ ] 16.1 Update frontend API client
    - Update `api.ts` with all 125+ new endpoints
    - Replace all mock data calls with real API calls
    - Test all frontend pages with real backend data
    - _Requirements: All requirements_

  - [ ] 16.2 End-to-end testing
    - Test complete user journeys using real database data
    - Validate all API endpoints work together correctly
    - Test data consistency across all analytics tables
    - _Requirements: All requirements_

  - [ ]* 16.3 Write comprehensive integration tests
    - **Property 9: End-to-End System Integrity**
    - **Validates: All requirements**

- [ ] 17. Final System Validation
  - Ensure all 125+ endpoints are implemented and functional
  - Verify frontend integration works seamlessly with real data
  - Confirm all mock data has been replaced with real calculations
  - Validate system performance under load using existing database infrastructure

## Implementation Priority Summary

### **Week 1: Foundation (25 endpoints)**
- Replace mock data with real database queries
- Implement startup overview analytics
- Core transaction analytics

### **Week 2: Core Features (35 endpoints)**
- Complete transaction analytics
- Implement insights page analytics
- User analytics and wallet intelligence

### **Week 3: User Experience (30 endpoints)**
- Productivity scoring system
- Notification and task management
- Dashboard enhancements

### **Week 4: Authentication & Profiles (20 endpoints)**
- Settings and profile management
- OAuth integration
- Onboarding flow APIs

### **Week 5: Integration & Optimization (15 endpoints)**
- Real-time WebSocket features
- Performance optimization
- Final integration and testing

## Success Criteria

✅ **125+ missing endpoints implemented using existing database infrastructure**
✅ **All mock data replaced with real calculations from blockchain data**  
✅ **Frontend integration completed with seamless real-time updates**
✅ **Notification system operational using existing alerts infrastructure**
✅ **Data export functionality working with multi-format support**
✅ **All property tests passing with real data validation**
✅ **Performance benchmarks met using optimized database queries**
✅ **Perfect alignment between frontend requirements and backend implementation**

## Notes

- **Database infrastructure is 95% complete** - focus on business logic and API implementation
- **Real blockchain data available** - use existing `mc_transaction_details` with transaction hashes, gas fees, addresses
- **All major tables ready** - `project_metrics_realtime`, `wallet_metrics_realtime`, `alerts`, `watchlist`, `profiles`
- Tasks marked with `*` are property-based tests that validate universal correctness properties
- Each task references specific requirements for traceability
- Implementation leverages comprehensive existing database schema with real multi-chain data
- Perfect alignment with frontend requirements from comprehensive analysis