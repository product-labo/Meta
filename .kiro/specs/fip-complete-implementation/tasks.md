# Implementation Plan: FIP Complete Implementation

## Overview

This implementation plan breaks down the completion of the MetaGauge FIP frontend into discrete, incremental tasks. Each task builds on previous work and includes testing to validate functionality. The plan focuses on implementing the multi-page sections (Insight Centre, User & Wallet), completing single-page sections, and ensuring consistent navigation, error handling, and responsive design across the application.

## Tasks

- [ ] 1. Set up shared component infrastructure
  - Create reusable loading state components (skeletons, spinners)
  - Create reusable error state components (error boundaries, error displays)
  - Create reusable empty state components
  - Set up custom hooks for API data fetching with error handling and retry logic
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 1.1 Write unit tests for shared components
  - Test loading skeleton rendering
  - Test error boundary error catching and recovery
  - Test empty state display with different messages
  - _Requirements: 10.1, 10.2, 10.4_

- [ ] 2. Implement sub-navigation component for multi-page sections
  - [ ] 2.1 Create SubNavigation component with tab-style navigation
    - Support array of pages with id, label, href, and optional icon
    - Highlight active page based on current route
    - Support keyboard navigation (Tab, Enter, Arrow keys)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 2.2 Write property test for SubNavigation
    - **Property 1: Navigation Consistency**
    - **Validates: Requirements 8.2, 8.3, 11.4**

  - [ ] 2.3 Write unit tests for SubNavigation
    - Test active page highlighting
    - Test keyboard navigation
    - Test click navigation
    - _Requirements: 11.4, 11.5_

- [ ] 3. Extend API client with new endpoints
  - Add insights API methods (cohorts, funnel, features, competitive, predictions, recommendations)
  - Add users API methods (retention, behavior, segments, wallet, lifetime)
  - Add benchmark API methods
  - Add productivity API methods
  - Add transactions API methods
  - Add notifications API methods (list, markAsRead)
  - Add settings API methods (get, update)
  - _Requirements: 1.9, 2.8, 3.2, 4.2, 5.2, 6.2, 7.2_

- [ ] 3.1 Write unit tests for API client methods
  - Test successful API calls
  - Test error handling for network failures
  - Test error handling for 401/403/404/500 responses
  - Test request parameter serialization
  - _Requirements: 10.2_

- [ ] 4. Checkpoint - Ensure infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Insight Centre - Page 1: Behavioral Cohorts
  - [ ] 5.1 Create cohorts page with metrics cards and cohort cards
    - Display 4 top-level metrics (Total Users, Avg Retention, Revenue/Users, Active Cohorts)
    - Display cohort cards in 2x2 grid with risk indicators
    - Display insight cards for key findings
    - Fetch data from insights API
    - _Requirements: 1.2, 1.9_

  - [ ] 5.2 Write property test for cohorts page
    - **Property 4: Data Freshness**
    - **Validates: Requirements 1.9**

  - [ ] 5.3 Write unit tests for cohorts page
    - Test metrics display with mock data
    - Test cohort card rendering
    - Test loading state display
    - Test error state display
    - _Requirements: 1.2, 1.10_

- [ ] 6. Implement Insight Centre - Page 2: Growth & Conversion Funnel
  - [ ] 6.1 Create funnel page with funnel chart and metrics
    - Display filter dropdowns (Date, Segment, Channel)
    - Display funnel visualization chart
    - Display conversion metrics cards
    - Display funnel stage table
    - Fetch data from insights API
    - _Requirements: 1.3, 1.9_

  - [ ] 6.2 Write unit tests for funnel page
    - Test funnel chart rendering with mock data
    - Test filter interactions
    - Test metrics display
    - _Requirements: 1.3_

- [ ] 7. Implement Insight Centre - Page 3: Feature Adoption
  - [ ] 7.1 Create feature adoption page with insight cards and table
    - Display filter buttons (Last 7 Days, 30 Days, Quarter, All Time)
    - Display 12 feature insight cards in 4x3 grid
    - Display feature adoption table with recommendations
    - Fetch data from insights API
    - _Requirements: 1.4, 1.9_

  - [ ] 7.2 Write unit tests for feature adoption page
    - Test insight cards rendering
    - Test table rendering with recommendations
    - Test filter interactions
    - _Requirements: 1.4_

- [ ] 8. Implement Insight Centre - Pages 4-6 (Competitive, Predictions, Recommendations)
  - [ ] 8.1 Create competitive analysis page
    - Display competitor comparison charts
    - Display competitive metrics
    - Fetch data from insights API
    - _Requirements: 1.5, 1.9_

  - [ ] 8.2 Create predictions page
    - Display predictive analytics charts
    - Display forecast metrics
    - Fetch data from insights API
    - _Requirements: 1.6, 1.9_

  - [ ] 8.3 Create recommendations page
    - Display AI-generated recommendations
    - Display actionable insights
    - Fetch data from insights API
    - _Requirements: 1.7, 1.9_

  - [ ] 8.4 Write unit tests for pages 4-6
    - Test competitive page rendering
    - Test predictions page rendering
    - Test recommendations page rendering
    - _Requirements: 1.5, 1.6, 1.7_

