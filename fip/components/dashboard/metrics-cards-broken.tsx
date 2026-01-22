"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Shield, Zap, AlertTriangle } from "lucide-react"
import { api } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"

interface MetricsCardsProps {
  filters?: {
    chains: string[];
    categories: string[];
    verifiedOnly: boolean;
  };
}

interface MetricsSummary {
  totalProjects: number;
  totalCustomers: number;
  totalRevenue: number;
  avgGrowthScore: number;
  avgHealthScore: number;
  avgRiskScore: number;
  topPerformers: number;
  riskProjects: number;
  trends: {
    projectsChange: number;
    customersChange: number;
    revenueChange: number;
  };
}

export function MetricsCards({ filters }: MetricsCardsProps) {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetricsSummary()
  }, [filters])

  const fetchMetricsSummary = async () => {
    setLoading(true)
    try {
      // Fetch projects data to calculate summary metrics
      const params: any = { limit: 1000 } // Get more data for accurate calculations
      
      if (filters) {
        if (filters.chains.length > 0) params.chainId = filters.chains[0]
        if (filters.categories.length > 0) params.category = filters.categories[0]
        if (filters.verifiedOnly) params.verified = 'true'
      }

      const res = await api.projects.list(params)
      
      if (res.success && res.data && res.data.businesses) {
        const projects = res.data.businesses
        
        // Calculate summary metrics
        const totalProjects = projects.length
        const totalCustomers = projects.reduce((sum, p) => sum + (p.total_customers || 0), 0)
        const totalRevenue = projects.reduce((sum, p) => sum + (p.total_revenue_eth || 0), 0)
        
        const avgGrowthScore = projects.length > 0 ? 
          projects.reduce((sum, p) => sum + (p.growth_score || 50), 0) / projects.length : 50
        const avgHealthScore = projects.length > 0 ? 
          projects.reduce((sum, p) => sum + (p.health_score || 50), 0) / projects.length : 50
        const avgRiskScore = projects.length > 0 ? 
          projects.reduce((sum, p) => sum + (p.risk_score || 50), 0) / projects.length : 50
        
        const topPerformers = projects.filter(p => (p.growth_score || 50) >= 70).length
        const riskProjects = projects.filter(p => (p.risk_score || 50) >= 70).length
        
        // Mock trend data (in real implementation, this would come from historical data)
        const trends = {
          projectsChange: Math.random() * 20 - 10, // -10% to +10%
          customersChange: Math.random() * 30 - 5, // -5% to +25%
          revenueChange: Math.random() * 40 - 10, // -10% to +30%
        }

        setMetrics({
          totalProjects,
          totalCustomers,
          totalRevenue,
          avgGrowthScore,
          avgHealthScore,
          avgRiskScore,
          topPerformers,
          riskProjects,
          trends
        })
      }
    } catch (error) {
      console.error('Failed to fetch metrics summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

    const numValue = Number(value) || 0
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K ETH`
    if (numValue >= 1) return `${numValue.toFixed(2)} ETH`
    return `${numValue.toFixed(4)} ETH`
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return null
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-green-600"
    if (change < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getScoreColor = (score: number, type: 'growth' | 'health' | 'risk') => {
    if (type === 'risk') {
      if (score <= 30) return 'text-green-600'
      if (score <= 60) return 'text-yellow-600'
      return 'text-red-600'
    } else {
      if (score >= 70) return 'text-green-600'
      if (score >= 40) return 'text-yellow-600'
      return 'text-red-600'
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Failed to load metrics data
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalProjects)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon(metrics.trends.projectsChange)}
            <span className={getTrendColor(metrics.trends.projectsChange)}>
              {metrics.trends.projectsChange > 0 ? '+' : ''}{metrics.trends.projectsChange.toFixed(1)}%
            </span>
            <span className="ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalCustomers)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon(metrics.trends.customersChange)}
            <span className={getTrendColor(metrics.trends.customersChange)}>
              {metrics.trends.customersChange > 0 ? '+' : ''}{metrics.trends.customersChange.toFixed(1)}%
            </span>
            <span className="ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatETH(metrics.totalRevenue)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon(metrics.trends.revenueChange)}
            <span className={getTrendColor(metrics.trends.revenueChange)}>
              {metrics.trends.revenueChange > 0 ? '+' : ''}{metrics.trends.revenueChange.toFixed(1)}%
            </span>
            <span className="ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.topPerformers}</div>
          <div className="text-xs text-muted-foreground">
            Projects with growth score ≥ 70
          </div>
        </CardContent>
      </Card>

      {/* Average Growth Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Growth Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getScoreColor(metrics.avgGrowthScore, 'growth')}`}>
            {metrics.avgGrowthScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            Market average performance
          </div>
        </CardContent>
      </Card>

      {/* Average Health Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getScoreColor(metrics.avgHealthScore, 'health')}`}>
            {metrics.avgHealthScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            System reliability average
          </div>
        </CardContent>
      </Card>

      {/* Average Risk Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getScoreColor(metrics.avgRiskScore, 'risk')}`}>
            {metrics.avgRiskScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            Market risk assessment
          </div>
        </CardContent>
      </Card>

      {/* High Risk Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Risk Projects</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metrics.riskProjects}</div>
          <div className="text-xs text-muted-foreground">
            Projects with risk score ≥ 70
          </div>
        </CardContent>
      </Card>
    </div>
  )
}