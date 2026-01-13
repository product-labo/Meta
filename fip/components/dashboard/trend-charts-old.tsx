"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity } from "lucide-react"
import { api } from "@/lib/api"

interface TrendChartsProps {
  filters?: {
    chains: string[];
    categories: string[];
  };
}

interface TrendData {
  date: string;
  projects: number;
  customers: number;
  revenue: number;
  avgGrowthScore: number;
  avgHealthScore: number;
}

interface CategoryData {
  category: string;
  projects: number;
  customers: number;
  revenue: number;
  avgScore: number;
  color: string;
}

interface ChainData {
  chain: string;
  projects: number;
  customers: number;
  revenue: number;
  marketShare: number;
  color: string;
}

export function TrendCharts({ filters }: TrendChartsProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [chainData, setChainData] = useState<ChainData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'customers' | 'revenue' | 'projects'>('customers')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchTrendData()
    fetchCategoryBreakdown()
    fetchChainBreakdown()
  }, [filters, timeRange])

  const fetchTrendData = async () => {
    try {
      // Generate mock trend data (in real implementation, this would come from historical API)
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const mockTrendData: TrendData[] = []
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        // Generate realistic trend data with some randomness
        const baseProjects = 150 + Math.sin(i / 10) * 20
        const baseCustomers = 50000 + Math.sin(i / 8) * 10000 + Math.random() * 5000
        const baseRevenue = 1000 + Math.sin(i / 12) * 200 + Math.random() * 100
        
        mockTrendData.push({
          date: date.toISOString().split('T')[0],
          projects: Math.round(baseProjects + Math.random() * 10),
          customers: Math.round(baseCustomers),
          revenue: Math.round(baseRevenue * 100) / 100,
          avgGrowthScore: 50 + Math.sin(i / 15) * 15 + Math.random() * 10,
          avgHealthScore: 60 + Math.sin(i / 20) * 10 + Math.random() * 8,
        })
      }
      
      setTrendData(mockTrendData)
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
    }
  }

  const fetchCategoryBreakdown = async () => {
    try {
      const params: any = { limit: 1000 }
      if (filters?.chains.length) params.chainId = filters.chains[0]
      
      const res = await api.projects.list(params)
      
      if (res.success && res.data && res.data.businesses) {
        const projects = res.data.businesses
        
        // Group by category
        const categoryMap = new Map<string, any>()
        
        projects.forEach(project => {
          const category = project.category || 'Unknown'
          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              category,
              projects: 0,
              customers: 0,
              revenue: 0,
              totalScore: 0,
              count: 0
            })
          }
          
          const data = categoryMap.get(category)!
          data.projects += 1
          data.customers += project.total_customers || 0
          data.revenue += project.total_revenue_eth || 0
          data.totalScore += project.growth_score || 50
          data.count += 1
        })
        
        const categoryColors = [
          '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
          '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ]
        
        const categoryBreakdown: CategoryData[] = Array.from(categoryMap.values())
          .map((data, index) => ({
            category: data.category,
            projects: data.projects,
            customers: data.customers,
            revenue: data.revenue,
            avgScore: data.count > 0 ? data.totalScore / data.count : 50,
            color: categoryColors[index % categoryColors.length]
          }))
          .sort((a, b) => b.projects - a.projects)
        
        setCategoryData(categoryBreakdown)
      }
    } catch (error) {
      console.error('Failed to fetch category data:', error)
    }
  }

  const fetchChainBreakdown = async () => {
    try {
      const res = await api.projects.list({ limit: 1000 })
      
      if (res.success && res.data && res.data.businesses) {
        const projects = res.data.businesses
        
        // Group by chain
        const chainMap = new Map<string, any>()
        const totalRevenue = projects.reduce((sum, p) => sum + (p.total_revenue_eth || 0), 0)
        
        projects.forEach(project => {
          const chain = project.chain_name || 'Unknown'
          if (!chainMap.has(chain)) {
            chainMap.set(chain, {
              chain,
              projects: 0,
              customers: 0,
              revenue: 0
            })
          }
          
          const data = chainMap.get(chain)!
          data.projects += 1
          data.customers += project.total_customers || 0
          data.revenue += project.total_revenue_eth || 0
        })
        
        const chainColors = {
          'Ethereum': '#627eea',
          'Polygon': '#8247e5',
          'Starknet': '#0c0c4f',
          'Unknown': '#6b7280'
        }
        
        const chainBreakdown: ChainData[] = Array.from(chainMap.values())
          .map(data => ({
            chain: data.chain,
            projects: data.projects,
            customers: data.customers,
            revenue: data.revenue,
            marketShare: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
            color: chainColors[data.chain as keyof typeof chainColors] || chainColors.Unknown
          }))
          .sort((a, b) => b.revenue - a.revenue)
        
        setChainData(chainBreakdown)
      }
    } catch (error) {
      console.error('Failed to fetch chain data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatETH = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K ETH`
    if (value >= 1) return `${value.toFixed(2)} ETH`
    return `${value.toFixed(4)} ETH`
  }

  const getMetricValue = (item: TrendData) => {
    switch (selectedMetric) {
      case 'customers': return item.customers
      case 'revenue': return item.revenue
      case 'projects': return item.projects
      default: return item.customers
    }
  }

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'customers': return 'Customers'
      case 'revenue': return 'Revenue (ETH)'
      case 'projects': return 'Projects'
      default: return 'Customers'
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Market Trends
            </CardTitle>
            <div className="flex gap-2">
              <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                  <SelectItem value="90d">90d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-1 px-4">
            {trendData.map((item, index) => {
              const value = getMetricValue(item)
              const maxValue = Math.max(...trendData.map(getMetricValue))
              const height = (value / maxValue) * 100
              
              return (
                <div key={index} className="flex flex-col items-center flex-1 max-w-8">
                  <div 
                    className="w-full bg-primary/80 hover:bg-primary transition-colors rounded-t cursor-pointer"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                    title={`${item.date}: ${selectedMetric === 'revenue' ? formatETH(value) : formatNumber(value)}`}
                  />
                  <div className="text-xs text-muted-foreground mt-1 transform -rotate-45 origin-left">
                    {new Date(item.date).getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {getMetricLabel()} over {timeRange}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.slice(0, 6).map((category, index) => {
                const totalProjects = categoryData.reduce((sum, c) => sum + c.projects, 0)
                const percentage = totalProjects > 0 ? (category.projects / totalProjects) * 100 : 0
                
                return (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{category.category}</span>
                          <span className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{category.projects} projects</span>
                          <span>{formatNumber(category.customers)} customers</span>
                          <span>{formatETH(category.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chain Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Chain Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chainData.map((chain, index) => (
                <div key={chain.chain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chain.color }}
                      />
                      <span className="text-sm font-medium">{chain.chain}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {chain.marketShare.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${chain.marketShare}%`,
                        backgroundColor: chain.color 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{chain.projects} projects</span>
                    <span>{formatNumber(chain.customers)} customers</span>
                    <span>{formatETH(chain.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}