- [ ] 9. Implement Insight Centre main page with sub-navigation
  - [ ] 9.1 Update insights main page to include sub-navigation
    - Add SubNavigation component with all 6 pages
    - Ensure consistent layout across all pages
    - Add page header with title and export button
    - _Requirements: 1.1, 1.8, 8.1, 8.2, 8.3_

  - [ ] 9.2 Write property test for Insight Centre navigation
    - **Property 7: Sub-Navigation State**
    - **Validates: Requirements 11.1, 11.3**

- [ ] 10. Checkpoint - Ensure Insight Centre tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement User & Wallet - Page 1: Retention & Churn
  - [ ] 11.1 Create retention page with metrics and visualizations
    - Display 4 top-level metrics (Retention Rate, Churn Rate, Avg Lifetime, Session Duration)
    - Display key insights section with insight cards
    - Display user activity funnel chart
    - Display retention cohort table
    - Fetch data from users API
    - _Requirements: 2.2, 2.8_

  - [ ] 11.2 Write unit tests for retention page
    - Test metrics display
    - Test funnel chart rendering
    - Test cohort table rendering
    - Test insight cards display
    - _Requirements: 2.2, 2.9_

- [ ] 12. Implement User & Wallet - Pages 2-5 (Behavior, Segments, Wallet, Lifetime)
  - [ ] 12.1 Create behavior analysis page
    - Display user behavior patterns
    - Display engagement metrics
    - Fetch data from users API
    - _Requirements: 2.3, 2.8_

  - [ ] 12.2 Create user segments page
    - Display segment breakdown
    - Display segment characteristics
    - Fetch data from users API
    - _Requirements: 2.4, 2.8_

  - [ ] 12.3 Create wallet analytics page
    - Display wallet activity metrics
    - Display transaction patterns
    - Fetch data from users API
    - _Requirements: 2.5, 2.8_

  - [ ] 12.4 Create lifetime value page
    - Display LTV metrics
    - Display revenue projections
    - Fetch data from users API
    - _Requirements: 2.6, 2.8_

  - [ ] 12.5 Write unit tests for pages 2-5
    - Test behavior page rendering
    - Test segments page rendering
    - Test wallet page rendering
    - Test lifetime page rendering
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [ ] 13. Implement User & Wallet main page with sub-navigation
  - [ ] 13.1 Update users main page to include sub-navigation
    - Add SubNavigation component with all 5 pages
    - Ensure consistent layout across all pages
    - Add page header with title and date filter
    - _Requirements: 2.1, 2.7, 8.1, 8.2, 8.3_

  - [ ] 13.2 Write property test for User & Wallet navigation
    - **Property 7: Sub-Navigation State**
    - **Validates: Requirements 11.1, 11.3**

- [ ] 14. Checkpoint - Ensure User & Wallet tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Verify Competitive Benchmark page implementation
  - [ ] 15.1 Review benchmark page against paga design
    - Verify benchmark table tab matches design
    - Verify performance insight tab matches design
    - Verify all metrics and charts are displayed correctly
    - Test tab navigation between views
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 15.2 Connect benchmark page to backend API
    - Replace mock data with API calls
    - Implement data fetching with loading states
    - Implement error handling
    - _Requirements: 3.2, 3.5_

  - [ ] 15.3 Write unit tests for benchmark page
    - Test competitor selection
    - Test comparison chart rendering
    - Test metrics display
    - Test loading and error states
    - _Requirements: 3.1, 3.5, 3.6_

  - [ ] 15.4 Write property test for benchmark page
    - **Property 3: Error Recovery**
    - **Validates: Requirements 10.2, 10.3**

- [ ] 16. Implement Transactional Insight page
  - [ ] 16.1 Create transactions page with metrics and filters
    - Display transaction metrics (success rate, volume, trends)
    - Display transaction type filter
    - Display time range filter
    - Display transaction charts
    - Fetch data from transactions API
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 16.2 Write unit tests for transactions page
    - Test metrics display
    - Test filter interactions
    - Test chart rendering
    - Test loading and error states
    - _Requirements: 4.1, 4.6_

- [ ] 17. Implement Productivity Score page
  - [ ] 17.1 Create productivity page with score breakdown
    - Display overall productivity score
    - Display component score breakdowns
    - Display improvement/decline indicators
    - Display recommendations section
    - Fetch data from productivity API
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 17.2 Write unit tests for productivity page
    - Test score display
    - Test component breakdowns
    - Test recommendations display
    - Test loading and error states
    - _Requirements: 5.1, 5.6_

