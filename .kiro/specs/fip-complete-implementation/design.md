# Design Document

## Overview

This design document outlines the architecture and implementation approach for completing the MetaGauge FIP (Frontend Interface Project) based on the paga folder design mockups. The system will provide a comprehensive Web3 analytics platform with multi-page sections, real-time data integration, and responsive design.

The implementation follows Next.js 16 App Router patterns with TypeScript, Radix UI components, and Tailwind CSS styling. The design emphasizes component reusability, performance optimization, and accessibility compliance.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Landing    │  │     Auth     │  │  Onboarding  │      │
│  │    Pages     │  │    Pages     │  │     Flow     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Dashboard Views                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │ Researcher │  │  Startup   │  │  Investor  │    │   │
│  │  │    View    │  │    View    │  │    View    │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Component Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   UI     │  │  Charts  │  │  Tables  │  │  Cards   │   │
│  │Components│  │Components│  │Components│  │Components│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Client (lib/api.ts)                             │   │
│  │  - Authentication                                     │   │
│  │  - Projects                                           │   │
│  │  - Analytics                                          │   │
│  │  - Insights                                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API                                │
│  (http://localhost:3003)                                     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
fip/
├── app/                          # Next.js App Router
│   ├── (landing)/               # Landing pages group
│   │   └── page.tsx             # Home page
│   ├── (auth)/                  # Auth pages group
│   │   ├── login/
│   │   ├── signup/
│   │   └── verify/
│   ├── onboarding/              # Onboarding flow
│   │   ├── role/
│   │   ├── startup/
│   │   └── wallet/
│   ├── dashboard/               # Researcher/Analyst view
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── watchlist/
│   │   ├── compare/
│   │   └── ...
│   └── startup/                 # Startup/Builder view
│       ├── layout.tsx
│       ├── page.tsx             # Main dashboard
│       ├── insights/            # Insight Centre (6 pages)
│       │   ├── page.tsx         # Main insights page with tabs
│       │   ├── cohorts/         # Page 1: Behavioral Cohorts
│       │   ├── funnel/          # Page 2: Growth & Conversion
│       │   ├── features/        # Page 3: Feature Adoption
│       │   ├── competitive/     # Page 4: Competitive Analysis
│       │   ├── predictions/     # Page 5: Predictive Analytics
│       │   └── recommendations/ # Page 6: AI Recommendations
│       ├── users/               # User & Wallet (5 pages)
│       │   ├── page.tsx         # Main users page
│       │   ├── retention/       # Page 1: Retention & Churn
│       │   ├── behavior/        # Page 2: Behavior Analysis
│       │   ├── segments/        # Page 3: User Segments
│       │   ├── wallet/          # Page 4: Wallet Analytics
│       │   └── lifetime/        # Page 5: Lifetime Value
│       ├── benchmark/           # Competitive Benchmark
│       ├── productivity/        # Productivity Score
│       ├── transactions/        # Transactional Insight
│       ├── notifications/       # Notification Center
│       └── settings/            # Settings
├── components/
│   ├── ui/                      # Base UI components (Radix)
│   ├── dashboard/               # Dashboard-specific components
│   ├── startup/                 # Startup-specific components
│   │   ├── cards/              # Metric cards, insight cards
│   │   ├── charts/             # Chart components
│   │   ├── tables/             # Table components
│   │   └── navigation/         # Sub-navigation components
│   ├── landing/                 # Landing page components
│   └── shared/                  # Shared components
│       ├── loading-states/     # Loading skeletons
│       ├── error-states/       # Error boundaries
│       └── empty-states/       # Empty state components
├── lib/
│   ├── api.ts                   # API client
│   ├── utils.ts                 # Utility functions
│   ├── validation.ts            # Form validation
│   └── hooks/                   # Custom React hooks
│       ├── use-api.ts          # API data fetching hook
│       ├── use-pagination.ts   # Pagination hook
│       └── use-filters.ts      # Filter management hook
└── paga/                        # Design reference mockups
```

---

## Components and Interfaces

### Core Component Types

#### 1. Page Components
```typescript
// app/startup/insights/page.tsx
export default function InsightsPage() {
  return (
    <div className="p-8 space-y-8">
      <PageHeader />
      <SubNavigation pages={insightPages} />
      <PageContent />
    </div>
  )
}
```

#### 2. Sub-Navigation Component
```typescript
// components/startup/navigation/sub-navigation.tsx
interface SubNavigationProps {
  pages: {
    id: string
    label: string
    href: string
    icon?: React.ComponentType
  }[]
  currentPage: string
}

export function SubNavigation({ pages, currentPage }: SubNavigationProps) {
  return (
    <nav className="flex gap-4 border-b">
      {pages.map((page) => (
        <Link
          key={page.id}
          href={page.href}
          className={cn(
            "pb-2 border-b-2 transition-colors",
            currentPage === page.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  )
}
```

#### 3. Metric Card Component
```typescript
// components/startup/cards/metric-card.tsx
interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  subtext?: string
  icon?: React.ComponentType
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  subtext,
  icon: Icon
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change && (
              <p className={cn(
                "text-sm",
                trend === 'up' && "text-green-500",
                trend === 'down' && "text-red-500"
              )}>
                {trend === 'up' ? '↑' : '↓'} {change}
              </p>
            )}
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 4. Insight Card Component
```typescript
// components/startup/cards/insight-card.tsx
interface InsightCardProps {
  type: 'high' | 'medium' | 'low'
  icon: React.ComponentType
  title: string
  description: string
  actionLabel?: string
  tag?: string
  onAction?: () => void
}

export function InsightCard({
  type,
  icon: Icon,
  title,
  description,
  actionLabel,
  tag,
  onAction
}: InsightCardProps) {
  const colorMap = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-green-200 bg-green-50'
  }

  return (
    <div className={cn("p-4 rounded-lg border", colorMap[type])}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-1" />
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          {tag && (
            <span className="inline-block text-xs px-2 py-1 bg-white rounded">
              {tag}
            </span>
          )}
          {actionLabel && (
            <Button variant="link" onClick={onAction} className="p-0 h-auto">
              {actionLabel} →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

#### 5. Loading State Component
```typescript
// components/shared/loading-states/page-skeleton.tsx
export function PageSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded" />
    </div>
  )
}
```

#### 6. Error Boundary Component
```typescript
// components/shared/error-states/error-boundary.tsx
'use client'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false)

  if (hasError) {
    return fallback || (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <Button onClick={() => setHasError(false)}>Try again</Button>
      </div>
    )
  }

  return <>{children}</>
}
```

---

## Data Models

### API Response Types

```typescript
// types/api.ts

export interface MetricData {
  value: string | number
  change?: number
  changePercentage?: string
  trend?: 'up' | 'down' | 'neutral'
  timestamp?: string
}

export interface InsightData {
  id: string
  type: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  recommendation?: string
  createdAt: string
}

export interface CohortData {
  id: string
  name: string
  subtitle: string
  users: number
  retention: number
  revenue: number
  platform: string
  riskLevel: 'low' | 'medium' | 'high'
}

export interface FunnelStage {
  stage: number
  name: string
  users: number
  percentage: number
  dropoff?: number
}

export interface RetentionCohort {
  cohortDate: string
  totalUsers: number
  week0: number
  week1: number
  week2: number
  week3: number
}

export interface NotificationData {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
}

export interface UserSegment {
  id: string
  name: string
  userCount: number
  avgLifetime: number
  avgRevenue: number
  churnRate: number
}
```

### API Client Extensions

```typescript
// lib/api.ts (additions)

export const api = {
  // ... existing auth and projects methods ...

  insights: {
    getCohorts: async (token: string): Promise<CohortData[]> => {
      const res = await fetch(`${API_URL}/api/insights/cohorts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch cohorts')
      return res.json()
    },

    getFunnel: async (token: string, filters?: any): Promise<FunnelStage[]> => {
      const params = new URLSearchParams(filters)
      const res = await fetch(`${API_URL}/api/insights/funnel?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch funnel data')
      return res.json()
    },

    getFeatureAdoption: async (token: string): Promise<any> => {
      const res = await fetch(`${API_URL}/api/insights/features`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch feature adoption')
      return res.json()
    }
  },

  users: {
    getRetention: async (token: string): Promise<RetentionCohort[]> => {
      const res = await fetch(`${API_URL}/api/users/retention`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch retention data')
      return res.json()
    },

    getSegments: async (token: string): Promise<UserSegment[]> => {
      const res = await fetch(`${API_URL}/api/users/segments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch user segments')
      return res.json()
    }
  },

  notifications: {
    list: async (token: string, filters?: any): Promise<NotificationData[]> => {
      const params = new URLSearchParams(filters)
      const res = await fetch(`${API_URL}/api/notifications?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },

    markAsRead: async (token: string, id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to mark notification as read')
    }
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Navigation Consistency
*For any* page within a multi-page section, navigating to that page should highlight the correct navigation item and display the corresponding content.

**Validates: Requirements 8.2, 8.3, 11.4**

### Property 2: Loading State Display
*For any* API request that is in progress, the system should display a loading state until the request completes or fails.

**Validates: Requirements 10.1**

### Property 3: Error Recovery
*For any* failed API request, the system should display an error message and provide a retry mechanism that successfully re-attempts the request.

**Validates: Requirements 10.2, 10.3**

### Property 4: Data Freshness
*For any* page that displays real-time metrics, refreshing the page should fetch the latest data from the API.

**Validates: Requirements 1.9, 2.8, 4.2**

### Property 5: Responsive Layout
*For any* screen size between 320px and 2560px width, all content should remain readable and interactive elements should remain accessible.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 6: Keyboard Navigation
*For any* interactive element on a page, pressing Tab should move focus to that element and pressing Enter/Space should activate it.

**Validates: Requirements 13.1, 13.5**

### Property 7: Sub-Navigation State
*For any* multi-page section with sub-navigation, the current page indicator should match the displayed content.

**Validates: Requirements 11.1, 11.3**

### Property 8: Notification Updates
*For any* new notification received, the notification count should increment and the notification should appear in the list.

**Validates: Requirements 6.6**

### Property 9: Settings Persistence
*For any* setting that is successfully saved, reloading the page should display the saved value.

**Validates: Requirements 7.3, 7.4**

### Property 10: Empty State Display
*For any* data list that returns zero items, the system should display an appropriate empty state message.

**Validates: Requirements 10.4**

---

## Error Handling

### Error Categories

1. **Network Errors**
   - Connection timeout
   - Server unreachable
   - DNS resolution failure

2. **API Errors**
   - 400: Bad Request (validation errors)
   - 401: Unauthorized (token expired)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 500: Internal Server Error

3. **Client Errors**
   - Invalid form input
   - Missing required data
   - Browser compatibility issues

### Error Handling Strategy

```typescript
// lib/hooks/use-api.ts
export function useApi<T>(
  fetcher: () => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    retry?: number
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  const execute = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetcher()
      setData(result)
      options?.onSuccess?.(result)
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
      
      // Auto-retry for network errors
      if (retryCount < (options?.retry || 0)) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          execute()
        }, 1000 * (retryCount + 1))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    execute()
  }, [])

  return { data, error, loading, retry: execute }
}
```

### Error Display Components

```typescript
// components/shared/error-states/api-error.tsx
interface ApiErrorProps {
  error: Error
  onRetry: () => void
}

export function ApiError({ error, onRetry }: ApiErrorProps) {
  const isNetworkError = error.message.includes('network')
  const isAuthError = error.message.includes('401')

  return (
    <div className="p-8 text-center space-y-4">
      <div className="text-red-500 text-4xl">⚠️</div>
      <h3 className="text-lg font-semibold">
        {isNetworkError && "Network Error"}
        {isAuthError && "Authentication Required"}
        {!isNetworkError && !isAuthError && "Something went wrong"}
      </h3>
      <p className="text-muted-foreground">{error.message}</p>
      <div className="flex gap-2 justify-center">
        <Button onClick={onRetry}>Try Again</Button>
        {isAuthError && (
          <Button variant="outline" onClick={() => router.push('/login')}>
            Log In
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios and property-based tests for universal behaviors:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties across all inputs
- Both are complementary and necessary for comprehensive coverage

### Unit Testing

**Focus Areas**:
- Component rendering with specific props
- User interaction handlers (clicks, form submissions)
- Edge cases (empty data, maximum values)
- Error conditions (network failures, validation errors)

**Example Unit Tests**:
```typescript
// components/startup/cards/metric-card.test.tsx
describe('MetricCard', () => {
  it('displays metric value correctly', () => {
    render(<MetricCard title="Users" value="1,234" />)
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('shows trend indicator for positive change', () => {
    render(<MetricCard title="Users" value="1,234" change="12%" trend="up" />)
    expect(screen.getByText('↑ 12%')).toHaveClass('text-green-500')
  })

  it('handles missing optional props', () => {
    render(<MetricCard title="Users" value="1,234" />)
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
  })
})
```

### Property-Based Testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: `Feature: fip-complete-implementation, Property {number}: {property_text}`

**Example Property Tests**:
```typescript
// components/startup/navigation/sub-navigation.test.tsx
import fc from 'fast-check'

describe('SubNavigation Properties', () => {
  it('Property 1: Navigation Consistency - highlights correct item for any page', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string(),
          label: fc.string(),
          href: fc.string()
        }), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (pages, currentIndex) => {
          if (currentIndex >= pages.length) return true
          
          const currentPage = pages[currentIndex].id
          const { container } = render(
            <SubNavigation pages={pages} currentPage={currentPage} />
          )
          
          const activeLink = container.querySelector('[class*="border-primary"]')
          expect(activeLink).toHaveTextContent(pages[currentIndex].label)
        }
      ),
      { numRuns: 100 }
    )
  })
  // Feature: fip-complete-implementation, Property 1: Navigation Consistency
})
```

### Integration Testing

**Focus Areas**:
- Page-to-page navigation flows
- API integration with mock responses
- Multi-step user journeys
- State persistence across navigation

**Example Integration Test**:
```typescript
// app/startup/insights/insights.integration.test.tsx
describe('Insights Page Integration', () => {
  it('navigates between insight tabs and loads data', async () => {
    const mockData = { cohorts: [...], funnel: [...] }
    mockApiResponse('/api/insights/cohorts', mockData.cohorts)
    
    render(<InsightsPage />)
    
    // Default tab loads
    await waitFor(() => {
      expect(screen.getByText('Behavioral Cohorts')).toBeInTheDocument()
    })
    
    // Navigate to funnel tab
    fireEvent.click(screen.getByText('Growth & Conversion'))
    
    await waitFor(() => {
      expect(screen.getByText('Conversion Funnel')).toBeInTheDocument()
    })
  })
})
```

### Testing Tools

- **Unit Tests**: Jest + React Testing Library
- **Property Tests**: fast-check
- **E2E Tests**: Playwright (optional, for critical flows)
- **Visual Regression**: Chromatic (optional)

---

## Implementation Notes

### Performance Optimization

1. **Code Splitting**
   - Use dynamic imports for heavy components
   - Split routes at the page level
   - Lazy load charts and visualizations

2. **Data Fetching**
   - Implement SWR or React Query for caching
   - Prefetch data for likely next pages
   - Use pagination for large datasets

3. **Image Optimization**
   - Use Next.js Image component
   - Implement lazy loading
   - Serve WebP format with fallbacks

4. **Bundle Size**
   - Tree-shake unused dependencies
   - Use barrel exports carefully
   - Analyze bundle with webpack-bundle-analyzer

### Accessibility

1. **Keyboard Navigation**
   - All interactive elements focusable
   - Logical tab order
   - Skip links for main content

2. **Screen Readers**
   - ARIA labels for icons
   - Live regions for dynamic content
   - Descriptive link text

3. **Visual**
   - WCAG AA contrast ratios
   - Focus indicators
   - Scalable text (rem units)

### Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android 90+

---

## Deployment Considerations

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3003
NEXT_PUBLIC_WS_URL=ws://localhost:3003
NEXT_PUBLIC_ENV=development
```

### Build Configuration

```javascript
// next.config.mjs
export default {
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  },
  experimental: {
    optimizeCss: true
  }
}
```

### Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Score: > 90
- Bundle Size: < 500KB (initial)
