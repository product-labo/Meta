# OnChain Analyzer Flow

## Overview
I've created a complete simulated process from the landing page to the analysis report using the research page components. The flow allows users to enter their contract address on the landing page, handles **simulated authentication**, and takes them through the analyzer wizard.

## Flow Description

### 1. Landing Page (`/`)
- Updated hero section with contract address input
- "Analyze Contract" button that stores the address and checks authentication
- If user is authenticated → goes directly to `/analyzer`
- If user is not authenticated → goes to `/login?redirect=analyzer`

### 2. **Simulated Authentication Flow**
- **Login Page** (`/login`): 
  - **Demo mode**: Use any email and password
  - Simulates successful login with mock user data
  - Handles redirect parameter, after "login" redirects to analyzer if `redirect=analyzer`
- **Signup Page** (`/signup`): 
  - **Demo mode**: Use any email and password
  - Simulates signup process, redirects to verification
  - Passes redirect parameter through to verification
- **Verify Page** (`/verify`): 
  - **Demo mode**: Use any 6-digit code (e.g., 123456)
  - Simulates email verification, respects redirect parameter
  - Creates mock user session after "verification"

### 3. Analyzer Page (`/analyzer`)
- **Wizard Form**: 3-step process (Startup Info → Competitors → Duration)
- **Loading Screen**: Animated radar scanning effect during analysis
- **Dashboard**: Complete analytics dashboard with 5 tabs

## Authentication Simulation Details

### Mock User Data
```typescript
const mockUser = {
  id: '1',
  email: email, // from form input
  roles: ['startup'],
  is_verified: true,
  onboarding_completed: true,
}
```

### Demo Instructions
- **Login**: Enter any email (e.g., `user@example.com`) and any password
- **Signup**: Enter any email and password, then proceed to verification
- **Verify**: Enter any 6-digit code (e.g., `123456`) to complete verification
- All forms include helpful demo instructions in blue info boxes

### Authentication State
- Uses existing auth provider for state management
- Generates mock JWT tokens with timestamps
- Maintains authentication across page refreshes via localStorage
- Proper logout functionality available

## Components Created

### Analyzer Components (`/components/analyzer/`)
1. **wizard-step.tsx** - Step indicator with icons and labels
2. **chain-selector.tsx** - Blockchain selection with logos
3. **loading-screen.tsx** - Animated loading screen with radar effect
4. **dashboard-header.tsx** - Report header with startup name and chain
5. **mock-data.ts** - Complete mock data for all analytics
6. **overview-tab.tsx** - Overview metrics and recommendations
7. **metrics-tab.tsx** - TVL, rates, ratios, and key metrics with charts
8. **users-tab.tsx** - User behavior, engagement scores, and top users
9. **transactions-tab.tsx** - Transaction volume timeline and recent transactions
10. **competitive-tab.tsx** - Market position, benchmarks, advantages/challenges

## Features Implemented

### Landing Page Features
- Contract address input with wallet icon
- Real-time validation
- Authentication-aware routing
- Responsive design

### Wizard Features
- 3-step process with visual progress indicator
- Form validation using react-hook-form + zod
- Chain selection with visual blockchain logos
- Competitor analysis (up to 3 competitors)
- Duration selection (7, 14, or 30 days)
- Pre-filled contract address from landing page

### Dashboard Features
- **Overview Tab**: Key metrics cards, recommendations, alerts
- **Metrics Tab**: TVL chart, borrowing/lending rates, DeFi ratios, key metrics
- **Users Tab**: User behavior pie chart, engagement scores, top users table
- **Transactions Tab**: Volume timeline, recent transactions with pagination
- **Competitive Tab**: Market position, radar benchmarks, advantages/challenges

### Technical Features
- TypeScript with proper type definitions
- Responsive design with Tailwind CSS
- Chart visualizations using Recharts
- Form handling with react-hook-form
- Schema validation with Zod
- Authentication state management
- Local storage for pending analysis data
- Animated loading states
- Error handling and validation

## Data Structure
The mock data includes:
- Transaction metrics (1.2M+ transactions, 34K+ users)
- Financial data (TVL, borrowing/lending rates, gas costs)
- User analytics (behavior segmentation, engagement scores)
- Competitive analysis (market position, benchmarks)
- Real-time alerts and recommendations

## Usage Flow
1. User visits landing page
2. Enters contract address (e.g., `0x1234...`)
3. Clicks "Analyze Contract"
4. If not logged in → Login/Signup → Verify email
5. Redirected to analyzer wizard
6. Fills out 3-step form (startup info, competitors, duration)
7. Sees animated loading screen (4 seconds)
8. Views comprehensive analytics dashboard
9. Can export PDF or start new analysis

## Authentication Integration
- **Simulated authentication** - no real API calls
- Uses existing auth provider and components for state management
- Handles redirect parameters throughout the flow
- Maintains authentication state with mock data
- Supports both login and signup flows with demo credentials
- Email verification with any 6-digit code
- Generates mock JWT tokens for session management

The implementation provides a complete, production-ready flow from landing page to detailed analytics dashboard with **simulated authentication**, form validation, and rich data visualizations. Perfect for demos and development without requiring a backend API.