- [ ] 18. Implement Notification Center page
  - [ ] 18.1 Create notifications page with list and filters
    - Display unread notification count
    - Display notification list with type indicators
    - Implement mark as read functionality
    - Implement notification type filter
    - Fetch data from notifications API
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 18.2 Write property test for notifications
    - **Property 8: Notification Updates**
    - **Validates: Requirements 6.6**

  - [ ] 18.3 Write unit tests for notifications page
    - Test notification list rendering
    - Test mark as read functionality
    - Test filter interactions
    - Test loading and error states
    - _Requirements: 6.1, 6.7_

- [ ] 19. Implement Settings page
  - [ ] 19.1 Create settings page with form sections
    - Display settings form with current values
    - Implement save functionality with API integration
    - Display success/error messages
    - Implement unsaved changes warning
    - Fetch and update data via settings API
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [ ] 19.2 Write property test for settings
    - **Property 9: Settings Persistence**
    - **Validates: Requirements 7.3, 7.4**

  - [ ] 19.3 Write unit tests for settings page
    - Test form rendering with current values
    - Test save functionality
    - Test success/error message display
    - Test unsaved changes warning
    - Test loading and error states
    - _Requirements: 7.1, 7.6_

- [ ] 20. Checkpoint - Ensure all single-page sections tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Implement responsive design for all pages
  - [ ] 21.1 Add responsive breakpoints to all pages
    - Implement mobile layout (< 768px)
    - Implement tablet layout (768px - 1024px)
    - Implement desktop layout (> 1024px)
    - Ensure sidebar collapses on mobile
    - Ensure touch-friendly interactive elements
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 21.2 Write property test for responsive design
    - **Property 5: Responsive Layout**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

  - [ ] 21.3 Write unit tests for responsive behavior
    - Test mobile layout rendering
    - Test tablet layout rendering
    - Test desktop layout rendering
    - Test sidebar collapse on mobile
    - _Requirements: 9.6_

- [ ] 22. Implement accessibility features
  - [ ] 22.1 Add keyboard navigation support
    - Ensure all interactive elements are keyboard accessible
    - Add focus indicators
    - Implement logical tab order
    - Support arrow key navigation in sub-navigation
    - _Requirements: 13.1, 13.5_

  - [ ] 22.2 Add ARIA labels and screen reader support
    - Add ARIA labels to icons and buttons
    - Add live regions for dynamic content
    - Ensure descriptive alt text for images
    - _Requirements: 13.2, 13.4, 13.6_

  - [ ] 22.3 Ensure color contrast and zoom support
    - Verify WCAG AA contrast ratios
    - Test zoom up to 200%
    - _Requirements: 13.3, 13.7_

  - [ ] 22.4 Write property test for keyboard navigation
    - **Property 6: Keyboard Navigation**
    - **Validates: Requirements 13.1, 13.5**

  - [ ] 22.5 Write unit tests for accessibility
    - Test keyboard navigation
    - Test ARIA labels presence
    - Test focus indicators
    - _Requirements: 13.1, 13.2, 13.5_

- [ ] 23. Implement performance optimizations
  - [ ] 23.1 Add code splitting and lazy loading
    - Implement dynamic imports for heavy components
    - Add lazy loading for charts
    - Add lazy loading for images
    - _Requirements: 12.2, 12.3_

  - [ ] 23.2 Implement data caching and prefetching
    - Add SWR or React Query for API caching
    - Implement prefetching for likely next pages
    - Add pagination for large datasets
    - _Requirements: 12.4, 12.5_

  - [ ] 23.3 Optimize bundle size
    - Analyze bundle with webpack-bundle-analyzer
    - Tree-shake unused dependencies
    - Minimize bundle size
    - _Requirements: 12.7_

  - [ ] 23.4 Write unit tests for performance features
    - Test lazy loading behavior
    - Test caching behavior
    - Test pagination
    - _Requirements: 12.1, 12.6_

- [ ] 24. Final integration and testing
  - [ ] 24.1 Test complete user journeys
    - Test navigation flow through all pages
    - Test data loading across pages
    - Test error handling across pages
    - Test responsive behavior across pages
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 24.2 Write property test for loading states
    - **Property 2: Loading State Display**
    - **Validates: Requirements 10.1**

  - [ ] 24.3 Write property test for error recovery
    - **Property 3: Error Recovery**
    - **Validates: Requirements 10.2, 10.3**

  - [ ] 24.4 Write property test for empty states
    - **Property 10: Empty State Display**
    - **Validates: Requirements 10.4**

- [ ] 25. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All API integration should use the extended API client from lib/api.ts
- All components should follow the existing design system (Radix UI + Tailwind CSS)
- All pages should use consistent layout patterns (sidebar + content area)
